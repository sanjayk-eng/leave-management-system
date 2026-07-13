package service

import (
	"context"
	"fmt"
	"net/http"

	"github.com/Zenithive/LeaveManagementSystem/internal/config/database"
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

	CreateAsset(ctx context.Context, data *models.AssetRequest) error
	GetAssets(ctx context.Context, filter models.QueryFilter) ([]models.Asset, int64, error)
	UpdateAsset(ctx context.Context, assetId uuid.UUID, req models.AssetRequest) error
	GetEquipmentByCategory(ctx context.Context, categoryID uuid.UUID, filter models.QueryFilter) ([]models.Asset, int64, error)
	DeleteAsset(ctx context.Context, assetID uuid.UUID) error

	AssignAsset(ctx context.Context, req *models.AssignAssetRequest) error
	UpdateAssignAsset(ctx context.Context, req *models.UpdateAssignmentRequest) error
	RemoveEquipment(ctx context.Context, req *models.RemoveAssignmentRequest) error
	GetAllAssignedEquipment(ctx context.Context, filter models.QueryFilter) ([]models.AssignEquipmentResponse, int64, error)
	GetAssignedEquipmentByEmployee(ctx context.Context, employeeID uuid.UUID, filter models.QueryFilter) ([]models.AssignEquipmentResponse, int64, error)
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
func (s *assetService) DeleteCategory(ctx context.Context, categoryID uuid.UUID) error {
	hasAssets, err := s.Repo.HasAssetsInCategory(ctx, categoryID)
	if err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to check category")
	}

	if hasAssets {
		return errors.CustomErr(http.StatusBadRequest, "cannot delete category because it contains assets")
	}

	return s.Repo.DeleteCategory(ctx, categoryID)
}

func (s *assetService) CreateAsset(ctx context.Context, data *models.AssetRequest) error {
	ok, err := s.Repo.CategoryExists(ctx, data.CategoryID)
	if err != nil {
		return errors.CustomErr(http.StatusInternalServerError, err.Error())
	}
	if !ok {
		return errors.CustomErr(http.StatusBadRequest, "category does not exist")
	}
	if err := s.Repo.CreateAsset(ctx, data); err != nil {
		return errors.CustomErr(http.StatusInternalServerError, err.Error())
	}
	return nil
}

func (s *assetService) GetAssets(ctx context.Context, filter models.QueryFilter) ([]models.Asset, int64, error) {

	if filter.Page < 1 {
		filter.Page = 1
	}

	if filter.PageSize > 100 {
		filter.PageSize = 100
	}

	return s.Repo.GetAssets(ctx, filter)
}
func (s *assetService) GetEquipmentByCategory(ctx context.Context, categoryID uuid.UUID, filter models.QueryFilter) ([]models.Asset, int64, error) {

	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.PageSize > 100 {
		filter.PageSize = 100
	}
	return s.Repo.GetEquipmentByCategory(ctx, categoryID, filter)
}
func (s *assetService) UpdateAsset(ctx context.Context, assetID uuid.UUID, req models.AssetRequest) error {
	data, err := s.Repo.GetAssetByID(ctx, assetID)
	if err != nil {
		return errors.CustomErr(http.StatusInternalServerError, err.Error())
	}

	if data == nil {
		return errors.CustomErr(http.StatusNotFound, "asset not found")
	}

	// Save old values
	oldTotal := data.TotalQuantity
	oldRemaining := data.RemainingQuantity

	// Update fields
	data.Name = req.Name
	data.CategoryID = req.CategoryID
	data.Price = req.Price
	data.TotalQuantity = req.TotalQuantity
	data.PurchaseDate = req.PurchaseDate

	if req.IsShared != nil {
		data.IsShared = *req.IsShared
	}

	diff := data.TotalQuantity - oldTotal
	data.RemainingQuantity = oldRemaining + diff

	if data.RemainingQuantity < 0 {
		return errors.CustomErr(http.StatusBadRequest, fmt.Sprintf("remaining quantity cannot be negative (old total=%d, new total=%d, old remaining=%d)", oldTotal, data.TotalQuantity, oldRemaining))
	}

	if data.RemainingQuantity > data.TotalQuantity {
		data.RemainingQuantity = data.TotalQuantity
	}
	if err := s.Repo.UpdateAsset(ctx, assetID, data); err != nil {
		return errors.CustomErr(http.StatusInternalServerError, err.Error())
	}
	return nil
}
func (s *assetService) DeleteAsset(ctx context.Context, assetID uuid.UUID) error {
	hasAssignment, err := s.Repo.HasAssetAssignments(ctx, assetID)
	if err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to check asset assignments")
	}

	if hasAssignment {
		return errors.CustomErr(http.StatusBadRequest, "cannot delete asset because it is assigned to one or more employees")
	}

	if err := s.Repo.DeleteAsset(ctx, assetID); err != nil {
		return err
	}
	return nil
}
func (s *assetService) AssignAsset(ctx context.Context, req *models.AssignAssetRequest) error {
	data, err := s.Repo.GetAssetByID(ctx, req.EquipmentID)
	if err != nil {
		return errors.CustomErr(http.StatusInternalServerError, err.Error())
	}
	if data == nil {
		return errors.CustomErr(http.StatusNotFound, "asset not found")
	}
	if req.Quantity > data.RemainingQuantity {
		return errors.CustomErr(http.StatusBadRequest, fmt.Sprintf("quantity (%d) cannot be grether than remaining quantity (%d)", req.Quantity, data.RemainingQuantity))
	}

	err = database.ExecuteTransaction(ctx, s.Db, func(tx *sqlx.Tx) error {
		if err := s.Repo.CreateAssignment(tx, req); err != nil {
			return errors.CustomErr(http.StatusInternalServerError, err.Error())
		}
		if err := s.Repo.UpdateAssetQuantity(tx, req.EquipmentID, req.Quantity, "dec"); err != nil {
			return errors.CustomErr(http.StatusInternalServerError, err.Error())
		}
		return nil
	})
	return err
}
func (s *assetService) UpdateAssignAsset(ctx context.Context, req *models.UpdateAssignmentRequest) error {

	assignmentID, currentQty, err := s.Repo.GetAssetAssignment(
		ctx,
		req.EquipmentID,
		req.FromEmployeeID,
	)
	if err != nil {
		return errors.CustomErr(http.StatusNotFound, "assignment not found")
	}

	if req.Quantity <= 0 {
		return errors.CustomErr(http.StatusBadRequest, "quantity must be greater than zero")
	}

	sameEmployee := req.ToEmployeeID == nil || *req.ToEmployeeID == req.FromEmployeeID

	if sameEmployee {
		return s.updateAssignmentQuantity(ctx,req,assignmentID,currentQty)
	}

	if req.Quantity > currentQty {
		return errors.CustomErr(http.StatusBadRequest,
			fmt.Sprintf("cannot transfer %d asset(s); employee has only %d assigned",req.Quantity,currentQty),
		)
	}

	return s.transferAssignment(ctx,assignmentID,currentQty,req)
}

func (s *assetService) updateAssignmentQuantity(ctx context.Context, req *models.UpdateAssignmentRequest, assignmentID uuid.UUID, currentQty int) error {

	asset, err := s.Repo.GetAssetByID(ctx, req.EquipmentID)
	if err != nil {
		return errors.CustomErr(http.StatusInternalServerError, err.Error())
	}

	diff := req.Quantity - currentQty

	if diff > 0 && diff > asset.RemainingQuantity {
		return errors.CustomErr(
			http.StatusBadRequest,
			fmt.Sprintf(
				"only %d asset(s) available; need %d more",
				asset.RemainingQuantity,
				diff,
			),
		)
	}

	return database.ExecuteTransaction(ctx, s.Db, func(tx *sqlx.Tx) error {

		switch {
		case diff > 0:
			if err := s.Repo.UpdateAssetQuantity(tx, req.EquipmentID, diff, "dec"); err != nil {
				return err
			}

		case diff < 0:
			if err := s.Repo.UpdateAssetQuantity(tx, req.EquipmentID, -diff, "inc"); err != nil {
				return err
			}
		}

		return s.Repo.SetAssignmentQuantity(
			tx,
			assignmentID,
			req.Quantity,
		)
	})
}
func (s *assetService) transferAssignment(ctx context.Context, assignmentID uuid.UUID, currentQty int, req *models.UpdateAssignmentRequest) error {

	return database.ExecuteTransaction(ctx, s.Db, func(tx *sqlx.Tx) error {

		// Reduce/Delete source assignment
		if req.Quantity == currentQty {
			if err := s.Repo.DeleteAssetAssignmentById(tx, assignmentID); err != nil {
				return err
			}
		} else {
			if err := s.Repo.UpdateAssetAssignmentQuantity(tx, assignmentID, req.Quantity, "dec"); err != nil {
				return err
			}
		}

		// Check destination assignment
		targetAssignmentID, _, err := s.Repo.GetAssetAssignment(ctx, req.EquipmentID, *req.ToEmployeeID)

		if err == nil {
			return s.Repo.UpdateAssetAssignmentQuantity(tx, targetAssignmentID, req.Quantity, "inc")
		}

		return s.Repo.CreateAssignment(tx, &models.AssignAssetRequest{
			EquipmentID: req.EquipmentID,
			EmployeeID:  *req.ToEmployeeID,
			AssignedBy:  req.AssignedBy,
			Quantity:    req.Quantity,
		})
	})
}
func (s *assetService) RemoveEquipment(ctx context.Context, req *models.RemoveAssignmentRequest) error {
	assignmentId, quantity, err := s.Repo.GetAssetAssignment(ctx, req.EquipmentID, req.EmployeeID)
	if err != nil {
		return errors.CustomErr(http.StatusInternalServerError, err.Error())
	}
	err = database.ExecuteTransaction(ctx, s.Db, func(tx *sqlx.Tx) error {
		if err := s.Repo.DeleteAssetAssignmentById(tx, assignmentId); err != nil {
			return errors.CustomErr(http.StatusInternalServerError, "failed to remove assignment "+err.Error())
		}
		if err := s.Repo.UpdateAssetQuantity(tx, req.EquipmentID, quantity, "inc"); err != nil {
			return errors.CustomErr(http.StatusInternalServerError, "failed to restored quantity "+err.Error())
		}
		return nil
	})
	return err
}

func (s *assetService) GetAllAssignedEquipment(ctx context.Context, filter models.QueryFilter) ([]models.AssignEquipmentResponse, int64, error) {

	if filter.Page < 1 {
		filter.Page = 1
	}

	if filter.PageSize > 100 {
		filter.PageSize = 100
	}

	return s.Repo.GetAllAssignedEquipment(ctx, filter)
}

func (s *assetService) GetAssignedEquipmentByEmployee(ctx context.Context, employeeID uuid.UUID, filter models.QueryFilter) ([]models.AssignEquipmentResponse, int64, error) {

	if filter.Page < 1 {
		filter.Page = 1
	}

	if filter.PageSize > 100 {
		filter.PageSize = 100
	}

	return s.Repo.GetAssignedEquipmentByEmployee(ctx, employeeID, filter)
}
