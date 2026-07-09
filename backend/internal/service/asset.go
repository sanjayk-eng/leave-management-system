package service

import (
	"context"
	"net/http"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/internal/repositories"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type assetService struct {
	Db   *sqlx.DB
	Repo repositories.AssetRepository
}

type AssetService interface {
	CreateCategory(ctx context.Context, data models.AssetCategoryRequest) error
	UpdateCategory(ctx context.Context, id uuid.UUID, req models.AssetCategoryRequest) error
	GetCategory(ctx context.Context, filter models.QueryFilter) ([]models.AssetCategory, int64, error)
	DeleteCategory(ctx context.Context, id uuid.UUID) error
}

func NewAssetService(db *sqlx.DB, repo repositories.AssetRepository) AssetService {
	return &assetService{
		Db:   db,
		Repo: repo,
	}
}

func (s *assetService) CreateCategory(ctx context.Context, data models.AssetCategoryRequest) error {
	if err := s.Repo.CreateCategory(ctx, data); err != nil {
		return errors.CustomErr(http.StatusInternalServerError, err.Error())
	}
	return nil
}
func (s *assetService) UpdateCategory(ctx context.Context, id uuid.UUID, req models.AssetCategoryRequest) error {
	return s.Repo.UpdateCategory(ctx, id, req)
}

func (s *assetService) GetCategory(ctx context.Context, filter models.QueryFilter) ([]models.AssetCategory, int64, error) {

	if filter.Page < 1 {
		filter.Page = 1
	}

	if filter.PageSize > 100 {
		filter.PageSize = 100
	}

	return s.Repo.GetCategory(ctx, filter)
}
func (s *assetService) DeleteCategory(ctx context.Context, id uuid.UUID) error {
	return s.Repo.DeleteCategory(ctx, id)
}
