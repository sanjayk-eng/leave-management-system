package service

import (
	"context"
	"net/http"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/internal/repositories"
	"github.com/Zenithive/LeaveManagementSystem/pkg/audit"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/google/uuid"
)


type DesignationService interface {
	Create(ctx context.Context, input *models.DesignationInput, actorID uuid.UUID, actorName, actorRole string) (string, error)
	Get(ctx context.Context) ([]models.Designation, error)
	GetById(ctx context.Context, id uuid.UUID) (*models.Designation, error)
	Update(ctx context.Context, id uuid.UUID, input *models.DesignationInput, actorID uuid.UUID, actorName, actorRole string) error
	Delete(ctx context.Context, id uuid.UUID, actorID uuid.UUID, actorName, actorRole string) error
	AssignEmployee(ctx context.Context, designationID uuid.UUID, employeeID uuid.UUID, actorID uuid.UUID, actorName, actorRole string) (*models.DesignationAssignResult, error)
	RemoveEmployee(ctx context.Context, designationID uuid.UUID, employeeID uuid.UUID, actorID uuid.UUID, actorName, actorRole string) error
}

type designationService struct {
	Repo         repositories.DesignationRepository
	EmployeeRepo repositories.EmployeeRepository
	RoleRepo     repositories.RoleRepository
	HrbcService  Hrbc
	AuditSvc     audit.Service
}

func NewDesignationService(
	repo repositories.DesignationRepository,
	employeeRepo repositories.EmployeeRepository,
	roleRepo repositories.RoleRepository,
	hrbcService Hrbc,
	auditSvc audit.Service,
) DesignationService {
	return &designationService{
		Repo:         repo,
		EmployeeRepo: employeeRepo,
		RoleRepo:     roleRepo,
		HrbcService:  hrbcService,
		AuditSvc:     auditSvc,
	}
}


func (s *designationService) logAudit(actorID uuid.UUID, entry audit.AuditEntry) {
	if s.AuditSvc == nil || actorID == uuid.Nil {
		return
	}
	s.AuditSvc.Log(entry)
}


func (s *designationService) authorizeEmployeeMutation(actorRole string, targetRoleID int) error {
	actorRoleID, err := s.RoleRepo.GetRoleID(actorRole)
	if err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to resolve actor role")
	}
	return s.HrbcService.HasPriorityAllow(actorRoleID, targetRoleID)
}


func (s *designationService) Create(ctx context.Context, input *models.DesignationInput, actorID uuid.UUID, actorName, actorRole string) (string, error) {
	id, err := s.Repo.CreateDesignation(ctx, input)
	if err != nil {
		return "", errors.CustomErr(http.StatusInternalServerError, "failed to create designation: "+err.Error())
	}

	s.logAudit(actorID, audit.AuditEntry{
		ActorID:      actorID,
		ActorName:    actorName,
		ActorRole:    actorRole,
		Component:    "designation",
		Action:       "designation.created",
		ResourceType: "Designation",
		ResourceID:   id,
		ResourceName: input.DesignationName,
		NewValue: map[string]interface{}{
			"designation_name": input.DesignationName,
			"description":      input.Description,
		},
	})

	return id, nil
}

func (s *designationService) Get(ctx context.Context) ([]models.Designation, error) {
	designations, err := s.Repo.Get(ctx)
	if err != nil {
		return nil, errors.CustomErr(http.StatusInternalServerError, "failed to fetch designations: "+err.Error())
	}
	return designations, nil
}

func (s *designationService) GetById(ctx context.Context, id uuid.UUID) (*models.Designation, error) {
	designation, err := s.Repo.GetDesignationByID(ctx, id)
	if err != nil {
		return nil, errors.CustomErr(http.StatusNotFound, "designation not found")
	}
	return designation, nil
}

func (s *designationService) Update(ctx context.Context, id uuid.UUID, input *models.DesignationInput, actorID uuid.UUID, actorName, actorRole string) error {
	
	before, _ := s.Repo.GetDesignationByID(ctx, id)

	if err := s.Repo.UpdateDesignation(ctx, id, input); err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to update designation: "+err.Error())
	}

	entry := audit.AuditEntry{
		ActorID:      actorID,
		ActorName:    actorName,
		ActorRole:    actorRole,
		Component:    "designation",
		Action:       "designation.updated",
		ResourceType: "Designation",
		ResourceID:   id.String(),
		ResourceName: input.DesignationName,
		NewValue: map[string]interface{}{
			"designation_name": input.DesignationName,
			"description":      input.Description,
		},
	}
	if before != nil {
		entry.OldValue = map[string]interface{}{
			"designation_name": before.DesignationName,
			"description":      before.Description,
		}
	}
	s.logAudit(actorID, entry)

	return nil
}

func (s *designationService) Delete(ctx context.Context, id uuid.UUID, actorID uuid.UUID, actorName, actorRole string) error {
	before, _ := s.Repo.GetDesignationByID(ctx, id)

	if err := s.Repo.DeleteDesignation(ctx, id); err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to delete designation: "+err.Error())
	}

	resourceName := id.String()
	var oldValue interface{}
	if before != nil {
		resourceName = before.DesignationName
		oldValue = map[string]interface{}{
			"designation_name": before.DesignationName,
			"description":      before.Description,
		}
	}
	s.logAudit(actorID, audit.AuditEntry{
		ActorID:      actorID,
		ActorName:    actorName,
		ActorRole:    actorRole,
		Component:    "designation",
		Action:       "designation.deleted",
		ResourceType: "Designation",
		ResourceID:   id.String(),
		ResourceName: resourceName,
		OldValue:     oldValue,
	})

	return nil
}



func (s *designationService) AssignEmployee(ctx context.Context, designationID uuid.UUID, employeeID uuid.UUID, actorID uuid.UUID, actorName, actorRole string) (*models.DesignationAssignResult, error) {
	designation, err := s.Repo.GetDesignationByID(ctx, designationID)
	if err != nil {
		return nil, errors.CustomErr(http.StatusNotFound, "designation not found")
	}

	employee, err := s.EmployeeRepo.GetByID(employeeID)
	if err != nil {
		return nil, errors.CustomErr(http.StatusNotFound, "employee not found")
	}

	if err := s.authorizeEmployeeMutation(actorRole, employee.RoleID); err != nil {
		return nil, err
	}

	oldDesignationID := employee.DesignationID
	if oldDesignationID != nil && *oldDesignationID == designationID {
		return nil, errors.CustomErr(http.StatusBadRequest, "employee already has this designation")
	}

	if err := s.EmployeeRepo.UpdateDesignation(ctx, employeeID, &designationID); err != nil {
		return nil, errors.CustomErr(http.StatusInternalServerError, "failed to assign designation: "+err.Error())
	}

	var oldVal interface{}
	if oldDesignationID != nil {
		oldVal = map[string]interface{}{"designation_id": oldDesignationID.String()}
	}
	s.logAudit(actorID, audit.AuditEntry{
		ActorID:      actorID,
		ActorName:    actorName,
		ActorRole:    actorRole,
		Component:    "employee",
		Action:       "employee.designation_updated",
		ResourceType: "Employee",
		ResourceID:   employeeID.String(),
		ResourceName: employee.FullName,
		OldValue:     oldVal,
		NewValue: map[string]interface{}{
			"designation_id":   designationID.String(),
			"designation_name": designation.DesignationName,
		},
	})

	return &models.DesignationAssignResult{
		EmployeeID:      employeeID.String(),
		DesignationID:   designationID.String(),
		DesignationName: designation.DesignationName,
	}, nil
}

func (s *designationService) RemoveEmployee(ctx context.Context, designationID uuid.UUID, employeeID uuid.UUID, actorID uuid.UUID, actorName, actorRole string) error {
	designation, err := s.Repo.GetDesignationByID(ctx, designationID)
	if err != nil {
		return errors.CustomErr(http.StatusNotFound, "designation not found")
	}

	employee, err := s.EmployeeRepo.GetByID(employeeID)
	if err != nil {
		return errors.CustomErr(http.StatusNotFound, "employee not found")
	}

	if employee.DesignationID == nil || *employee.DesignationID != designationID {
		return errors.CustomErr(http.StatusBadRequest, "employee is not assigned to this designation")
	}

	if err := s.authorizeEmployeeMutation(actorRole, employee.RoleID); err != nil {
		return err
	}

	if err := s.EmployeeRepo.UpdateDesignation(ctx, employeeID, nil); err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to remove designation: "+err.Error())
	}

	s.logAudit(actorID, audit.AuditEntry{
		ActorID:      actorID,
		ActorName:    actorName,
		ActorRole:    actorRole,
		Component:    "employee",
		Action:       "employee.designation_updated",
		ResourceType: "Employee",
		ResourceID:   employeeID.String(),
		ResourceName: employee.FullName,
		OldValue: map[string]interface{}{
			"designation_id":   designationID.String(),
			"designation_name": designation.DesignationName,
		},
		NewValue: map[string]interface{}{
			"designation_id": nil,
		},
	})
	return nil
}