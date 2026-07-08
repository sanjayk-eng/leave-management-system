package service

import (
	"context"
	"net/http"

	"github.com/Zenithive/LeaveManagementSystem/internal/config/database"
	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/internal/repositories"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/jmoiron/sqlx"
)

type PermissionService interface {
	GetRolePermissions(ctx context.Context, roleID int) (*models.RolePermissionResponse, error)
	TogglePermissions(ctx context.Context, roleID int, input *models.TogglePermissionInput) error
	Check(ctx context.Context, roleID int, resource, action string) (models.PermissionCheckResult, error)
}

type permissionService struct {
	db   *sqlx.DB
	repo repositories.PermissionRepository
}

func NewPermissionService(db *sqlx.DB, repo repositories.PermissionRepository) PermissionService {
	return &permissionService{db: db, repo: repo}
}

func (s *permissionService) GetRolePermissions(ctx context.Context, roleID int) (*models.RolePermissionResponse, error) {

	roleName, err := s.repo.GetRoleName(ctx, roleID)
	if err != nil {
		return nil, errors.CustomErr(http.StatusNotFound, "role not found")
	}
	resources, err := s.repo.GetRolePermissionsGrouped(ctx, roleID)
	if err != nil {
		return nil, errors.CustomErr(http.StatusInternalServerError, "failed to fetch permissions: "+err.Error())
	}

	return &models.RolePermissionResponse{
		RoleID:    roleID,
		RoleName:  roleName,
		Resources: resources,
	}, nil
}
func (s *permissionService) TogglePermissions(ctx context.Context, roleID int, input *models.TogglePermissionInput) error {

	if input == nil || len(input.Permissions) == 0 {
		return errors.CustomErr(http.StatusBadRequest, "at least one permission toggle is required")
	}

	if _, err := s.repo.GetRoleName(ctx, roleID); err != nil {
		return errors.CustomErr(http.StatusNotFound, "role not found")
	}
	err := database.ExecuteTransaction(ctx, s.db, func(tx *sqlx.Tx) error {
		if err := s.repo.BulkToggle(ctx, tx, roleID, input.Permissions); err != nil {
			return errors.CustomErr(http.StatusBadRequest, err.Error())
		}
		return nil
	})

	return err
}

func (s *permissionService) Check(ctx context.Context, roleID int, resource, action string) (models.PermissionCheckResult, error) {
	return s.repo.CheckPermission(ctx, roleID, resource, action)
}
