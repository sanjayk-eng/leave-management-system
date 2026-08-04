package repositories

import (
	"context"
	"database/sql"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/jmoiron/sqlx"
)

// PolicyStatusFilter controls which policies are returned by Get.
// "active"   → only is_active = TRUE
// "inactive" → only is_active = FALSE
// anything else (e.g. "all") → no filter
type PolicyStatusFilter string

const (
	PolicyStatusActive   PolicyStatusFilter = "active"
	PolicyStatusInactive PolicyStatusFilter = "inactive"
	PolicyStatusAll      PolicyStatusFilter = "all"
)

type LeavePolicyRepository interface {
	Create(ctx context.Context, tx *sqlx.Tx, input *models.LeaveTypeInput) (*models.LeaveType, error)
	GetById(ctx context.Context, id string) (*models.LeaveType, error)
	Get(ctx context.Context, status PolicyStatusFilter) (*[]models.LeaveType, error)
	Update(ctx context.Context, tx *sqlx.Tx, id string, input *models.LeaveTypeInput) (*models.LeaveType, error)
	Delete(tx *sqlx.Tx, leaveTypeID int) error
	Toggle(ctx context.Context, tx *sqlx.Tx, leaveTypeID int) (bool, error)
}

type leavePolicy struct {
	DB *sqlx.DB
}

func NewLeavePolicy(db *sqlx.DB) LeavePolicyRepository {
	return &leavePolicy{
		DB: db,
	}
}

func (r *leavePolicy) GetById(ctx context.Context, id string) (*models.LeaveType, error) {

	var leave models.LeaveType

	query := `
		SELECT 
			id,
			name,
			is_paid,
			default_entitlement,
			intern_entitlement,
			is_early,
			is_work_from_home,
			is_active,
			approval_flow_id,
			associate_month,
			created_at,
			updated_at
		FROM Tbl_Leave_type
		WHERE id = $1
	`

	err := r.DB.QueryRowxContext(ctx, query, id).StructScan(&leave)
	if err != nil {
		return nil, err
	}

	return &leave, nil
}
func (r *leavePolicy) Get(ctx context.Context, status PolicyStatusFilter) (*[]models.LeaveType, error) {

	var leave []models.LeaveType

	query := `
		SELECT 
			id,
			name,
			is_paid,
			default_entitlement,
			intern_entitlement,
			is_early,
			is_work_from_home,
			is_active,
			approval_flow_id,
			associate_month,
			created_at,
			updated_at
		FROM Tbl_Leave_type
	`
	switch status {
	case PolicyStatusActive:
		query += ` WHERE is_active = TRUE`
	case PolicyStatusInactive:
		query += ` WHERE is_active = FALSE`
	// "all" or any other value → no WHERE clause
	}
	query += ` ORDER BY id`

	rows, err := r.DB.QueryxContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var lt models.LeaveType
		if err := rows.StructScan(&lt); err != nil {
			return nil, err
		}
		leave = append(leave, lt)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return &leave, nil
}
func (r *leavePolicy) Create(ctx context.Context, tx *sqlx.Tx, input *models.LeaveTypeInput) (*models.LeaveType, error) {

	var leave models.LeaveType

	query := `
		INSERT INTO Tbl_Leave_type 
			(name, is_paid, default_entitlement, intern_entitlement, is_early, is_work_from_home, approval_flow_id, associate_month)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, is_work_from_home, created_at, updated_at, is_early, approval_flow_id, associate_month
	`

	err := tx.QueryRowxContext(
		ctx,
		query,
		input.Name,
		*input.IsPaid,
		*input.DefaultEntitlement,
		input.InternEntitlement,
		*input.IsEarly,
		*input.IsWorkFromHome,
		input.ApprovalFlowID,
		input.AssociateMonth,
	).Scan(
		&leave.ID,
		&leave.IsWorkFromHome,
		&leave.CreatedAt,
		&leave.UpdatedAt,
		&leave.IsEarly,
		&leave.ApprovalFlowID,
		&leave.AssociateMonth,
	)

	return &leave, err
}
func (r *leavePolicy) Update(ctx context.Context, tx *sqlx.Tx, id string, input *models.LeaveTypeInput) (*models.LeaveType, error) {

	var leave models.LeaveType

	query := `
		UPDATE Tbl_Leave_type
		SET 
			name = $1,
			is_paid = $2,
			default_entitlement = $3,
			intern_entitlement = $4,
			is_early = $5,
			is_work_from_home = $6,
			approval_flow_id = $7,
			updated_at = NOW()
		WHERE id = $8
		RETURNING 
			id,
			name,
			is_paid,
			default_entitlement,
			intern_entitlement,
			is_early,
			is_work_from_home,
			approval_flow_id,
			associate_month,
			created_at,
			updated_at
	`

	err := tx.QueryRowxContext(
		ctx,
		query,
		input.Name,
		*input.IsPaid,
		*input.DefaultEntitlement,
		input.InternEntitlement,
		*input.IsEarly,
		*input.IsWorkFromHome,
		input.ApprovalFlowID,
		id,
	).Scan(
		&leave.ID,
		&leave.Name,
		&leave.IsPaid,
		&leave.DefaultEntitlement,
		&leave.InternEntitlement,
		&leave.IsEarly,
		&leave.IsWorkFromHome,
		&leave.ApprovalFlowID,
		&leave.AssociateMonth,
		&leave.CreatedAt,
		&leave.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &leave, nil
}

// DeleteLeaveType - Delete leave policy
func (r *leavePolicy) Delete(tx *sqlx.Tx, leaveTypeID int) error {
	// Check if leave type is being used in any leave applications
	var count int
	err := tx.Get(&count, "SELECT COUNT(*) FROM Tbl_Leave WHERE leave_type_id = $1", leaveTypeID)
	if err != nil {
		return err
	}

	if count > 0 {
		return sql.ErrNoRows // Using this to indicate constraint violation
	}

	query := `DELETE FROM Tbl_Leave_type WHERE id = $1`
	result, err := tx.Exec(query, leaveTypeID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return sql.ErrNoRows
	}

	return nil
}

// Toggle flips is_active for the given leave type and returns the new state.
func (r *leavePolicy) Toggle(ctx context.Context, tx *sqlx.Tx, leaveTypeID int) (bool, error) {
	var newState bool
	err := tx.QueryRowxContext(ctx, `
		UPDATE Tbl_Leave_type
		SET is_active = NOT is_active, updated_at = NOW()
		WHERE id = $1
		RETURNING is_active
	`, leaveTypeID).Scan(&newState)
	return newState, err
}

func (r *Repository) GetAllLeaveType() ([]models.LeaveType, error) {
	var leaveType []models.LeaveType
	query := `SELECT id, name, is_paid, default_entitlement, intern_entitlement, is_early, is_work_from_home, is_active, associate_month, created_at, updated_at FROM Tbl_Leave_type WHERE is_active = TRUE ORDER BY id`
	err := r.DB.Select(&leaveType, query)
	return leaveType, err
}

func (r *Repository) GetLeaveTypeNameByID(id int) (string, error) {
	var name string
	query := `SELECT name FROM Tbl_Leave_type WHERE id = $1`
	err := r.DB.Get(&name, query, id)
	return name, err
}

func (r *Repository) GetAllLeaveTypes(tx *sqlx.Tx) ([]models.LeaveTypeRow, error) {

	var leaveTypes []models.LeaveTypeRow

	err := tx.Select(&leaveTypes, `
		SELECT id, default_entitlement, intern_entitlement
		FROM Tbl_Leave_type
		WHERE (is_early IS NULL OR is_early = FALSE)
		  AND is_active = TRUE
	`)
	return leaveTypes, err
}
