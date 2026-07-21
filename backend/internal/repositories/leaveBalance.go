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
	UpdateAdjertment(tx *sqlx.Tx, balanceID uuid.UUID, newAdjusted, newClosing float64) error
	CreateLeaveAdjustment(tx *sqlx.Tx, employeeID uuid.UUID, leaveTypeID int, quantity float64, reason string, createdBy string, year int) error
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

func (r *leaveBalanceRepository) UpdateAdjertment(tx *sqlx.Tx, balanceID uuid.UUID, newAdjusted, newClosing float64) error {
	query := `
		UPDATE Tbl_Leave_balance
		SET adjusted=$1, closing=$2, updated_at=NOW()
		WHERE id=$3
	`
	_, err := tx.Exec(query, newAdjusted, newClosing, balanceID)
	return err
}

func (r *leaveBalanceRepository) CreateLeaveAdjustment(tx *sqlx.Tx, employeeID uuid.UUID, leaveTypeID int, quantity float64, reason string, createdBy string, year int) error {
	query := `
		INSERT INTO Tbl_Leave_adjustment
		(employee_id, leave_type_id, quantity, reason, created_by, created_at, year)
		VALUES ($1,$2,$3,$4,$5,NOW(),$6)
	`
	_, err := tx.Exec(query, employeeID, leaveTypeID, quantity, reason, createdBy, year)
	return err
}
