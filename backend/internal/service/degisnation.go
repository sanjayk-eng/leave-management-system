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

// =====================================================
// SERVICE INTERFACE
// =====================================================

type DesignationService interface {
	Create(ctx context.Context, input *models.DesignationInput, actorID uuid.UUID, actorName, actorRole string) (string, error)
	Get(ctx context.Context) ([]models.Designation, error)
	GetById(ctx context.Context, id uuid.UUID) (*models.Designation, error)
	Update(ctx context.Context, id uuid.UUID, input *models.DesignationInput, actorID uuid.UUID, actorName, actorRole string) error
	Delete(ctx context.Context, id uuid.UUID, actorID uuid.UUID, actorName, actorRole string) error
	// AssignEmployee assigns or removes a designation from an employee.
	// Pass employeeID and a non-nil designationID to assign, nil to remove.
	AssignEmployee(ctx context.Context, designationID uuid.UUID, employeeID uuid.UUID, actorID uuid.UUID, actorName, actorRole string) (*models.DesignationAssignResult, error)
	// RemoveEmployee clears designation_id from an employee (sets it to NULL).
	RemoveEmployee(ctx context.Context, designationID uuid.UUID, employeeID uuid.UUID, actorID uuid.UUID, actorName, actorRole string) error
}

// =====================================================
// SERVICE STRUCT
// =====================================================

type designationService struct {
	Repo        repositories.DesignationRepository
	EmployeeRepo repositories.EmployeeRepository
	AuditSvc    audit.Service // nil-safe: audit skipped if not wired
}

// NewDesignationService constructs the service.
// Pass employeeRepo so AssignEmployee can update Tbl_Employee.designation_id.
func NewDesignationService(
	repo repositories.DesignationRepository,
	employeeRepo repositories.EmployeeRepository,
	auditSvc audit.Service,
) DesignationService {
	return &designationService{
		Repo:        repo,
		EmployeeRepo: employeeRepo,
		AuditSvc:    auditSvc,
	}
}

// =====================================================
// CREATE
// =====================================================

func (s *designationService) Create(ctx context.Context, input *models.DesignationInput, actorID uuid.UUID, actorName, actorRole string) (string, error) {
	id, err := s.Repo.CreateDesignation(ctx, input)
	if err != nil {
		return "", errors.CustomErr(http.StatusInternalServerError, "failed to create designation: "+err.Error())
	}

	// Audit — async, after insert. Pure create: OldValue is nil.
	if s.AuditSvc != nil && actorID != uuid.Nil {
		s.AuditSvc.Log(audit.AuditEntry{
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
	}

	return id, nil
}

// =====================================================
// GET ALL
// =====================================================

func (s *designationService) Get(ctx context.Context) ([]models.Designation, error) {
	designations, err := s.Repo.Get(ctx)
	if err != nil {
		return nil, errors.CustomErr(http.StatusInternalServerError, "failed to fetch designations: "+err.Error())
	}
	return designations, nil
}

// =====================================================
// GET BY ID
// =====================================================

func (s *designationService) GetById(ctx context.Context, id uuid.UUID) (*models.Designation, error) {
	designation, err := s.Repo.GetDesignationByID(ctx, id)
	if err != nil {
		return nil, errors.CustomErr(http.StatusNotFound, "designation not found")
	}
	return designation, nil
}

// =====================================================
// UPDATE
// =====================================================

func (s *designationService) Update(ctx context.Context, id uuid.UUID, input *models.DesignationInput, actorID uuid.UUID, actorName, actorRole string) error {
	// Fetch BEFORE snapshot for the audit diff.
	var before *models.Designation
	if s.AuditSvc != nil && actorID != uuid.Nil {
		before, _ = s.Repo.GetDesignationByID(ctx, id) // best-effort
	}

	if err := s.Repo.UpdateDesignation(ctx, id, input); err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to update designation: "+err.Error())
	}

	// Audit — async, after update.
	if s.AuditSvc != nil && actorID != uuid.Nil {
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
		s.AuditSvc.Log(entry)
	}

	return nil
}

// =====================================================
// DELETE
// =====================================================

func (s *designationService) Delete(ctx context.Context, id uuid.UUID, actorID uuid.UUID, actorName, actorRole string) error {
	// Fetch BEFORE snapshot so the audit record is useful even after deletion.
	var before *models.Designation
	if s.AuditSvc != nil && actorID != uuid.Nil {
		before, _ = s.Repo.GetDesignationByID(ctx, id) // best-effort
	}

	if err := s.Repo.DeleteDesignation(ctx, id); err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to delete designation: "+err.Error())
	}

	// Audit — async, after delete. NewValue is nil (resource gone).
	if s.AuditSvc != nil && actorID != uuid.Nil {
		resourceName := id.String()
		var oldValue interface{}
		if before != nil {
			resourceName = before.DesignationName
			oldValue = map[string]interface{}{
				"designation_name": before.DesignationName,
				"description":      before.Description,
			}
		}
		s.AuditSvc.Log(audit.AuditEntry{
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
	}

	return nil
}

// =====================================================
// ASSIGN EMPLOYEE
// =====================================================

// AssignEmployee sets employee.designation_id = designationID.
// The designation ID comes from the route param (:id on /api/designations/:id/assign-employee).
// The employee ID comes from the JSON body.
//
// To REMOVE a designation from an employee, use the separate
// DELETE /api/designations/:id/assign-employee/:employee_id endpoint which
// calls this with a sentinel that is handled by the handler (passes uuid.Nil logic).
func (s *designationService) AssignEmployee(
	ctx context.Context,
	designationID uuid.UUID,
	employeeID uuid.UUID,
	actorID uuid.UUID,
	actorName, actorRole string,
) (*models.DesignationAssignResult, error) {

	// Confirm the designation exists.
	designation, err := s.Repo.GetDesignationByID(ctx, designationID)
	if err != nil {
		return nil, errors.CustomErr(http.StatusNotFound, "designation not found")
	}

	// Confirm the employee exists and get their name for the audit entry.
	employee, err := s.EmployeeRepo.GetByID(employeeID)
	if err != nil {
		return nil, errors.CustomErr(http.StatusNotFound, "employee not found")
	}

	// Capture old designation for diff (best-effort).
	oldDesignationID := employee.DesignationID

	desigPtr := &designationID
	if err := s.EmployeeRepo.UpdateDesignation(ctx, employeeID, desigPtr); err != nil {
		return nil, errors.CustomErr(http.StatusInternalServerError, "failed to assign designation: "+err.Error())
	}

	// Audit — async, after update.
	if s.AuditSvc != nil && actorID != uuid.Nil {
		newVal := map[string]interface{}{
			"designation_id":   designationID.String(),
			"designation_name": designation.DesignationName,
		}
		var oldVal interface{}
		if oldDesignationID != nil {
			oldVal = map[string]interface{}{
				"designation_id": oldDesignationID.String(),
			}
		}
		s.AuditSvc.Log(audit.AuditEntry{
			ActorID:      actorID,
			ActorName:    actorName,
			ActorRole:    actorRole,
			Component:    "employee",
			Action:       "employee.designation_updated",
			ResourceType: "Employee",
			ResourceID:   employeeID.String(),
			ResourceName: employee.FullName,
			OldValue:     oldVal,
			NewValue:     newVal,
		})
	}

	return &models.DesignationAssignResult{
		EmployeeID:      employeeID.String(),
		DesignationID:   designationID.String(),
		DesignationName: designation.DesignationName,
	}, nil
}

// =====================================================
// REMOVE EMPLOYEE FROM DESIGNATION
// =====================================================

// RemoveEmployee sets employee.designation_id = NULL.
// Route: DELETE /api/designations/:id/assign-employee/:employee_id
func (s *designationService) RemoveEmployee(
	ctx context.Context,
	designationID uuid.UUID,
	employeeID uuid.UUID,
	actorID uuid.UUID,
	actorName, actorRole string,
) error {
	// Confirm designation exists (so we can use its name in the audit entry).
	designation, err := s.Repo.GetDesignationByID(ctx, designationID)
	if err != nil {
		return errors.CustomErr(http.StatusNotFound, "designation not found")
	}

	// Confirm employee exists and capture current designation for diff.
	employee, err := s.EmployeeRepo.GetByID(employeeID)
	if err != nil {
		return errors.CustomErr(http.StatusNotFound, "employee not found")
	}

	if err := s.EmployeeRepo.UpdateDesignation(ctx, employeeID, nil); err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to remove designation: "+err.Error())
	}

	// Audit — async, after update.
	if s.AuditSvc != nil && actorID != uuid.Nil {
		s.AuditSvc.Log(audit.AuditEntry{
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
	}

	return nil
}
