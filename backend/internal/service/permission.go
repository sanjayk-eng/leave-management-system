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

type permissionIndex struct {
	groups        []models.ResourceGroup
	enabled       map[int]bool                 // permission_id -> is_enabled (for this role)
	byID          map[int]models.PermissionRow // permission_id -> full row (label, action, ...)
	resourceOf    map[int]string               // permission_id -> resource name
	readIDByRes   map[string]int               // resource -> its "read" permission_id
	siblingsByRes map[string][]int             // resource -> all permission_ids on that resource
}

func (s *permissionService) loadPermissionIndex(ctx context.Context, roleID int) (*permissionIndex, error) {
	groups, err := s.repo.GetRolePermissionsGrouped(ctx, roleID)
	if err != nil {
		return nil, err
	}

	idx := &permissionIndex{
		groups:        groups,
		enabled:       make(map[int]bool, 64),
		byID:          make(map[int]models.PermissionRow, 64),
		resourceOf:    make(map[int]string, 64),
		readIDByRes:   make(map[string]int),
		siblingsByRes: make(map[string][]int),
	}

	for _, g := range groups {
		for _, p := range g.Permissions {
			idx.byID[p.PermissionID] = p
			idx.resourceOf[p.PermissionID] = g.Resource
			idx.siblingsByRes[g.Resource] = append(idx.siblingsByRes[g.Resource], p.PermissionID)

			if p.IsEnabled {
				idx.enabled[p.PermissionID] = true
			}
			if p.Action == "read" {
				idx.readIDByRes[g.Resource] = p.PermissionID
			}
		}
	}

	return idx, nil
}

func (s *permissionService) GetRolePermissions(ctx context.Context, callerRoleID, targetRoleID int) (*models.RolePermissionResponse, error) {

	if err := s.enforceHierarchy(ctx, callerRoleID, targetRoleID); err != nil {
		return nil, err
	}

	roleName, err := s.repo.GetRoleName(ctx, targetRoleID)
	if err != nil {
		return nil, errors.CustomErr(http.StatusNotFound, "role not found")
	}

	targetIdx, err := s.loadPermissionIndex(ctx, targetRoleID)
	if err != nil {
		return nil, errors.CustomErr(http.StatusInternalServerError, "failed to fetch permissions: "+err.Error())
	}

	callerIdx, err := s.loadPermissionIndex(ctx, callerRoleID)
	if err != nil {
		return nil, errors.CustomErr(http.StatusInternalServerError, "failed to resolve caller visibility: "+err.Error())
	}

	visibleResources := filterVisibleToCaller(targetIdx.groups, callerIdx.enabled)

	return &models.RolePermissionResponse{
		RoleID:    targetRoleID,
		RoleName:  roleName,
		Resources: visibleResources,
	}, nil
}

func filterVisibleToCaller(groups []models.ResourceGroup, callerEnabled map[int]bool) []models.ResourceGroup {
	visible := make([]models.ResourceGroup, 0, len(groups))

	for _, g := range groups {
		kept := make([]models.PermissionRow, 0, len(g.Permissions))
		for _, p := range g.Permissions {
			if callerEnabled[p.PermissionID] {
				kept = append(kept, p)
			}
		}
		if len(kept) > 0 {
			visible = append(visible, models.ResourceGroup{
				Resource:    g.Resource,
				Permissions: kept,
			})
		}
	}

	return visible
}

func (s *permissionService) TogglePermissions(ctx context.Context, callerRoleID, targetRoleID int, input *models.TogglePermissionInput) error {

	if input == nil || len(input.Permissions) == 0 {
		return errors.CustomErr(http.StatusBadRequest, "at least one permission toggle is required")
	}

	if err := s.enforceHierarchy(ctx, callerRoleID, targetRoleID); err != nil {
		return err
	}

	if _, err := s.repo.GetRoleName(ctx, targetRoleID); err != nil {
		return errors.CustomErr(http.StatusNotFound, "role not found")
	}

	// Cascading permission inheritance: SUPERADMIN disables X → ADMIN cannot
	// enable X for anyone below them.
	callerIdx, err := s.loadPermissionIndex(ctx, callerRoleID)
	if err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to fetch caller permissions: "+err.Error())
	}
	if err := s.enforceCallerPermissions(callerIdx, input); err != nil {
		return err
	}

	targetIdx, err := s.loadPermissionIndex(ctx, targetRoleID)
	if err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to load permissions for validation")
	}
	if err := s.validatePermissionDependencies(targetIdx, input); err != nil {
		return err
	}

	return database.ExecuteTransaction(ctx, s.db, func(tx *sqlx.Tx) error {
		if err := s.repo.BulkToggle(ctx, tx, targetRoleID, input.Permissions); err != nil {
			return errors.CustomErr(http.StatusBadRequest, err.Error())
		}
		return nil
	})
}

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

func (s *permissionService) enforceCallerPermissions(callerIdx *permissionIndex, input *models.TogglePermissionInput) error {
	var deniedPermissions []string

	for _, toggle := range input.Permissions {
		// Only enabling a permission requires the caller to hold it themselves.
		if !toggle.IsEnabled {
			continue
		}
		if callerIdx.enabled[toggle.PermissionID] {
			continue
		}

		if p, exists := callerIdx.byID[toggle.PermissionID]; exists {
			deniedPermissions = append(deniedPermissions, p.Label)
		} else {
			deniedPermissions = append(deniedPermissions, fmt.Sprintf("Permission ID %d", toggle.PermissionID))
		}
	}

	if len(deniedPermissions) == 0 {
		return nil
	}
	if len(deniedPermissions) == 1 {
		return errors.CustomErr(http.StatusForbidden,
			fmt.Sprintf("you cannot grant the permission '%s' because you don't have it enabled in your role", deniedPermissions[0]))
	}
	return errors.CustomErr(http.StatusForbidden,
		fmt.Sprintf("you cannot grant the following permissions because you don't have them enabled in your role:\n  • %s",
			strings.Join(deniedPermissions, "\n  • ")))
}

func (s *permissionService) validatePermissionDependencies(targetIdx *permissionIndex, input *models.TogglePermissionInput) error {
	afterState := make(map[int]bool, len(targetIdx.byID))
	for id, p := range targetIdx.byID {
		afterState[id] = p.IsEnabled
	}
	for _, t := range input.Permissions {
		afterState[t.PermissionID] = t.IsEnabled
	}

	var violations []string

	for _, t := range input.Permissions {
		info, exists := targetIdx.byID[t.PermissionID]
		if !exists {
			continue
		}
		resource := targetIdx.resourceOf[t.PermissionID]

		// Rule 1
		if t.IsEnabled && info.Action != "read" {
			if readID, hasRead := targetIdx.readIDByRes[resource]; hasRead && !afterState[readID] {
				readInfo := targetIdx.byID[readID]
				violations = append(violations, fmt.Sprintf("cannot enable '%s': '%s' must be enabled first (resource: %s)",
					info.Label, readInfo.Label, resource))
			}
		}

		// Rule 2
		if !t.IsEnabled && info.Action == "read" {
			for _, sibID := range targetIdx.siblingsByRes[resource] {
				if sibID == t.PermissionID {
					continue
				}
				if afterState[sibID] {
					sibInfo := targetIdx.byID[sibID]
					violations = append(violations, fmt.Sprintf("cannot disable '%s': '%s' must be disabled first (resource: %s)",
						info.Label, sibInfo.Label, resource))
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
