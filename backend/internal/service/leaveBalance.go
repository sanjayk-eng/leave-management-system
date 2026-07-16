package service

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/internal/repositories"
	accessrole "github.com/Zenithive/LeaveManagementSystem/pkg/accessrole"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type leaveBalance struct {
	DB               *sqlx.DB
	CommRepo         repositories.Repository
	LeaveBalanceRepo repositories.LeaveBalanceRepository
	RoleRepo         repositories.RoleRepository
}

type LeaveBalance interface {
	AllocateForNewLeaveType(tx *sqlx.Tx, leaveTypeID int, defaultEntitlement int, internEntitlement *int) error

	SyncLeaveBalances(tx *sqlx.Tx, leaveTypeID int, defaultEntitlement int, internEntitlement *int) error

	AllocateForEmployee(tx *sqlx.Tx, employeeID uuid.UUID, role string, joiningDate *time.Time) error

	RecalculateForJoiningDate(tx *sqlx.Tx, employeeID uuid.UUID, roleID int, joiningDate *time.Time) error

	RecalculateForRoleChange(tx *sqlx.Tx, employeeID uuid.UUID, oldRole string, newRole string) error
}

func NewLeaveBalance(db *sqlx.DB, commonRepo repositories.Repository, roleRepo repositories.RoleRepository, leaveBalanceRepo repositories.LeaveBalanceRepository) LeaveBalance {
	return &leaveBalance{
		DB:               db,
		CommRepo:         commonRepo,
		RoleRepo:         roleRepo,
		LeaveBalanceRepo: leaveBalanceRepo,
	}
}

func (s *leaveBalance) AllocateForNewLeaveType(tx *sqlx.Tx, leaveTypeID int, defaultEntitlement int, internEntitlement *int) error {

	return s.processLeaveBalances(tx, defaultEntitlement, internEntitlement,
		func(emp models.ActiveEmployeeRole, entitlement int) error {
			return s.LeaveBalanceRepo.Create(tx, emp.ID, leaveTypeID, entitlement)
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
		balance, err := s.LeaveBalanceRepo.GetLeaveBalance(tx, emp.ID, leaveTypeID)

		switch {
		case err == sql.ErrNoRows:
			if err := s.LeaveBalanceRepo.Create(tx, emp.ID, leaveTypeID, entitlement); err != nil {
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

			if err := s.LeaveBalanceRepo.UpdateLeaveBalance(tx, balance); err != nil {
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

		if err := s.LeaveBalanceRepo.Create(tx, employeeID, leaveType.ID, entitlement); err != nil {
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

		balance, err := s.LeaveBalanceRepo.GetLeaveBalance(tx, employeeID, leaveType.ID)
		if err != nil {
			return err
		}

		balance.Opening = float64(entitlement)
		balance.Closing = s.calculateClosingBalance(balance.Opening, balance.Used, balance.Adjusted)

		if err := s.LeaveBalanceRepo.UpdateLeaveBalance(tx, balance); err != nil {
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

		balance, err := s.LeaveBalanceRepo.GetLeaveBalance(tx, employeeID, leaveType.ID)
		if err != nil {
			return err
		}

		balance.Opening = float64(entitlement)
		balance.Closing = s.calculateClosingBalance(
			balance.Opening,
			balance.Used,
			balance.Adjusted,
		)

		if err := s.LeaveBalanceRepo.UpdateLeaveBalance(tx, balance); err != nil {
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

func (s *leaveBalance) calculateClosingBalance(opening, used, adjusted float64) float64 {
	return opening - used + adjusted
}
