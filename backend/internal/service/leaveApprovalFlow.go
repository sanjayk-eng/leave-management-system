package service

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/internal/repositories"
	"github.com/Zenithive/LeaveManagementSystem/pkg/audit"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// =====================================================
// SERVICE INTERFACE
// =====================================================

type LeaveApprovalFlowService interface {
	CreateLeaveApproverFlow(ctx context.Context, req *models.LeaveApprovalFlowRequest, actorID uuid.UUID, actorName, actorRole string) error
	GetLeaveApprovalFlowById(ctx context.Context, id string) (*models.LeaveApprovalFlowResponse, error)
	GetAllLeaveApprovalFlows(ctx context.Context) ([]models.LeaveApprovalFlowResponse, error)
	UpdateLeaveApprovelFlow(ctx context.Context, id string, req *models.LeaveApprovalFlowRequest, actorID uuid.UUID, actorName, actorRole string) error
	DeleteLeaveApprovelFlow(ctx context.Context, id string, actorID uuid.UUID, actorName, actorRole string) error
	GetDefaultFlowID(ctx context.Context) (string, error)
}

// =====================================================
// SERVICE STRUCT
// =====================================================

type leaveApprovalFlowService struct {
	DB       *sqlx.DB
	Repo     repositories.LeaveApprovalFlowRepository
	AuditSvc audit.Service // nil-safe: audit skipped if not wired
}

// constructor
func NewLeaveApprovalFlowService(db *sqlx.DB, repo repositories.LeaveApprovalFlowRepository, auditSvc audit.Service) LeaveApprovalFlowService {
	return &leaveApprovalFlowService{
		DB:       db,
		Repo:     repo,
		AuditSvc: auditSvc,
	}
}

// =====================================================
// CREATE
// =====================================================

func (s *leaveApprovalFlowService) CreateLeaveApproverFlow(ctx context.Context, req *models.LeaveApprovalFlowRequest, actorID uuid.UUID, actorName, actorRole string) error {
	if err := s.AllowToCreateLeaveApprovelFlow(req); err != nil {
		return err
	}
	if err := s.Repo.InsertFlow(ctx, req); err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to insert approval flow")
	}

	// Audit — async, after insert succeeds. Pure create: OldValue is nil.
	if s.AuditSvc != nil && actorID != uuid.Nil {
		s.AuditSvc.Log(audit.AuditEntry{
			ActorID:      actorID,
			ActorName:    actorName,
			ActorRole:    actorRole,
			Component:    "leave_approval_flow",
			Action:       "leave_approval_flow.created",
			ResourceType: "LeaveApprovalFlow",
			ResourceID:   req.Name, // no returned ID from InsertFlow — use name as stable identifier
			ResourceName: req.Name,
			NewValue: map[string]interface{}{
				"name": req.Name,
				"flow": req.Flow,
			},
		})
	}
	return nil
}

// =====================================================
// GET ALL
// =====================================================

func (s *leaveApprovalFlowService) GetAllLeaveApprovalFlows(ctx context.Context) ([]models.LeaveApprovalFlowResponse, error) {
	flows, err := s.Repo.GetAllFlows(ctx)
	if err != nil {
		return nil, errors.CustomErr(http.StatusInternalServerError, "failed to get approval flows")
	}

	var response []models.LeaveApprovalFlowResponse
	for _, flow := range flows {
		var stages []models.ApprovalStage
		if err := json.Unmarshal(flow.Flow, &stages); err != nil {
			return nil, errors.CustomErr(http.StatusInternalServerError, "invalid flow data")
		}
		response = append(response, models.LeaveApprovalFlowResponse{
			ID:       flow.ID,
			Name:     flow.Name,
			IsSystem: flow.IsSystem,
			Flow:     stages,
		})
	}
	return response, nil
}

// =====================================================
// GET BY ID
// =====================================================

func (s *leaveApprovalFlowService) GetLeaveApprovalFlowById(ctx context.Context, id string) (*models.LeaveApprovalFlowResponse, error) {
	flow, err := s.Repo.GetById(ctx, id)
	if err != nil {
		return nil, errors.CustomErr(http.StatusInternalServerError, "failed to get approval flow")
	}

	var stages []models.ApprovalStage
	if err := json.Unmarshal(flow.Flow, &stages); err != nil {
		return nil, errors.CustomErr(http.StatusInternalServerError, "invalid flow data")
	}

	return &models.LeaveApprovalFlowResponse{
		ID:       flow.ID,
		Name:     flow.Name,
		IsSystem: flow.IsSystem,
		Flow:     stages,
	}, nil
}

// =====================================================
// UPDATE
// =====================================================

func (s *leaveApprovalFlowService) UpdateLeaveApprovelFlow(ctx context.Context, id string, req *models.LeaveApprovalFlowRequest, actorID uuid.UUID, actorName, actorRole string) error {
	if err := s.AllowToCreateLeaveApprovelFlow(req); err != nil {
		return err
	}

	// Fetch BEFORE snapshot for the diff
	var before *models.LeaveApprovalFlowResponse
	if s.AuditSvc != nil && actorID != uuid.Nil {
		before, _ = s.GetLeaveApprovalFlowById(ctx, id) // best-effort
	}

	if err := s.Repo.UpdateLeaveApprovelFlow(ctx, id, req); err != nil {
		return errors.CustomErr(http.StatusInternalServerError, err.Error())
	}

	// Audit — async, after update succeeds.
	if s.AuditSvc != nil && actorID != uuid.Nil {
		entry := audit.AuditEntry{
			ActorID:      actorID,
			ActorName:    actorName,
			ActorRole:    actorRole,
			Component:    "leave_approval_flow",
			Action:       "leave_approval_flow.updated",
			ResourceType: "LeaveApprovalFlow",
			ResourceID:   id,
			ResourceName: req.Name,
			NewValue: map[string]interface{}{
				"name": req.Name,
				"flow": req.Flow,
			},
		}
		if before != nil {
			entry.OldValue = map[string]interface{}{
				"name": before.Name,
				"flow": before.Flow,
			}
		}
		s.AuditSvc.Log(entry)
	}
	return nil
}

// =====================================================
// DELETE
// =====================================================

func (s *leaveApprovalFlowService) DeleteLeaveApprovelFlow(ctx context.Context, id string, actorID uuid.UUID, actorName, actorRole string) error {
	// Fetch BEFORE snapshot (name for resource label + flow for diff)
	var before *models.LeaveApprovalFlowResponse
	if s.AuditSvc != nil && actorID != uuid.Nil {
		before, _ = s.GetLeaveApprovalFlowById(ctx, id) // best-effort
	}

	if err := s.Repo.DeleteLeaveApprovelFlow(ctx, id); err != nil {
		return errors.CustomErr(http.StatusInternalServerError, err.Error())
	}

	// Audit — async, after delete succeeds. NewValue is nil (resource gone).
	if s.AuditSvc != nil && actorID != uuid.Nil {
		resourceName := id
		var oldValue interface{}
		if before != nil {
			resourceName = before.Name
			oldValue = map[string]interface{}{
				"name": before.Name,
				"flow": before.Flow,
			}
		}
		s.AuditSvc.Log(audit.AuditEntry{
			ActorID:      actorID,
			ActorName:    actorName,
			ActorRole:    actorRole,
			Component:    "leave_approval_flow",
			Action:       "leave_approval_flow.deleted",
			ResourceType: "LeaveApprovalFlow",
			ResourceID:   id,
			ResourceName: resourceName,
			OldValue:     oldValue,
		})
	}
	return nil
}

// =====================================================
// VALIDATION
// =====================================================

func (s *leaveApprovalFlowService) AllowToCreateLeaveApprovelFlow(req *models.LeaveApprovalFlowRequest) error {
	if req == nil {
		return errors.CustomErr(http.StatusBadRequest, "request is nil")
	}
	if len(req.Flow) == 0 {
		return errors.CustomErr(http.StatusBadRequest, "approval flow cannot be empty")
	}

	roleStages := make(map[models.ApproverRole]int)
	validRoles := map[models.ApproverRole]struct{}{
		models.ApproverManager:    {},
		models.ApproverHR:         {},
		models.ApproverAdmin:      {},
		models.ApproverSuperAdmin: {},
	}

	for _, stage := range req.Flow {
		role := models.ApproverRole(stage.ApproverRole)
		if _, ok := validRoles[role]; !ok {
			return errors.CustomErr(http.StatusBadRequest, fmt.Sprintf("invalid approver role: %s", stage.ApproverRole))
		}
		if _, exists := roleStages[role]; exists {
			return errors.CustomErr(http.StatusBadRequest, fmt.Sprintf("approver role %s already exists", stage.ApproverRole))
		}
		if stage.StageNo <= 0 {
			return errors.CustomErr(http.StatusBadRequest, fmt.Sprintf("invalid stage number: %d", stage.StageNo))
		}
		roleStages[role] = stage.StageNo
	}

	hierarchy := []models.ApproverRole{
		models.ApproverManager,
		models.ApproverHR,
		models.ApproverAdmin,
		models.ApproverSuperAdmin,
	}

	for i := 0; i < len(hierarchy)-1; i++ {
		currentRole := hierarchy[i]
		currentStage, exists := roleStages[currentRole]
		if !exists {
			continue
		}
		for j := i + 1; j < len(hierarchy); j++ {
			nextRole := hierarchy[j]
			nextStage, nextExists := roleStages[nextRole]
			if !nextExists {
				continue
			}
			if currentStage > nextStage {
				return errors.CustomErr(http.StatusBadRequest, fmt.Sprintf("%s cannot be after %s", currentRole, nextRole))
			}
		}
	}
	return nil
}

// =====================================================
// DEFAULT FLOW
// =====================================================

func (s *leaveApprovalFlowService) GetDefaultFlowID(ctx context.Context) (string, error) {
	id, err := s.Repo.GetDefaultFlowID(ctx)
	if err != nil {
		return "", errors.CustomErr(http.StatusNotFound, "default leave approval flow not found")
	}
	return id, nil
}
