package service

import (
	"context"
	"database/sql"
	"net/http"
	"time"

	"github.com/Zenithive/LeaveManagementSystem/internal/config/database"
	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/internal/repositories"
	accessrole "github.com/Zenithive/LeaveManagementSystem/pkg/accessrole"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type leaveBalance struct {
	DB           *sqlx.DB
	CommRepo     repositories.Repository
	Repo         repositories.LeaveBalanceRepository
	RoleRepo     repositories.RoleRepository
	EmployeeRepo repositories.EmployeeRepository
	HrbcService  Hrbc
}

type LeaveBalance interface {
	GetBalances(ctx context.Context, actorID uuid.UUID, actorRoleID int, employeeID uuid.UUID) (*models.EmployeeBalancesResult, error)

	Adjust(ctx context.Context, actorID uuid.UUID, employeeID uuid.UUID, input models.LeaveBalanceAdjustInput) (*models.LeaveBalanceAdjustResult, error)

	AllocateForNewLeaveType(tx *sqlx.Tx, leaveTypeID int, defaultEntitlement int, internEntitlement *int) error

	SyncLeaveBalances(tx *sqlx.Tx, leaveTypeID int, defaultEntitlement int, internEntitlement *int) error

	AllocateForEmployee(tx *sqlx.Tx, employeeID uuid.UUID, role string, joiningDate *time.Time) error

	RecalculateForJoiningDate(tx *sqlx.Tx, employeeID uuid.UUID, roleID int, joiningDate *time.Time) error

	RecalculateForRoleChange(tx *sqlx.Tx, employeeID uuid.UUID, oldRole string, newRole string) error
}

func NewLeaveBalance(db *sqlx.DB, hrbcService Hrbc, commonRepo repositories.Repository, roleRepo repositories.RoleRepository, leaveBalanceRepo repositories.LeaveBalanceRepository, employeeRepo repositories.EmployeeRepository) LeaveBalance {
	return &leaveBalance{
		DB:           db,
		CommRepo:     commonRepo,
		RoleRepo:     roleRepo,
		Repo:         leaveBalanceRepo,
		EmployeeRepo: employeeRepo,
		HrbcService:  hrbcService,
	}
}

func (s *leaveBalance) GetBalances(ctx context.Context, actorID uuid.UUID, actorRoleID int, employeeID uuid.UUID) (*models.EmployeeBalancesResult, error) {
	target, err := s.EmployeeRepo.GetByID(employeeID)
	if err != nil {
		return nil, errors.CustomErr(http.StatusNotFound, "employee not found")
	}

	if actorID != employeeID {
		if err := s.HrbcService.HasPriorityAllow(actorRoleID, target.RoleID); err != nil {
			return nil, errors.CustomErr(http.StatusForbidden, "you are only allowed to view leave balances of users with lower roles")
		}
	}
	currentYear := time.Now().Year()
	leaveTypes, err := s.CommRepo.GetAllLeaveTypesWithEntitlements()
	if err != nil {
		return nil, errors.CustomErr(http.StatusInternalServerError, "failed to fetch leave types: "+err.Error())
	}

	balanceRecords, err := s.CommRepo.GetLeaveBalancesByEmployeeAndYear(employeeID, currentYear)
	if err != nil {
		return nil, errors.CustomErr(http.StatusInternalServerError, "failed to fetch leave balances: "+err.Error())
	}

	return &models.EmployeeBalancesResult{
		EmployeeID: employeeID,
		Year:       currentYear,
		Balances:   s.calculateLeaveBalances(leaveTypes, balanceRecords),
	}, nil
}

func (s *leaveBalance) Adjust(ctx context.Context, actorID uuid.UUID, employeeID uuid.UUID, input models.LeaveBalanceAdjustInput) (*models.LeaveBalanceAdjustResult, error) {
	currentYear := time.Now().Year()
	var result models.LeaveBalanceAdjustResult

	err := database.ExecuteTransaction(ctx, s.DB, func(tx *sqlx.Tx) error {
		balance, err := s.Repo.GetLeaveBalance(tx, employeeID, input.LeaveTypeID)
		if err == sql.ErrNoRows {
			return errors.CustomErr(http.StatusNotFound, "leave balance not found for this employee and leave type")
		}
		if err != nil {
			return errors.CustomErr(http.StatusInternalServerError, "failed to fetch leave balance: "+err.Error())
		}

		newAdjusted := balance.Adjusted + input.Quantity
		newClosing := s.calculateClosingBalance(balance.Opening, balance.Used, newAdjusted)

		if err := s.Repo.UpdateAdjertment(tx, balance.ID, newAdjusted, newClosing); err != nil {
			return errors.CustomErr(http.StatusInternalServerError, "failed to update leave balance: "+err.Error())
		}
		if err := s.Repo.CreateLeaveAdjustment(tx, employeeID, input.LeaveTypeID, input.Quantity, input.Reason, actorID.String(), currentYear); err != nil {
			return errors.CustomErr(http.StatusInternalServerError, "failed to record leave adjustment: "+err.Error())
		}

		result = models.LeaveBalanceAdjustResult{
			EmployeeID: employeeID, LeaveTypeID: input.LeaveTypeID, Year: currentYear,
			OldAdjusted: balance.Adjusted, OldClosing: balance.Closing,
			NewAdjusted: newAdjusted, NewClosing: newClosing,
			QuantityDiff: input.Quantity, Reason: input.Reason,
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &result, nil
}
func (s *leaveBalance) AllocateForNewLeaveType(tx *sqlx.Tx, leaveTypeID int, defaultEntitlement int, internEntitlement *int) error {

	return s.processLeaveBalances(tx, defaultEntitlement, internEntitlement,
		func(emp models.ActiveEmployeeRole, entitlement int) error {
			return s.Repo.Create(tx, emp.ID, leaveTypeID, entitlement)
		},
	)
}
func (s *leaveBalance) SyncLeaveBalances(tx *sqlx.Tx, leaveTypeID int, defaultEntitlement int, internEntitlement *int) error {

	employees, err := s.CommRepo.GetAllActiveEmployeesWithRoles(tx)
	if err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to fetch employees")
	}

	currentYear := time.Now().Year()

	for _, emp := range employees {

		entitlement := s.calculateEntitlement(emp.Role, emp.JoiningDate, defaultEntitlement, internEntitlement)
		balance, err := s.Repo.GetLeaveBalance(tx, emp.ID, leaveTypeID)

		switch {
		case err == sql.ErrNoRows:
			if err := s.Repo.Create(tx, emp.ID, leaveTypeID, entitlement); err != nil {
				return err
			}

		case err != nil:
			return err

		default:
			balance.Opening = float64(entitlement)
			balance.Closing = s.calculateClosingBalance(balance.Opening, balance.Used, balance.Adjusted)
			balance.EmployeeID = emp.ID
			balance.LeaveTypeID = leaveTypeID
			balance.Year = currentYear

			if err := s.Repo.UpdateLeaveBalance(tx, balance); err != nil {
				return err
			}
		}
	}

	return nil
}

func (s *leaveBalance) AllocateForEmployee(tx *sqlx.Tx, employeeID uuid.UUID, role string, joiningDate *time.Time) error {

	leaveTypes, err := s.CommRepo.GetAllLeaveType()
	if err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to get leave types")
	}
	for _, leaveType := range leaveTypes {

		if leaveType.IsEarly != nil && *leaveType.IsEarly {
			continue
		}

		entitlement := s.calculateEntitlement(role, joiningDate, leaveType.DefaultEntitlement, leaveType.InternEntitlement)

		if err := s.Repo.Create(tx, employeeID, leaveType.ID, entitlement); err != nil {
			return err
		}
	}

	return nil
}

func (s *leaveBalance) RecalculateForJoiningDate(tx *sqlx.Tx, employeeID uuid.UUID, roleID int, joiningDate *time.Time) error {

	if joiningDate == nil {
		return nil
	}

	roleType, err := s.RoleRepo.GetRoleType(roleID)
	if err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to fetch role")
	}

	leaveTypes, err := s.CommRepo.GetAllLeaveType()
	if err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to fetch leave types")
	}

	for _, leaveType := range leaveTypes {

		if leaveType.IsEarly != nil && *leaveType.IsEarly {
			continue
		}

		entitlement := s.calculateEntitlement(roleType, joiningDate, leaveType.DefaultEntitlement, leaveType.InternEntitlement)

		balance, err := s.Repo.GetLeaveBalance(tx, employeeID, leaveType.ID)
		if err != nil {
			return err
		}

		balance.Opening = float64(entitlement)
		balance.Closing = s.calculateClosingBalance(balance.Opening, balance.Used, balance.Adjusted)

		if err := s.Repo.UpdateLeaveBalance(tx, balance); err != nil {
			return err
		}
	}

	return nil
}

func (s *leaveBalance) RecalculateForRoleChange(tx *sqlx.Tx, employeeID uuid.UUID, oldRole string, newRole string) error {

	// Nothing changes if role is not changing to/from INTERN.
	if oldRole != accessrole.ROLE_INTERN &&
		newRole != accessrole.ROLE_INTERN {
		return nil
	}

	employee, err := s.CommRepo.GetEmployeeByID(employeeID)
	if err != nil {
		return err
	}

	leaveTypes, err := s.CommRepo.GetAllLeaveType()
	if err != nil {
		return err
	}

	for _, leaveType := range leaveTypes {

		if leaveType.IsEarly != nil && *leaveType.IsEarly {
			continue
		}

		entitlement := s.calculateEntitlement(newRole, employee.JoiningDate, leaveType.DefaultEntitlement, leaveType.InternEntitlement)

		balance, err := s.Repo.GetLeaveBalance(tx, employeeID, leaveType.ID)
		if err != nil {
			return err
		}

		balance.Opening = float64(entitlement)
		balance.Closing = s.calculateClosingBalance(
			balance.Opening,
			balance.Used,
			balance.Adjusted,
		)

		if err := s.Repo.UpdateLeaveBalance(tx, balance); err != nil {
			return err
		}
	}

	return nil
}
func (s *leaveBalance) processLeaveBalances(tx *sqlx.Tx, defaultEntitlement int, internEntitlement *int, handler func(emp models.ActiveEmployeeRole, entitlement int) error) error {

	employees, err := s.CommRepo.GetAllActiveEmployeesWithRoles(tx)
	if err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to fetch active employees")
	}

	for _, emp := range employees {
		entitlement := s.calculateEntitlement(emp.Role, emp.JoiningDate, defaultEntitlement, internEntitlement)
		if err := handler(emp, entitlement); err != nil {
			return err
		}
	}

	return nil
}

func (s *leaveBalance) calculateEntitlement(role string, joiningDate *time.Time, defaultEntitlement int, internEntitlement *int) int {

	entitlement := defaultEntitlement

	if role == accessrole.ROLE_INTERN && internEntitlement != nil {
		entitlement = *internEntitlement
	}
	return ProratedLeave(entitlement, joiningDate, time.Now())
}

func ProratedLeave(yearlyLeave int, joiningDate *time.Time, asOf time.Time) int {
	if joiningDate == nil {
		return yearlyLeave
	}
	if joiningDate.Year() != asOf.Year() {
		return yearlyLeave
	}
	remainingMonths := 13 - int(joiningDate.Month())
	return yearlyLeave * remainingMonths / 12
}

func (s *leaveBalance) calculateLeaveBalances(leaveTypes []models.LeaveTypeData, records []models.BalanceData) []models.Balance {
	recordsByType := make(map[int]models.BalanceData, len(records))
	for _, r := range records {
		recordsByType[r.LeaveTypeID] = r
	}

	balances := make([]models.Balance, 0, len(leaveTypes))
	for _, lt := range leaveTypes {
		rec := recordsByType[lt.LeaveTypeID]

		total := rec.Opening + rec.Adjusted
		balances = append(balances, models.Balance{
			LeaveTypeID: lt.LeaveTypeID,
			LeaveType:   lt.LeaveTypeName,
			Opening:     rec.Opening,
			Accrued:     rec.Accrued,
			Used:        rec.Used,
			Adjusted:    rec.Adjusted,
			Total:       total,
			Available:   s.calculateClosingBalance(rec.Opening, rec.Used, rec.Adjusted),
		})
	}
	return balances
}

func (s *leaveBalance) calculateClosingBalance(opening, used, adjusted float64) float64 {
	return opening - used + adjusted
}
