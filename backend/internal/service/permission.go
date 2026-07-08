package service

import (
	"context"
	"net/http"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/internal/repositories"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/jmoiron/sqlx"
)

// ─────────────────────────────────────────────────────────────────────────────
// PermissionService — interface consumed by the handler
// ─────────────────────────────────────────────────────────────────────────────

type PermissionService interface {
	// GetRolePermissions returns the full permission matrix for one role,
	// grouped by resource — ready to render by the frontend.
	GetRolePermissions(ctx context.Context, roleID int) (*models.RolePermissionResponse, error)

	// TogglePermissions updates is_enabled for the supplied list of
	// { permission_id, is_enabled } pairs for the given role.
	// scope and require_seniority are never modified.
	TogglePermissions(ctx context.Context, roleID int, input *models.TogglePermissionInput) error
}

// ─────────────────────────────────────────────────────────────────────────────
// permissionService — concrete implementation
// ─────────────────────────────────────────────────────────────────────────────

type permissionService struct {
	db   *sqlx.DB
	repo repositories.PermissionRepository
}

// NewPermissionService wires the service. Called from main.go.
func NewPermissionService(db *sqlx.DB, repo repositories.PermissionRepository) PermissionService {
	return &permissionService{db: db, repo: repo}
}

// ─────────────────────────────────────────────────────────────────────────────
// GetRolePermissions
// ─────────────────────────────────────────────────────────────────────────────

func (s *permissionService) GetRolePermissions(ctx context.Context, roleID int) (*models.RolePermissionResponse, error) {
	if roleID <= 0 {
		return nil, errors.CustomErr(http.StatusBadRequest, "invalid role_id: must be a positive integer")
	}

	// Validate role exists and get its display name.
	roleName, err := s.repo.GetRoleName(ctx, roleID)
	if err != nil {
		return nil, errors.CustomErr(http.StatusNotFound, "role not found")
	}

	// Fetch permissions grouped by resource.
	resources, err := s.repo.GetRolePermissionsGrouped(ctx, roleID)
	if err != nil {
		return nil, errors.CustomErr(http.StatusInternalServerError,
			"failed to fetch permissions: "+err.Error())
	}

	return &models.RolePermissionResponse{
		RoleID:    roleID,
		RoleName:  roleName,
		Resources: resources,
	}, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// TogglePermissions
//
// Business rules
// ──────────────
//  1. roleID must be a valid positive integer.
//  2. SUPERADMIN (role_id = 1) permissions are immutable — always fully enabled.
//     Any attempt to disable a SUPERADMIN permission is rejected.
//  3. At least one PermissionToggle must be provided.
//  4. All DB writes run inside a single transaction — all succeed or all fail.
//  5. Sending a permission_id that does not belong to this role returns a 400
//     so the frontend can surface the invalid ID instead of silently ignoring.
// ─────────────────────────────────────────────────────────────────────────────

const superAdminRoleID = 1

func (s *permissionService) TogglePermissions(ctx context.Context, roleID int, input *models.TogglePermissionInput) error {
	if roleID <= 0 {
		return errors.CustomErr(http.StatusBadRequest, "invalid role_id: must be a positive integer")
	}

	// Rule 2: SUPERADMIN is always fully enabled.
	if roleID == superAdminRoleID {
		return errors.CustomErr(http.StatusForbidden,
			"SUPERADMIN permissions cannot be modified — they are always fully enabled")
	}

	if input == nil || len(input.Permissions) == 0 {
		return errors.CustomErr(http.StatusBadRequest,
			"at least one permission toggle is required")
	}

	// Validate role exists before opening a transaction.
	if _, err := s.repo.GetRoleName(ctx, roleID); err != nil {
		return errors.CustomErr(http.StatusNotFound, "role not found")
	}

	// All updates in one transaction — all-or-nothing.
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to start transaction")
	}
	defer tx.Rollback() //nolint:errcheck

	if err := s.repo.BulkToggle(ctx, tx, roleID, input.Permissions); err != nil {
		return errors.CustomErr(http.StatusBadRequest, err.Error())
	}

	if err := tx.Commit(); err != nil {
		return errors.CustomErr(http.StatusInternalServerError,
			"failed to commit permission changes")
	}

	return nil
}
