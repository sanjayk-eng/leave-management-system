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
	// GetRolePermissionsGrouped returns the full permission matrix for one role
	// already grouped into ResourceGroup slices — ready for the service to wrap
	// in a RolePermissionResponse.
	//
	// All visible permissions are returned (LEFT JOIN), so permissions not yet
	// seeded for this role appear with is_enabled = FALSE.
	// Order within each group: action ASC (alphabetical).
	GetRolePermissionsGrouped(ctx context.Context, roleID int) ([]models.ResourceGroup, error)

	// GetRoleName returns the role type string (e.g. "ADMIN") for a role_id.
	// Returns an error when the role does not exist.
	GetRoleName(ctx context.Context, roleID int) (string, error)

	// BulkToggle updates is_enabled for each supplied toggle inside tx.
	// Only is_enabled is written — scope and require_seniority are never touched.
	// Returns an error if any permission_id does not exist for the role.
	BulkToggle(ctx context.Context, tx *sqlx.Tx, roleID int, toggles []models.PermissionToggle) error
}

// ─────────────────────────────────────────────────────────────────────────────
// permissionRepo — concrete implementation
// ─────────────────────────────────────────────────────────────────────────────

type permissionRepo struct {
	db *sqlx.DB
}

// NewPermissionRepository constructs the repository.
func NewPermissionRepository(db *sqlx.DB) PermissionRepository {
	return &permissionRepo{db: db}
}

// ─────────────────────────────────────────────────────────────────────────────
// GetRolePermissionsGrouped
//
// SQL explanation
// ───────────────
// SELECT all visible tbl_permission rows LEFT JOIN tbl_role_permission on
// (role_id, permission_id).  COALESCE handles permissions not yet seeded for
// this role (is_enabled → FALSE, scope → 'own').
// Ordered by resource then action so the grouping loop is O(n).
// ─────────────────────────────────────────────────────────────────────────────

const queryGrouped = `
SELECT
    p.id                                  AS permission_id,
    p.resource::TEXT                      AS resource,
    p.action::TEXT                        AS action,
    p.label                               AS label,
    p.description                         AS description,
    COALESCE(rp.scope, 'own')             AS scope,
    COALESCE(rp.require_seniority, FALSE) AS require_seniority,
    COALESCE(rp.is_enabled, FALSE)        AS is_enabled
FROM tbl_permission p
LEFT JOIN tbl_role_permission rp
       ON rp.permission_id = p.id
      AND rp.role_id        = $1
WHERE p.is_visible = TRUE
ORDER BY p.resource, p.action
`

// flatRow is an internal scan target.  It extends PermissionRow with the
// resource string needed for grouping.  Never serialised to JSON.
type flatRow struct {
	Resource string `db:"resource"`
	models.PermissionRow
}

func (r *permissionRepo) GetRolePermissionsGrouped(ctx context.Context, roleID int) ([]models.ResourceGroup, error) {
	var rows []flatRow
	if err := r.db.SelectContext(ctx, &rows, queryGrouped, roleID); err != nil {
		return nil, fmt.Errorf("GetRolePermissionsGrouped: %w", err)
	}

	// Group by resource — rows arrive ordered, so a linear pass is enough.
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
	err := r.db.GetContext(ctx, &name,
		`SELECT type FROM Tbl_Role WHERE id = $1`, roleID)
	if err != nil {
		return "", fmt.Errorf("GetRoleName role_id=%d: %w", roleID, err)
	}
	return name, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// BulkToggle
//
// One UPDATE per toggle row.  Runs inside the transaction provided by the
// service layer so all-or-nothing semantics are guaranteed.
//
// We return an error when affected rows = 0 — this means the caller sent a
// permission_id that does not belong to this role, catching stale/wrong IDs
// before they silently do nothing.
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
			return fmt.Errorf("permission_id %d does not exist for role_id %d", t.PermissionID, roleID)
		}
	}
	return nil
}
