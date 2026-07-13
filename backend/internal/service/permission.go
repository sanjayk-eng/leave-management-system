package service

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/Zenithive/LeaveManagementSystem/internal/config/database"
	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/internal/repositories"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/jmoiron/sqlx"
)

type PermissionService interface {
	GetRolePermissions(ctx context.Context, callerRoleID, targetRoleID int) (*models.RolePermissionResponse, error)
	TogglePermissions(ctx context.Context, callerRoleID, targetRoleID int, input *models.TogglePermissionInput) error
	Check(ctx context.Context, roleID int, resource, action string) (models.PermissionCheckResult, error)
}

type permissionService struct {
	db   *sqlx.DB
	repo repositories.PermissionRepository
}

func NewPermissionService(db *sqlx.DB, repo repositories.PermissionRepository) PermissionService {
	return &permissionService{db: db, repo: repo}
}

func (s *permissionService) GetRolePermissions(ctx context.Context, callerRoleID, targetRoleID int) (*models.RolePermissionResponse, error) {

	// ── Hierarchy check ────────────────────────────────────────────────────────
	// Caller must have a strictly higher priority than the target role.
	// SUPERADMIN (priority 6) is handled by the middleware bypass — it never
	// reaches here — so we enforce the rule for everyone else.
	if err := s.enforceHierarchy(ctx, callerRoleID, targetRoleID); err != nil {
		return nil, err
	}

	roleName, err := s.repo.GetRoleName(ctx, targetRoleID)
	if err != nil {
		return nil, errors.CustomErr(http.StatusNotFound, "role not found")
	}
	resources, err := s.repo.GetRolePermissionsGrouped(ctx, targetRoleID)
	if err != nil {
		return nil, errors.CustomErr(http.StatusInternalServerError, "failed to fetch permissions: "+err.Error())
	}

	return &models.RolePermissionResponse{
		RoleID:    targetRoleID,
		RoleName:  roleName,
		Resources: resources,
	}, nil
}

func (s *permissionService) TogglePermissions(ctx context.Context, callerRoleID, targetRoleID int, input *models.TogglePermissionInput) error {

	if input == nil || len(input.Permissions) == 0 {
		return errors.CustomErr(http.StatusBadRequest, "at least one permission toggle is required")
	}

	// ── Hierarchy check ────────────────────────────────────────────────────────
	if err := s.enforceHierarchy(ctx, callerRoleID, targetRoleID); err != nil {
		return err
	}

	if _, err := s.repo.GetRoleName(ctx, targetRoleID); err != nil {
		return errors.CustomErr(http.StatusNotFound, "role not found")
	}

	// ── Validate caller has all permissions they're trying to grant ──
	// This enforces cascading permission inheritance:
	// SUPERADMIN disables X → ADMIN cannot enable X for anyone
	if err := s.enforceCallerPermissions(ctx, callerRoleID, input); err != nil {
		return err
	}

	// ── Validate dependency rules before touching the DB ──
	if err := s.validatePermissionDependencies(ctx, targetRoleID, input); err != nil {
		return err
	}

	err := database.ExecuteTransaction(ctx, s.db, func(tx *sqlx.Tx) error {
		if err := s.repo.BulkToggle(ctx, tx, targetRoleID, input.Permissions); err != nil {
			return errors.CustomErr(http.StatusBadRequest, err.Error())
		}
		return nil
	})

	return err
}

// enforceHierarchy returns 403 if the caller's priority is not strictly greater
// than the target role's priority. Fetches both priorities from Tbl_Role.
func (s *permissionService) enforceHierarchy(ctx context.Context, callerRoleID, targetRoleID int) error {
	callerPriority, err := s.repo.GetRolePriority(ctx, callerRoleID)
	if err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to resolve caller role priority")
	}
	targetPriority, err := s.repo.GetRolePriority(ctx, targetRoleID)
	if err != nil {
		return errors.CustomErr(http.StatusNotFound, "target role not found")
	}
	if callerPriority <= targetPriority {
		return errors.CustomErr(http.StatusForbidden,
			"access denied: you can only manage roles with a lower priority than your own")
	}
	return nil
}

func (s *permissionService) Check(ctx context.Context, roleID int, resource, action string) (models.PermissionCheckResult, error) {
	return s.repo.CheckPermission(ctx, roleID, resource, action)
}

// ─────────────────────────────────────────────────────────────────────────────
// enforceCallerPermissions validates that the caller has all the permissions
// they are trying to grant to the target role.
//
// Business Rule (Cascading Permission Inheritance):
//   If SUPERADMIN disables permission X for their own role, then no lower role
//   (ADMIN, HR, etc.) can enable that permission for any role below them.
//
// Algorithm:
//   1. Build a map of permission IDs → permission details (label, resource, action)
//   2. Build a set of permission IDs that the caller has ENABLED
//   3. For each permission the caller wants to enable on the target:
//      - Check if the caller has that permission enabled
//      - If not, deny with user-friendly label
//
// Time Complexity: O(P) where P = number of permissions (~40-50)
// Space Complexity: O(P) for the maps
// ─────────────────────────────────────────────────────────────────────────────
func (s *permissionService) enforceCallerPermissions(ctx context.Context, callerRoleID int, input *models.TogglePermissionInput) error {
	// Fetch caller's permissions
	callerGroups, err := s.repo.GetRolePermissionsGrouped(ctx, callerRoleID)
	if err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to fetch caller permissions: "+err.Error())
	}

	// Build two maps for O(1) lookup:
	// 1. permission_id → permission details (for error messages)
	// 2. permission_id → is_enabled (for validation)
	type permDetails struct {
		label    string
		resource string
		action   string
	}
	permInfo := make(map[int]permDetails, 64)
	callerEnabledPerms := make(map[int]bool, 64)

	for _, group := range callerGroups {
		for _, perm := range group.Permissions {
			permInfo[perm.PermissionID] = permDetails{
				label:    perm.Label,
				resource: group.Resource,
				action:   perm.Action,
			}
			if perm.IsEnabled {
				callerEnabledPerms[perm.PermissionID] = true
			}
		}
	}

	// Validate each permission being enabled
	var deniedPermissions []string
	for _, toggle := range input.Permissions {
		// Only check when trying to ENABLE a permission
		if !toggle.IsEnabled {
			continue
		}

		// Check if caller has this permission enabled
		if !callerEnabledPerms[toggle.PermissionID] {
			info, exists := permInfo[toggle.PermissionID]
			if exists {
				deniedPermissions = append(deniedPermissions, info.label)
			} else {
				deniedPermissions = append(deniedPermissions, fmt.Sprintf("Permission ID %d", toggle.PermissionID))
			}
		}
	}

	if len(deniedPermissions) > 0 {
		if len(deniedPermissions) == 1 {
			return errors.CustomErr(http.StatusForbidden,
				fmt.Sprintf("you cannot grant the permission '%s' because you don't have it enabled in your role", deniedPermissions[0]))
		}
		return errors.CustomErr(http.StatusForbidden,
			fmt.Sprintf("you cannot grant the following permissions because you don't have them enabled in your role:\n  • %s",
				strings.Join(deniedPermissions, "\n  • ")))
	}

	return nil
}

func (s *permissionService) validatePermissionDependencies(ctx context.Context, targetRoleID int, input *models.TogglePermissionInput) error {
	groups, err := s.repo.GetRolePermissionsGrouped(ctx, targetRoleID)
	if err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to load permissions for validation")
	}
	type permInfo struct {
		action    string
		resource  string
		label     string
		isEnabled bool
	}
	byID := make(map[int]permInfo, 64)
	readPermByResource := make(map[string]int)
	siblingsByResource := make(map[string][]int)

	for _, g := range groups {
		for _, p := range g.Permissions {
			byID[p.PermissionID] = permInfo{
				action:    p.Action,
				resource:  g.Resource,
				label:     p.Label,
				isEnabled: p.IsEnabled,
			}
			siblingsByResource[g.Resource] = append(siblingsByResource[g.Resource], p.PermissionID)
			if p.Action == "read" {
				readPermByResource[g.Resource] = p.PermissionID
			}
		}
	}
	afterState := make(map[int]bool, len(byID))
	for id, info := range byID {
		afterState[id] = info.isEnabled
	}
	for _, t := range input.Permissions {
		afterState[t.PermissionID] = t.IsEnabled
	}

	var violations []string

	for _, t := range input.Permissions {
		info, exists := byID[t.PermissionID]
		if !exists {
			continue
		}

		// ── Rule 1: enabling any non-read action requires read to be on ──
		if t.IsEnabled && info.action != "read" {
			readID, hasRead := readPermByResource[info.resource]
			if hasRead && !afterState[readID] {
				readInfo := byID[readID]
				violations = append(violations, fmt.Sprintf("cannot enable '%s': '%s' must be enabled first (resource: %s)",
					info.label, readInfo.label, info.resource))
			}
		}

		// ── Rule 2: disabling read requires all siblings to be off too ──
		if !t.IsEnabled && info.action == "read" {
			for _, sibID := range siblingsByResource[info.resource] {
				if sibID == t.PermissionID {
					continue
				}
				if afterState[sibID] {
					sibInfo := byID[sibID]
					violations = append(violations, fmt.Sprintf("cannot disable '%s': '%s' must be disabled first (resource: %s)",
						info.label, sibInfo.label, info.resource))
				}
			}
		}
	}

	if len(violations) > 0 {
		return errors.CustomErr(http.StatusUnprocessableEntity,
			fmt.Sprintf("permission dependency violations detected:\n  • %s", strings.Join(violations, "\n  • ")))
	}
	return nil
}
