package repositories

import (
	"context"
	"fmt"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/jmoiron/sqlx"
)

// ─────────────────────────────────────────────────────────────────────────────
// PermissionRepository — interface
// ─────────────────────────────────────────────────────────────────────────────

type PermissionRepository interface {
	GetRolePermissionsGrouped(ctx context.Context, roleID int) ([]models.ResourceGroup, error)
	GetRoleName(ctx context.Context, roleID int) (string, error)
	BulkToggle(ctx context.Context, tx *sqlx.Tx, roleID int, toggles []models.PermissionToggle) error
	CheckPermission(ctx context.Context, roleID int, resource, action string) (models.PermissionCheckResult, error)
}

type permissionRepo struct {
	db *sqlx.DB
}

func NewPermissionRepository(db *sqlx.DB) PermissionRepository {
	return &permissionRepo{db: db}
}

type flatRow struct {
	Resource string `db:"resource"`
	models.PermissionRow
}

func (r *permissionRepo) GetRolePermissionsGrouped(ctx context.Context, roleID int) ([]models.ResourceGroup, error) {

	query := `
SELECT
    p.id            AS permission_id,
    p.resource::TEXT AS resource,
    p.action::TEXT   AS action,
    p.label          AS label,
    p.description    AS description,
    rp.scope         AS scope,
    rp.require_seniority AS require_seniority,
    rp.is_enabled    AS is_enabled
FROM tbl_role_permission rp
INNER JOIN tbl_permission p
        ON p.id = rp.permission_id
WHERE rp.role_id    = $1
  AND p.is_visible  = TRUE
ORDER BY p.resource, p.action
`
	var rows []flatRow
	if err := r.db.SelectContext(ctx, &rows, query, roleID); err != nil {
		return nil, fmt.Errorf("GetRolePermissionsGrouped role=%d: %w", roleID, err)
	}

	// Group by resource — rows arrive ordered, so a single linear pass works.
	var groups []models.ResourceGroup
	for _, row := range rows {
		if len(groups) == 0 || groups[len(groups)-1].Resource != row.Resource {
			groups = append(groups, models.ResourceGroup{
				Resource:    row.Resource,
				Permissions: []models.PermissionRow{},
			})
		}
		groups[len(groups)-1].Permissions = append(
			groups[len(groups)-1].Permissions,
			row.PermissionRow,
		)
	}

	return groups, nil
}

func (r *permissionRepo) GetRoleName(ctx context.Context, roleID int) (string, error) {
	var name string
	if err := r.db.GetContext(ctx, &name,
		`SELECT type FROM Tbl_Role WHERE id = $1`, roleID); err != nil {
		return "", fmt.Errorf("GetRoleName role_id=%d: %w", roleID, err)
	}
	return name, nil
}

func (r *permissionRepo) BulkToggle(ctx context.Context, tx *sqlx.Tx, roleID int, toggles []models.PermissionToggle) error {

	query := `
UPDATE tbl_role_permission
SET    is_enabled = $1,
       updated_at = NOW()
WHERE  role_id       = $2
  AND  permission_id = $3
`
	for _, t := range toggles {
		res, err := tx.ExecContext(ctx, query, t.IsEnabled, roleID, t.PermissionID)
		if err != nil {
			return fmt.Errorf("BulkToggle role=%d perm=%d: %w", roleID, t.PermissionID, err)
		}
		n, _ := res.RowsAffected()
		if n == 0 {
			return fmt.Errorf("permission_id %d is not assigned to role_id %d", t.PermissionID, roleID)
		}
	}
	return nil
}

func (r *permissionRepo) CheckPermission(ctx context.Context, roleID int, resource, action string) (models.PermissionCheckResult, error) {
	query := `
SELECT rp.scope, rp.require_seniority, rp.is_enabled
FROM tbl_role_permission rp
INNER JOIN tbl_permission p ON p.id = rp.permission_id
WHERE rp.role_id = $1 AND p.resource = $2 AND p.action = $3
`
	var result models.PermissionCheckResult
	err := r.db.GetContext(ctx, &result, query, roleID, resource, action)
	if err != nil {
		// no row = permission not seeded for this role = simply not allowed
		return models.PermissionCheckResult{Allowed: false}, nil
	}
	return result, nil
}
