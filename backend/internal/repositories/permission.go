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
	// GetRolePermissionsGrouped returns only the permissions that are seeded
	// for this role (INNER JOIN), grouped into ResourceGroup slices.
	// Permissions that don't belong to this role are never returned.
	GetRolePermissionsGrouped(ctx context.Context, roleID int) ([]models.ResourceGroup, error)

	// GetRoleName returns the role type string (e.g. "ADMIN") for a role_id.
	GetRoleName(ctx context.Context, roleID int) (string, error)

	// BulkToggle updates is_enabled for each supplied toggle inside tx.
	// Only is_enabled is written — scope and require_seniority are never touched.
	// Returns an error if any permission_id does not belong to this role.
	BulkToggle(ctx context.Context, tx *sqlx.Tx, roleID int, toggles []models.PermissionToggle) error
}

// ─────────────────────────────────────────────────────────────────────────────
// permissionRepo — concrete implementation
// ─────────────────────────────────────────────────────────────────────────────

type permissionRepo struct {
	db *sqlx.DB
}

func NewPermissionRepository(db *sqlx.DB) PermissionRepository {
	return &permissionRepo{db: db}
}

// ─────────────────────────────────────────────────────────────────────────────
// GetRolePermissionsGrouped
//
// KEY FIX: INNER JOIN instead of LEFT JOIN.
//
// Only returns permissions that are explicitly seeded in tbl_role_permission
// for this role. No role ever sees permissions it was not given.
//
// This means:
//   - INTERN sees only: employee:read, leave:apply/read/edit/cancel,
//     leave_balance:read, designation:read  (7 rows total)
//   - EMPLOYEE sees only: the above + leave:withdraw + payroll:read  (9 rows)
//   - MANAGER sees team-scoped approvals + own leave ops  (11 rows)
//   - HR/ADMIN/SUPERADMIN see their full set
//
// Ordered by resource then action so the grouping loop is O(n).
// ─────────────────────────────────────────────────────────────────────────────

const queryRolePermissions = `
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

// flatRow is the internal scan target — carries resource for grouping.
type flatRow struct {
	Resource string `db:"resource"`
	models.PermissionRow
}

func (r *permissionRepo) GetRolePermissionsGrouped(ctx context.Context, roleID int) ([]models.ResourceGroup, error) {
	var rows []flatRow
	if err := r.db.SelectContext(ctx, &rows, queryRolePermissions, roleID); err != nil {
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

// ─────────────────────────────────────────────────────────────────────────────
// GetRoleName
// ─────────────────────────────────────────────────────────────────────────────

func (r *permissionRepo) GetRoleName(ctx context.Context, roleID int) (string, error) {
	var name string
	if err := r.db.GetContext(ctx, &name,
		`SELECT type FROM Tbl_Role WHERE id = $1`, roleID); err != nil {
		return "", fmt.Errorf("GetRoleName role_id=%d: %w", roleID, err)
	}
	return name, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// BulkToggle
//
// One UPDATE per toggle row inside the provided transaction.
// Returns an error when affected rows = 0 — permission_id not seeded for role.
// ─────────────────────────────────────────────────────────────────────────────

const updateToggleSQL = `
UPDATE tbl_role_permission
SET    is_enabled = $1,
       updated_at = NOW()
WHERE  role_id       = $2
  AND  permission_id = $3
`

func (r *permissionRepo) BulkToggle(ctx context.Context, tx *sqlx.Tx, roleID int, toggles []models.PermissionToggle) error {
	for _, t := range toggles {
		res, err := tx.ExecContext(ctx, updateToggleSQL, t.IsEnabled, roleID, t.PermissionID)
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
