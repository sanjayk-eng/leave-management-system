package service

import (
	"context"
	"database/sql"
	"math"
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

	AllocateForNewLeaveType(tx *sqlx.Tx, leaveTypeID int, defaultEntitlement int, internEntitlement *int, asOf time.Time) error

	// SyncLeaveBalances recalculates balances when a policy is updated.
	// policyAsOf is the stored associate_month date — nil falls back to time.Now().
	SyncLeaveBalances(tx *sqlx.Tx, leaveTypeID int, defaultEntitlement int, internEntitlement *int, policyAsOf *time.Time) error

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
func (s *leaveBalance) AllocateForNewLeaveType(tx *sqlx.Tx, leaveTypeID int, defaultEntitlement int, internEntitlement *int, asOf time.Time) error {
	// For a brand-new policy created mid-year, existing employees are prorated
	// based on the given asOf date (typically the policy associate month selected
	// by the admin in the preview, or time.Now() if not specified).
	// e.g. asOf = August → remaining months = 13-8 = 5 → 5/12 of annual entitlement.
	return s.processLeaveBalances(tx, defaultEntitlement, internEntitlement, asOf,
		func(emp models.ActiveEmployeeRole, entitlement float64) error {
			return s.Repo.Create(tx, emp.ID, leaveTypeID, entitlement)
		},
	)
}

func (s *leaveBalance) SyncLeaveBalances(tx *sqlx.Tx, leaveTypeID int, defaultEntitlement int, internEntitlement *int, policyAsOf *time.Time) error {
	// On policy UPDATE the entitlement or associate_month may have changed.
	//
	// Field update rules:
	//   opening  = recalculated from new entitlement × remaining months (asOf anchor)
	//   used     = PRESERVED — approved leaves are never reversed
	//   adjusted = PRESERVED — manual adjustments are never reversed
	//   closing  = opening - used + adjusted
	//
	// Deficit handling:
	//   If used > new_opening + adjusted, closing goes negative.
	//   This is allowed and intentional — it correctly represents that the employee
	//   has consumed more leave than the recalculated entitlement permits.
	//   The negative closing is visible in the balance view as a deficit.
	//   The admin is responsible for either adjusting balances manually or accepting
	//   the deficit.
	//
	// Example:
	//   Policy changes associate_month Jan→Jul. Annual=18.
	//   new_opening = 18 × 6/12 = 9 days (Jul–Dec only).
	//   Employee already used 12 days (Jan–Jun, all approved).
	//   closing = 9 - 12 + 0 = -3  → deficit of 3 days shown to admin.

	employees, err := s.CommRepo.GetAllActiveEmployeesWithRoles(tx)
	if err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to fetch employees")
	}

	now := time.Now()
	currentYear := now.Year()

	baseAsOf := now
	if policyAsOf != nil {
		baseAsOf = *policyAsOf
	}

	for _, emp := range employees {
		// Per-employee anchor — current-year joiners only.
		// Prior-year employees always get full entitlement (handled in calculateEntitlementAsOf).
		asOf := baseAsOf
		if emp.JoiningDate != nil && emp.JoiningDate.Year() == currentYear &&
			emp.JoiningDate.After(baseAsOf) {
			asOf = *emp.JoiningDate
		}

		balance, err := s.Repo.GetLeaveBalance(tx, emp.ID, leaveTypeID)

		switch {
		case err == sql.ErrNoRows:
			// No existing row — create fresh with new entitlement.
			entitlement := s.calculateEntitlementAsOf(emp.Role, emp.JoiningDate, defaultEntitlement, internEntitlement, asOf)
			if err := s.Repo.Create(tx, emp.ID, leaveTypeID, entitlement); err != nil {
				return err
			}

		case err != nil:
			return err

		default:
			// Row exists — only recalculate opening and closing.
			// used and adjusted are intentionally preserved.
			newOpening := s.calculateEntitlementAsOf(emp.Role, emp.JoiningDate, defaultEntitlement, internEntitlement, asOf)

			// closing = newOpening - used + adjusted
			// Negative closing = deficit (employee used more than new entitlement).
			// This is stored as-is so the admin can see and act on it.
			newClosing := s.calculateClosingBalance(newOpening, balance.Used, balance.Adjusted)

			balance.Opening     = newOpening
			balance.Closing     = newClosing
			balance.EmployeeID  = emp.ID
			balance.LeaveTypeID = leaveTypeID
			balance.Year        = currentYear

			if err := s.Repo.UpdateLeaveBalance(tx, balance); err != nil {
				return err
			}
		}
	}

	return nil
}

func (s *leaveBalance) AllocateForEmployee(tx *sqlx.Tx, employeeID uuid.UUID, role string, joiningDate *time.Time) error {
	// For a new employee, proration is based on the later of:
	//   - their joining date, and
	//   - the policy's associate_month (the month the admin chose as the allocation anchor).
	// This prevents a new employee joining in e.g. March from receiving days intended
	// only from August (the policy's associate month).
	// If joining date is nil or in a prior year → ProratedLeave returns full entitlement.
	empAsOf := time.Now()
	if joiningDate != nil {
		empAsOf = *joiningDate
	}

	leaveTypes, err := s.CommRepo.GetAllLeaveType()
	if err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to get leave types")
	}

	for _, leaveType := range leaveTypes {
		if leaveType.IsEarly != nil && *leaveType.IsEarly {
			continue
		}

		// Determine per-policy asOf: use the later of the employee's joining date
		// and the policy's associate_month — but only when both are in the current year.
		// Prior-year employees receive full entitlement (calculateEntitlementAsOf handles this).
		asOf := empAsOf
		if leaveType.AssociateMonth != nil {
			now := time.Now()
			// Only apply the policy anchor if the employee joined in the current year.
			// If they joined in a prior year, empAsOf is prior-year and
			// calculateEntitlementAsOf will return full entitlement regardless.
			if empAsOf.Year() == now.Year() {
				policyAsOf := time.Date(now.Year(), time.Month(*leaveType.AssociateMonth), 1, 0, 0, 0, 0, now.Location())
				if policyAsOf.After(empAsOf) {
					asOf = policyAsOf
				}
			}
		}

		entitlement := s.calculateEntitlementAsOf(role, joiningDate, leaveType.DefaultEntitlement, leaveType.InternEntitlement, asOf)

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

		// Per-policy anchor: use the later of joiningDate and policy's associate_month,
		// but only when the employee joined in the current year.
		asOf := *joiningDate
		if leaveType.AssociateMonth != nil {
			now := time.Now()
			if joiningDate.Year() == now.Year() {
				policyAsOf := time.Date(now.Year(), time.Month(*leaveType.AssociateMonth), 1, 0, 0, 0, 0, now.Location())
				if policyAsOf.After(asOf) {
					asOf = policyAsOf
				}
			}
		}

		entitlement := s.calculateEntitlementAsOf(roleType, joiningDate, leaveType.DefaultEntitlement, leaveType.InternEntitlement, asOf)

		balance, err := s.Repo.GetLeaveBalance(tx, employeeID, leaveType.ID)
		if err != nil {
			return err
		}

		balance.Opening = entitlement
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

	// Base anchor: employee's joining date or today.
	empAsOf := time.Now()
	if employee.JoiningDate != nil {
		empAsOf = *employee.JoiningDate
	}

	for _, leaveType := range leaveTypes {

		if leaveType.IsEarly != nil && *leaveType.IsEarly {
			continue
		}

		// Per-policy anchor: use the later of employee's joining date and policy's
		// associate_month — only for current-year joiners.
		asOf := empAsOf
		if leaveType.AssociateMonth != nil {
			now := time.Now()
			if empAsOf.Year() == now.Year() {
				policyAsOf := time.Date(now.Year(), time.Month(*leaveType.AssociateMonth), 1, 0, 0, 0, 0, now.Location())
				if policyAsOf.After(empAsOf) {
					asOf = policyAsOf
				}
			}
		}

		entitlement := s.calculateEntitlementAsOf(newRole, employee.JoiningDate, leaveType.DefaultEntitlement, leaveType.InternEntitlement, asOf)

		balance, err := s.Repo.GetLeaveBalance(tx, employeeID, leaveType.ID)
		if err != nil {
			return err
		}

		balance.Opening = entitlement
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
func (s *leaveBalance) processLeaveBalances(tx *sqlx.Tx, defaultEntitlement int, internEntitlement *int, policyAsOf time.Time, handler func(emp models.ActiveEmployeeRole, entitlement float64) error) error {

	employees, err := s.CommRepo.GetAllActiveEmployeesWithRoles(tx)
	if err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to fetch active employees")
	}

	now := time.Now()

	for _, emp := range employees {
		// Per-employee asOf — only applies to current-year joiners.
		//
		// Prior-year employees: calculateEntitlementAsOf returns full entitlement
		// regardless of asOf, so the value of asOf doesn't matter — use policyAsOf.
		//
		// Current-year employees: use the later of the policy's associate month and
		// their joining date (they shouldn't receive days for months before they joined).
		asOf := policyAsOf
		if emp.JoiningDate != nil && emp.JoiningDate.Year() == now.Year() &&
			emp.JoiningDate.After(policyAsOf) {
			asOf = *emp.JoiningDate
		}

		entitlement := s.calculateEntitlementAsOf(emp.Role, emp.JoiningDate, defaultEntitlement, internEntitlement, asOf)
		if err := handler(emp, entitlement); err != nil {
			return err
		}
	}

	return nil
}

// calculateEntitlementAsOf picks the correct annual entitlement for the employee's
// role and then prorates it relative to asOf.
//
// Key rule: if the employee joined in a prior year they always receive the full
// annual entitlement — the policy's associate_month anchor is only relevant for
// employees who joined (or whose policy was created) in the current year.
func (s *leaveBalance) calculateEntitlementAsOf(role string, joiningDate *time.Time, defaultEntitlement int, internEntitlement *int, asOf time.Time) float64 {
	entitlement := defaultEntitlement
	if role == accessrole.ROLE_INTERN && internEntitlement != nil {
		entitlement = *internEntitlement
	}

	// If the employee joined in a prior year, skip proration entirely —
	// they are entitled to the full annual amount regardless of asOf.
	now := time.Now()
	if joiningDate != nil && joiningDate.Year() < now.Year() {
		return float64(entitlement)
	}

	return ProratedLeave(entitlement, asOf)
}

// calculateEntitlement is kept for backward compatibility with RecalculateForJoiningDate.
// It prorates based on the employee's joining date (old behaviour).
func (s *leaveBalance) calculateEntitlement(role string, joiningDate *time.Time, defaultEntitlement int, internEntitlement *int) float64 {
	asOf := time.Now()
	if joiningDate != nil {
		asOf = *joiningDate
	}
	return s.calculateEntitlementAsOf(role, joiningDate, defaultEntitlement, internEntitlement, asOf)
}

// ProratedLeave calculates the prorated leave entitlement based on the reference
// date (asOf) within the current calendar year.
//
// Returns a float64 rounded to the nearest 0.5:
//   - fraction < 0.25  → round down  (e.g. 7.12 → 7.0)
//   - fraction 0.25–0.74 → round to .5 (e.g. 7.44 → 7.5, 7.67 → 7.5)
//   - fraction ≥ 0.75  → round up   (e.g. 7.88 → 8.0)
//
// Formula: math.Round(raw * 2) / 2
//
// Rules:
//   - asOf is always expected to be in the current year when this is called
//     (prior-year check is done in calculateEntitlementAsOf before reaching here).
//   - If asOf is NOT in the current year for any reason → full entitlement (safe fallback).
//   - remainingMonths = 13 - asOf.Month()
func ProratedLeave(yearlyLeave int, asOf time.Time) float64 {
	now := time.Now()
	// Safety: only prorate within the current calendar year.
	// Prior-year employees are handled upstream in calculateEntitlementAsOf.
	// Future-year dates should never occur but are treated as full entitlement.
	if asOf.Year() != now.Year() {
		return float64(yearlyLeave)
	}
	remainingMonths := 13 - int(asOf.Month())
	raw := float64(yearlyLeave) * float64(remainingMonths) / 12.0
	// Round to nearest 0.5
	return math.Round(raw*2) / 2
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
			LeaveTypeID:    lt.LeaveTypeID,
			LeaveType:      lt.LeaveTypeName,
			Opening:        rec.Opening,
			Accrued:        rec.Accrued,
			Used:           rec.Used,
			Adjusted:       rec.Adjusted,
			Total:          total,
			Available:      s.calculateClosingBalance(rec.Opening, rec.Used, rec.Adjusted),
			AssociateMonth: lt.AssociateMonth,
		})
	}
	return balances
}

func (s *leaveBalance) calculateClosingBalance(opening, used, adjusted float64) float64 {
	return opening - used + adjusted
}
