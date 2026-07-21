package handler

import (
	"net/http"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ─────────────────────────────────────────────────────────────────────────────
// Designation CRUD
// ─────────────────────────────────────────────────────────────────────────────

// CreateDesignation - POST /api/designations
func (h *HandlerFunc) CreateDesignation(c *gin.Context) {
	actor, err := h.resolveActor(c)
	if err != nil {
		errors.RespondWithError(c, http.StatusForbidden, "Access Denied")
		return
	}

	var input models.DesignationInput
	if err := c.ShouldBindJSON(&input); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid input: "+err.Error())
		return
	}
	if err := h.Validator.Struct(input); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "validation failed: "+err.Error())
		return
	}

	// All business logic + audit lives in the service.
	id, err := h.DesignationService.Create(c.Request.Context(), &input, actor.ID, actor.Name, actor.Role)
	if err != nil {
		errors.Error(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":        "designation created successfully",
		"designation_id": id,
	})
}

// GetAllDesignations - GET /api/designations
func (h *HandlerFunc) GetAllDesignations(c *gin.Context) {
	designations, err := h.DesignationService.Get(c.Request.Context())
	if err != nil {
		errors.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message":      "designations fetched successfully",
		"designations": designations,
	})
}

// GetDesignationByID - GET /api/designations/:id
func (h *HandlerFunc) GetDesignationByID(c *gin.Context) {
	designationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid designation ID")
		return
	}
	designation, err := h.DesignationService.GetById(c.Request.Context(), designationID)
	if err != nil {
		errors.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message":     "designation fetched successfully",
		"designation": designation,
	})
}

// UpdateDesignation - PUT /api/designations/:id
func (h *HandlerFunc) UpdateDesignation(c *gin.Context) {
	actor, err := h.resolveActor(c)
	if err != nil {
		errors.RespondWithError(c, http.StatusForbidden, "Access Denied")
		return
	}

	designationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid designation ID")
		return
	}

	var input models.DesignationInput
	if err := c.ShouldBindJSON(&input); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid input: "+err.Error())
		return
	}
	if err := h.Validator.Struct(input); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "validation failed: "+err.Error())
		return
	}

	// All business logic + audit (before/after diff) lives in the service.
	if err := h.DesignationService.Update(c.Request.Context(), designationID, &input, actor.ID, actor.Name, actor.Role); err != nil {
		errors.Error(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":        "designation updated successfully",
		"designation_id": designationID,
	})
}

// DeleteDesignation - DELETE /api/designations/:id
func (h *HandlerFunc) DeleteDesignation(c *gin.Context) {
	actor, err := h.resolveActor(c)
	if err != nil {
		errors.RespondWithError(c, http.StatusForbidden, "Access Denied")
		return
	}

	designationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid designation ID: "+err.Error())
		return
	}

	// All business logic + audit (before snapshot + pure delete) lives in the service.
	if err := h.DesignationService.Delete(c.Request.Context(), designationID, actor.ID, actor.Name, actor.Role); err != nil {
		errors.Error(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "designation deleted successfully. Employee designation_id set to NULL.",
	})
}

// AssignEmployee - PATCH /api/designations/:id/assign-employee
//
// Assigns the designation (:id) to the employee supplied in the JSON body.
// Business logic + audit live entirely in DesignationService.AssignEmployee.
func (h *HandlerFunc) AssignEmployee(c *gin.Context) {
	actor, err := h.resolveActor(c)
	if err != nil {
		errors.RespondWithError(c, http.StatusForbidden, "Access Denied")
		return
	}

	designationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid designation ID")
		return
	}

	var input models.AssignDesignationInput
	if err := c.ShouldBindJSON(&input); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid input: "+err.Error())
		return
	}
	if err := h.Validator.Struct(input); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "validation failed: "+err.Error())
		return
	}

	employeeID, err := uuid.Parse(input.EmployeeID)
	if err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid employee_id")
		return
	}

	result, err := h.DesignationService.AssignEmployee(c.Request.Context(), designationID, employeeID, actor.ID, actor.Name, actor.Role)
	if err != nil {
		errors.Error(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":          "designation assigned to employee successfully",
		"employee_id":      result.EmployeeID,
		"designation_id":   result.DesignationID,
		"designation_name": result.DesignationName,
	})
}

// RemoveEmployee - DELETE /api/designations/:id/assign-employee/:employee_id
//
// Clears designation_id from the given employee (sets it to NULL).
func (h *HandlerFunc) RemoveEmployee(c *gin.Context) {
	actor, err := h.resolveActor(c)
	if err != nil {
		errors.RespondWithError(c, http.StatusForbidden, "Access Denied")
		return
	}

	designationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid designation ID")
		return
	}

	employeeID, err := uuid.Parse(c.Param("employee_id"))
	if err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid employee_id")
		return
	}

	if err := h.DesignationService.RemoveEmployee(c.Request.Context(), designationID, employeeID, actor.ID, actor.Name, actor.Role); err != nil {
		errors.Error(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "designation removed from employee successfully",
		"employee_id": employeeID,
	})
}
