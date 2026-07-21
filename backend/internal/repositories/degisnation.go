package repositories

import (
	"context"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// ------------------ DESIGNATION OPERATIONS ------------------

type designationRepository struct {
	DB *sqlx.DB
}

type DesignationRepository interface {
	CreateDesignation(ctx context.Context, input *models.DesignationInput) (string, error)
	Get(ctx context.Context) ([]models.Designation, error)
	GetDesignationByID(ctx context.Context, id uuid.UUID) (*models.Designation, error)
	UpdateDesignation(ctx context.Context, id uuid.UUID, input *models.DesignationInput) error
	DeleteDesignation(ctx context.Context, id uuid.UUID) error
}


func NewDesignationRepository(db *sqlx.DB) DesignationRepository {
	return &designationRepository{
		DB: db,
	}
}

// CreateDesignation inserts a new designation
func (r *designationRepository) CreateDesignation(ctx context.Context, input *models.DesignationInput) (string, error) {
	var id string
	query := `
		INSERT INTO Tbl_Designation (designation_name, description)
		VALUES ($1, $2)
		RETURNING id
	`
	err := r.DB.QueryRowContext(ctx, query, input.DesignationName, input.Description).Scan(&id)
	return id, err
}

// Get fetches all designations (satisfies DesignationRepository interface).
func (r *designationRepository) Get(ctx context.Context) ([]models.Designation, error) {
	var designations []models.Designation
	query := `
		SELECT id, designation_name, description
		FROM Tbl_Designation
		ORDER BY designation_name
	`
	err := r.DB.SelectContext(ctx, &designations, query)
	return designations, err
}

// GetDesignationByID fetches a single designation by ID
func (r *designationRepository) GetDesignationByID(ctx context.Context, id uuid.UUID) (*models.Designation, error) {
	var designation models.Designation
	query := `
		SELECT id, designation_name, description
		FROM Tbl_Designation
		WHERE id = $1
	`
	err := r.DB.GetContext(ctx, &designation, query, id)
	if err != nil {
		return nil, err
	}
	return &designation, nil
}

// UpdateDesignation updates an existing designation
func (r *designationRepository) UpdateDesignation(ctx context.Context, id uuid.UUID, input *models.DesignationInput) error {
	query := `
		UPDATE Tbl_Designation
		SET designation_name = $1, description = $2
		WHERE id = $3
	`
	_, err := r.DB.ExecContext(ctx, query, input.DesignationName, input.Description, id)
	return err
}

// DeleteDesignation deletes a designation by ID
// Due to ON DELETE SET NULL constraint, employee designation_id will be set to NULL automatically
func (r *designationRepository) DeleteDesignation(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM Tbl_Designation WHERE id = $1`
	_, err := r.DB.ExecContext(ctx, query, id)
	return err
}
