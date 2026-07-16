package repositories

import (
	"database/sql"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type leaveBalanceRepository struct {
	DB *sqlx.DB
}

type LeaveBalanceRepository interface {
	Create(tx *sqlx.Tx, employeeID uuid.UUID, leaveTypeID int, entitlement int) error
	GetLeaveBalance(tx *sqlx.Tx, employeeID uuid.UUID, leaveTypeID int) (*models.LeaveBalanceForAdjustment, error)
	UpdateLeaveBalance(tx *sqlx.Tx, balance *models.LeaveBalanceForAdjustment) error
}

func NewLeaveBalanceRepository(db *sqlx.DB) LeaveBalanceRepository {
	return &leaveBalanceRepository{
		DB: db,
	}
}
func (r *leaveBalanceRepository) Create(tx *sqlx.Tx, employeeID uuid.UUID, leaveTypeID int, entitlement int) error {
	_, err := tx.Exec(`
		INSERT INTO Tbl_Leave_balance 
			(employee_id, leave_type_id, year, opening, accrued, used, adjusted, closing)
		VALUES ($1, $2, EXTRACT(YEAR FROM CURRENT_DATE), $3, 0, 0, 0, $3)
	`, employeeID, leaveTypeID, entitlement)
	return err
}

func (r *leaveBalanceRepository) GetLeaveBalance(tx *sqlx.Tx, employeeID uuid.UUID, leaveTypeID int) (*models.LeaveBalanceForAdjustment, error) {

	var balance models.LeaveBalanceForAdjustment

	err := tx.Get(&balance, `
		SELECT
			id,
			opening,
			accrued,
			used,
			adjusted,
			closing,
			employee_id,
			leave_type_id,
			year
		FROM Tbl_Leave_Balance
		WHERE employee_id = $1
		  AND leave_type_id = $2
		  AND year = EXTRACT(YEAR FROM CURRENT_DATE)
	`, employeeID, leaveTypeID)

	if err == sql.ErrNoRows {
		return nil, sql.ErrNoRows
	}

	if err != nil {
		return nil, err
	}

	return &balance, nil
}
func (r *leaveBalanceRepository) UpdateLeaveBalance(tx *sqlx.Tx, balance *models.LeaveBalanceForAdjustment) error {

	_, err := tx.Exec(`
		UPDATE Tbl_Leave_Balance
		SET
			opening = $1,
			closing = $2,
			updated_at = NOW()
		WHERE employee_id = $3
		  AND leave_type_id = $4
		  AND year = $5
	`,
		balance.Opening,
		balance.Closing,
		balance.EmployeeID,
		balance.LeaveTypeID,
		balance.Year,
	)

	return err
}

// GetAllLeaveTypesWithEntitlements fetches all non-early leave types with their default entitlements.
// Early leave types (is_early = true) are excluded because they don't have a balance bucket.
func (r *Repository) GetAllLeaveTypesWithEntitlements() ([]models.LeaveTypeData, error) {
	var leaveTypes []models.LeaveTypeData
	query := `
		SELECT 
			lt.id AS leave_type_id,
			lt.name AS leave_type_name,
			COALESCE(lt.default_entitlement, 0) AS default_entitlement,
			lt.intern_entitlement
		FROM Tbl_Leave_Type lt
		WHERE lt.is_early IS NULL OR lt.is_early = FALSE
		ORDER BY lt.id
	`
	err := r.DB.Select(&leaveTypes, query)
	return leaveTypes, err
}

// GetLeaveBalancesByEmployeeAndYear fetches leave balances for a specific employee and year
func (r *Repository) GetLeaveBalancesByEmployeeAndYear(employeeID uuid.UUID, year int) ([]models.BalanceData, error) {
	var balanceRecords []models.BalanceData
	query := `
		SELECT 
			leave_type_id,
			COALESCE(opening, 0) AS opening,
			COALESCE(accrued, 0) AS accrued,
			COALESCE(used, 0) AS used,
			COALESCE(adjusted, 0) AS adjusted,
			COALESCE(closing, 0) AS closing
		FROM Tbl_Leave_balance
		WHERE employee_id = $1 AND year = $2
	`
	err := r.DB.Select(&balanceRecords, query, employeeID, year)

	return balanceRecords, err
}

// GetLeaveBalanceForAdjustment fetches leave balance for adjustment with FOR UPDATE lock
func (r *Repository) GetLeaveBalanceForAdjustment(tx *sqlx.Tx, employeeID uuid.UUID, leaveTypeID int, year int) (models.LeaveBalanceForAdjustment, error) {
	var balance models.LeaveBalanceForAdjustment
	query := `
		SELECT 
			id,
			opening,
			accrued,
			used,
			adjusted,
			closing,
			employee_id,
			leave_type_id,
			year
		FROM Tbl_Leave_balance
		WHERE employee_id=$1 AND leave_type_id=$2 AND year=$3
		FOR UPDATE
	`
	err := tx.Get(&balance, query, employeeID, leaveTypeID, year)
	return balance, err
}

// GetDefaultEntitlementByLeaveTypeID fetches default entitlement for a leave type.
// If role is INTERN and intern_entitlement is set, it returns that instead.
func (r *Repository) GetDefaultEntitlementByLeaveTypeID(tx *sqlx.Tx, leaveTypeID int, role string) (float64, error) {
	var row struct {
		DefaultEntitlement float64  `db:"default_entitlement"`
		InternEntitlement  *float64 `db:"intern_entitlement"`
	}
	err := tx.Get(&row, `SELECT default_entitlement, intern_entitlement FROM Tbl_Leave_Type WHERE id=$1`, leaveTypeID)
	if err != nil {
		return 0, err
	}
	if role == "INTERN" && row.InternEntitlement != nil {
		return *row.InternEntitlement, nil
	}
	return row.DefaultEntitlement, nil
}

// GetTotalPaidLeaveBalance returns the sum of all closing balances for paid, non-early, non-WFH
// leave types for the given employee in the current year.
// WFH leave is excluded — only pure paid leave blocks an unpaid/WFH application.
func (r *Repository) GetTotalPaidLeaveBalance(tx *sqlx.Tx, employeeID uuid.UUID) (float64, error) {
	var totalBalance float64
	err := tx.Get(&totalBalance, `
		SELECT COALESCE(SUM(lb.closing), 0)
		FROM Tbl_Leave_balance lb
		JOIN Tbl_Leave_Type lt ON lb.leave_type_id = lt.id
		WHERE lb.employee_id = $1
		  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
		  AND lt.is_paid = TRUE
		  AND (lt.is_early IS NULL OR lt.is_early = FALSE)
		  AND lt.is_work_from_home = FALSE
	`, employeeID)
	return totalBalance, err
}

// GetTotalPendingPaidLeaveDays returns the sum of all pending leave days for paid, non-early,
// non-WFH leave types for the given employee in the current year.
// WFH leave is excluded — only pure paid pending leaves block an unpaid/WFH application.
func (r *Repository) GetTotalPendingPaidLeaveDays(tx *sqlx.Tx, employeeID uuid.UUID) (float64, error) {
	var totalPendingDays float64
	err := tx.Get(&totalPendingDays, `
		SELECT COALESCE(SUM(l.days), 0)
		FROM Tbl_Leave l
		JOIN Tbl_Leave_Type lt ON l.leave_type_id = lt.id
		WHERE l.employee_id = $1
		  AND l.status IN ('Pending', 'MANAGER_APPROVED')
		  AND EXTRACT(YEAR FROM l.start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
		  AND lt.is_paid = TRUE
		  AND (lt.is_early IS NULL OR lt.is_early = FALSE)
		  AND lt.is_work_from_home = FALSE
	`, employeeID)
	return totalPendingDays, err
}

// CreateLeaveBalanceForAdjustment creates a new leave balance record
func (r *Repository) CreateLeaveBalanceForAdjustment(tx *sqlx.Tx, employeeID uuid.UUID, leaveTypeID int, year int, defaultEntitlement float64) (models.LeaveBalanceForAdjustment, error) {
	var balance models.LeaveBalanceForAdjustment
	err := tx.QueryRow(`
		INSERT INTO Tbl_Leave_balance
		(employee_id, leave_type_id, year, opening, accrued, used, adjusted, closing, created_at, updated_at)
		VALUES ($1,$2,$3,$4,0,0,0,$4,NOW(),NOW())
		RETURNING id, opening, accrued, used, adjusted, closing, employee_id, leave_type_id, year
	`, employeeID, leaveTypeID, year, defaultEntitlement).
		Scan(&balance.ID, &balance.Opening, &balance.Accrued, &balance.Used, &balance.Adjusted, &balance.Closing, &balance.EmployeeID, &balance.LeaveTypeID, &balance.Year)
	return balance, err
}

// UpdateLeaveBalanceAdjustment updates adjusted and closing values for leave balance
func (r *Repository) UpdateLeaveBalanceAdjustment(tx *sqlx.Tx, balanceID uuid.UUID, newAdjusted, newClosing float64) error {
	query := `
		UPDATE Tbl_Leave_balance
		SET adjusted=$1, closing=$2, updated_at=NOW()
		WHERE id=$3
	`
	_, err := tx.Exec(query, newAdjusted, newClosing, balanceID)
	return err
}

// InsertLeaveAdjustment inserts a record into leave adjustment log
func (r *Repository) InsertLeaveAdjustment(tx *sqlx.Tx, employeeID uuid.UUID, leaveTypeID int, quantity float64, reason string, createdBy string, year int) error {
	query := `
		INSERT INTO Tbl_Leave_adjustment
		(employee_id, leave_type_id, quantity, reason, created_by, created_at, year)
		VALUES ($1,$2,$3,$4,$5,NOW(),$6)
	`
	_, err := tx.Exec(query, employeeID, leaveTypeID, quantity, reason, createdBy, year)
	return err
}

func (r *Repository) UpdateLeaveBalanceByEmployeeId(tx *sqlx.Tx, employeeID uuid.UUID, leaveTypeId int, Days float64) error {
	query := `UPDATE Tbl_Leave_balance SET used = used + $3, closing = closing - $3, updated_at = NOW() WHERE employee_id=$1 AND leave_type_id=$2 AND year = EXTRACT(YEAR FROM CURRENT_DATE)`
	_, err := tx.Exec(query, employeeID, leaveTypeId, Days)
	return err
}
func (r *Repository) UpdateWidthrowLeaveBalanceByEmployeeId(tx *sqlx.Tx, employeeID uuid.UUID, leaveTypeId int, Days float64) error {
	query := `UPDATE Tbl_Leave_balance SET used = used - $3, closing = closing + $3, updated_at = NOW() WHERE employee_id=$1 AND leave_type_id=$2 AND year = EXTRACT(YEAR FROM CURRENT_DATE)`
	_, err := tx.Exec(query, employeeID, leaveTypeId, Days)
	return err
}
