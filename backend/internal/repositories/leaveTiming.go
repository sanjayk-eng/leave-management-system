package repositories

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/jmoiron/sqlx"
)

type LeaveTimingRepository interface {
	GetAll(ctx context.Context) ([]models.LeaveTimingResponse, error)
	GetByID(ctx context.Context, id int) (*models.LeaveTimingResponse, error)
	Update(ctx context.Context, id int, timing string) error
}

type leaveTimingRepo struct {
	db *sqlx.DB
}

func NewLeaveTimingRepository(db *sqlx.DB) LeaveTimingRepository {
	return &leaveTimingRepo{db: db}
}

func (r *leaveTimingRepo) GetAll(ctx context.Context) ([]models.LeaveTimingResponse, error) {
	var data []models.LeaveTimingResponse
	query := `
		SELECT id, type, timing, created_at, updated_at
		FROM Tbl_Half
		ORDER BY id
	`
	if err := r.db.SelectContext(ctx, &data, query); err != nil {
		return nil, fmt.Errorf("GetAll leave timing: %w", err)
	}
	return data, nil
}

func (r *leaveTimingRepo) GetByID(ctx context.Context, id int) (*models.LeaveTimingResponse, error) {
	var data models.LeaveTimingResponse
	query := `
		SELECT id, type, timing, created_at, updated_at
		FROM Tbl_Half
		WHERE id = $1
	`
	if err := r.db.GetContext(ctx, &data, query, id); err != nil {
		// sql.ErrNoRows propagates as-is — the service decides what that means.
		return nil, err
	}
	return &data, nil
}

func (r *leaveTimingRepo) Update(ctx context.Context, id int, timing string) error {
	query := `
		UPDATE Tbl_Half
		SET timing = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`
	res, err := r.db.ExecContext(ctx, query, timing, id)
	if err != nil {
		return fmt.Errorf("Update leave timing id=%d: %w", id, err)
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("Update leave timing id=%d: %w", id, err)
	}
	if rows == 0 {
		return sql.ErrNoRows
	}
	return nil
}
