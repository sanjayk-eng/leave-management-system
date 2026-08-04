package service

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/Zenithive/LeaveManagementSystem/internal/config/database"
	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/internal/repositories"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/jmoiron/sqlx"
)

// LeaveTypeService provides business-logic operations for leave types.

type LeavePolicyService interface {
	Create(ctx context.Context, input *models.LeaveTypeInput) (*models.LeaveType, error)
	GetByID(ctx context.Context, leaveTypeID int) (*models.LeaveTypeResponse, error)
	Get(ctx context.Context, status repositories.PolicyStatusFilter) (*[]models.LeaveTypeResponse, error)
	Update(ctx context.Context, leaveTypeID int, input *models.LeaveTypeInput) (*models.LeaveType, error)
	Delete(ctx context.Context, leaveTypeID int) error
	Toggle(ctx context.Context, leaveTypeID int) (bool, error)
}

type LeavePolicy struct {
	DB                   *sqlx.DB
	LeaveApporverService LeaveApprovalFlowService
	LeaveBalanceService  LeaveBalance
	LeavePolicyRepo      repositories.LeavePolicyRepository
	CommRepo             *repositories.Repository
}

func NewLeavePolicy(db *sqlx.DB, leaveApporverService LeaveApprovalFlowService, leaveBalanceService LeaveBalance, leavePolicyRepo repositories.LeavePolicyRepository, commRepo *repositories.Repository) LeavePolicyService {
	return &LeavePolicy{
		DB:                   db,
		LeaveApporverService: leaveApporverService,
		LeavePolicyRepo:      leavePolicyRepo,
		CommRepo:             commRepo,
		LeaveBalanceService:  leaveBalanceService,
	}
}

type LeaveTypeService struct {
	repo *repositories.Repository
}

// NewLeaveTypeService creates a new LeaveTypeService.
func NewLeaveTypeService(repo *repositories.Repository) *LeaveTypeService {
	return &LeaveTypeService{repo: repo}
}

func (s *LeavePolicy) Create(ctx context.Context, input *models.LeaveTypeInput) (*models.LeaveType, error) {

	var res *models.LeaveType
	var err error

	// 1. Normalize input
	if err := s.NormalizeLeaveTypeInput(ctx, input); err != nil {
		return nil, err
	}

	// 2. Build the proration anchor date.
	// If the admin selected a specific month in the preview, use the 1st of that
	// month in the current year. Otherwise fall back to today.
	now := time.Now()
	asOf := now
	if input.AssociateMonth != nil && *input.AssociateMonth >= 1 && *input.AssociateMonth <= 12 {
		asOf = time.Date(now.Year(), time.Month(*input.AssociateMonth), 1, 0, 0, 0, 0, now.Location())
	}

	// 3. Transaction wrapper
	err = database.ExecuteTransaction(ctx, s.DB, func(tx *sqlx.Tx) error {

		// 4. Insert leave type
		res, err = s.LeavePolicyRepo.Create(ctx, tx, input)
		if err != nil {
			return errors.CustomErr(http.StatusInternalServerError, "failed to create leave type")
		}

		// Populate display fields not returned by RETURNING clause
		res.Name = input.Name
		res.IsPaid = *input.IsPaid
		res.DefaultEntitlement = *input.DefaultEntitlement
		res.InternEntitlement = input.InternEntitlement

		// 5. Bulk allocation using the selected associate month (inside transaction)
		if !*input.IsEarly {
			s.LeaveBalanceService.AllocateForNewLeaveType(tx, res.ID, res.DefaultEntitlement, res.InternEntitlement, asOf)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return res, nil
}

func (s *LeavePolicy) GetByID(ctx context.Context, leaveTypeID int) (*models.LeaveTypeResponse, error) {

	leaveType, err := s.LeavePolicyRepo.GetById(ctx, strconv.Itoa(leaveTypeID))
	if err != nil {
		return nil, errors.CustomErr(http.StatusInternalServerError, "failed to get leave policy")
	}

	// No approval flow assigned — return leave type with nil flow
	if leaveType.ApprovalFlowID == nil || *leaveType.ApprovalFlowID == "" {
		return models.MappPayload(leaveType, nil), nil
	}

	// Fetch the approval flow using its own UUID (not the leave type ID)
	leaveApproverFlow, err := s.LeaveApporverService.GetLeaveApprovalFlowById(ctx, *leaveType.ApprovalFlowID)
	if err != nil {
		return nil, errors.CustomErr(http.StatusInternalServerError, "failed to load Leave Approvel flow")
	}

	return models.MappPayload(leaveType, leaveApproverFlow), nil
}

func (s *LeavePolicy) Get(ctx context.Context, status repositories.PolicyStatusFilter) (*[]models.LeaveTypeResponse, error) {

	leaveType, err := s.LeavePolicyRepo.Get(ctx, status)
	if err != nil {

		return nil, errors.CustomErr(http.StatusInternalServerError, "failed to get leave policy")
	}
	leaveApproverFlow, err := s.LeaveApporverService.GetAllLeaveApprovalFlows(ctx)
	if err != nil {
		return nil, errors.CustomErr(http.StatusInternalServerError, "failed to load Leave Approvel flow")
	}

	// Build a lookup map for O(1) flow matching by ID
	flowMap := make(map[string]models.LeaveApprovalFlowResponse, len(leaveApproverFlow))
	for _, f := range leaveApproverFlow {
		flowMap[f.ID] = f
	}

	var res []models.LeaveTypeResponse

	for _, l := range *leaveType {
		lCopy := l // avoid loop-variable aliasing
		if lCopy.ApprovalFlowID != nil && *lCopy.ApprovalFlowID != "" {
			if flow, ok := flowMap[*lCopy.ApprovalFlowID]; ok {
				res = append(res, *models.MappPayload(&lCopy, &flow))
				continue
			}
		}
		// Leave type has no approval flow — still include it with a nil flow
		res = append(res, models.LeaveTypeResponse{
			ID:                 lCopy.ID,
			Name:               lCopy.Name,
			IsPaid:             lCopy.IsPaid,
			DefaultEntitlement: lCopy.DefaultEntitlement,
			InternEntitlement:  lCopy.InternEntitlement,
			IsEarly:            lCopy.IsEarly,
			IsWorkFromHome:     lCopy.IsWorkFromHome,
			IsActive:           lCopy.IsActive,
			ApprovalFlowID:     lCopy.ApprovalFlowID,
			AssociateMonth:     lCopy.AssociateMonth,
			CreatedAt:          lCopy.CreatedAt,
			UpdatedAt:          lCopy.UpdatedAt,
			ApprovalFlow:       nil,
		})
	}
	return &res, err
}

func (s *LeavePolicy) Update(ctx context.Context, leaveTypeID int, input *models.LeaveTypeInput) (*models.LeaveType, error) {
	// Normalize input
	if err := s.NormalizeLeaveTypeInput(ctx, input); err != nil {
		return nil, err
	}

	oldLeaveType, err := s.LeavePolicyRepo.GetById(ctx, strconv.Itoa(leaveTypeID))
	if err != nil {
		return nil, errors.CustomErr(http.StatusBadRequest, err.Error())
	}

	// associate_month is locked after creation — ignore whatever the client sends.
	// Changing the anchor mid-year would cause deficits for employees who already
	// consumed leaves under the original anchor (used stays, opening shrinks → negative closing).
	// The stored value is always used as-is; the SQL UPDATE uses COALESCE($9, associate_month)
	// so nil here means "keep the existing column value".
	input.AssociateMonth = nil

	// Resolve the proration anchor for balance recalculation using the stored month only.
	// Falls back to time.Now() for legacy policies that have no associate_month stored.
	var policyAsOf *time.Time
	if oldLeaveType.AssociateMonth != nil {
		now := time.Now()
		t := time.Date(now.Year(), time.Month(*oldLeaveType.AssociateMonth), 1, 0, 0, 0, 0, now.Location())
		policyAsOf = &t
	}

	var res *models.LeaveType

	err = database.ExecuteTransaction(ctx, s.DB, func(tx *sqlx.Tx) error {

		res, err = s.LeavePolicyRepo.Update(ctx, tx, strconv.Itoa(leaveTypeID), input)
		if err != nil {
			return errors.CustomErr(http.StatusInternalServerError, "failed to update leave policy")
		}

		isEarly := oldLeaveType.IsEarly != nil && *oldLeaveType.IsEarly
		if !isEarly {
			if err := s.LeaveBalanceService.SyncLeaveBalances(tx, leaveTypeID, *input.DefaultEntitlement, input.InternEntitlement, policyAsOf); err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return res, nil
}

func (s *LeavePolicy) Delete(ctx context.Context, leaveTypeID int) error {
	err := database.ExecuteTransaction(ctx, s.DB, func(tx *sqlx.Tx) error {
		if err := s.LeavePolicyRepo.Delete(tx, leaveTypeID); err != nil {
			return errors.CustomErr(http.StatusInternalServerError, err.Error())
		}
		return nil
	})
	return err
}

// Toggle flips is_active for a leave policy. Returns the new active state.
func (s *LeavePolicy) Toggle(ctx context.Context, leaveTypeID int) (bool, error) {
	var newState bool
	err := database.ExecuteTransaction(ctx, s.DB, func(tx *sqlx.Tx) error {
		var err error
		newState, err = s.LeavePolicyRepo.Toggle(ctx, tx, leaveTypeID)
		if err != nil {
			return errors.CustomErr(http.StatusInternalServerError, "failed to toggle leave policy")
		}
		return nil
	})
	return newState, err
}

func (s *LeavePolicy) NormalizeLeaveTypeInput(ctx context.Context, input *models.LeaveTypeInput) error {
	if input.IsPaid == nil {
		v := false
		input.IsPaid = &v
	}

	if input.DefaultEntitlement == nil {
		v := 0
		input.DefaultEntitlement = &v
	}

	if input.LeaveCount == nil {
		v := 2
		input.LeaveCount = &v
	}

	if input.IsEarly == nil {
		v := false
		input.IsEarly = &v
	}

	if input.IsWorkFromHome == nil {
		v := false
		input.IsWorkFromHome = &v
	}
	if input.ApprovalFlowID == nil {
		v, err := s.LeaveApporverService.GetDefaultFlowID(ctx)
		if err != nil {
			return err
		}
		input.ApprovalFlowID = &v
	}
	if *input.DefaultEntitlement < 0 {
		return fmt.Errorf("default entitlement cannot be negative")
	}

	return nil
}
