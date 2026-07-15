package handler

import (
	"net/http"

	"github.com/Zenithive/LeaveManagementSystem/internal/config/database"
	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/pkg/accessrole"
	"github.com/Zenithive/LeaveManagementSystem/pkg/audit"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// ─────────────────────────────────────────────────────────────────────────────
// Designation CRUD
// ─────────────────────────────────────────────────────────────────────────────

// CreateDesignation - POST /api/designations
func (h *HandlerFunc) CreateDesignation(c *gin.Context) {
	// ── WHO ──────────────────────────────────────────────────────────────────
	actor, err := h.resolveActor(c)
	if err != nil {
		errors.RespondWithError(c, http.StatusForbidden, "Access Denied")
		return
	}

	// ── Input ─────────────────────────────────────────────────────────────────
	var input models.DesignationInput
	if err := c.ShouldBindJSON(&input); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid input: "+err.Error())
		return
	}
	if err := h.Validator.Struct(input); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "validation failed: "+err.Error())
		return
	}

	// ── Persist (DB work only inside tx) ──────────────────────────────────────
	var designationID string
	err = database.ExecuteTransaction(c, h.Query.DB, func(tx *sqlx.Tx) error {
		designationID, err = h.Query.CreateDesignation(tx, &input)
		if err != nil {
			return errors.CustomErr(http.StatusInternalServerError, "failed to create designation: "+err.Error())
		}
		return nil
	})
	if err != nil {
		errors.RespondWithError(c, http.StatusInternalServerError, err.Error())
		return
	}

	// ── Audit (async, after tx commits) ───────────────────────────────────────
	// Pure create — OldValue is intentionally nil.
	h.AuditSvc.Log(audit.AuditEntry{
		ActorID:      actor.ID,
		ActorName:    actor.Name,
		ActorRole:    actor.Role,
		Component:    "designation",
		Action:       "designation.created",
		ResourceType: "Designation",
		ResourceID:   designationID,
		ResourceName: input.DesignationName,
		NewValue: map[string]interface{}{
			"designation_name": input.DesignationName,
			"description":      input.Description,
		},
	})

	c.JSON(http.StatusCreated, gin.H{
		"message":        "designation created successfully",
		"designation_id": designationID,
	})
}

// GetAllDesignations - GET /api/designations
func (h *HandlerFunc) GetAllDesignations(c *gin.Context) {
	designations, err := h.Query.GetAllDesignations()
	if err != nil {
		errors.RespondWithError(c, http.StatusInternalServerError, "failed to fetch designations: "+err.Error())
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
	designation, err := h.Query.GetDesignationByID(designationID)
	if err != nil {
		errors.RespondWithError(c, http.StatusNotFound, "designation not found")
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message":     "designation fetched successfully",
		"designation": designation,
	})
}

// UpdateDesignation - PATCH /api/designations/:id
func (h *HandlerFunc) UpdateDesignation(c *gin.Context) {
	// ── WHO ──────────────────────────────────────────────────────────────────
	role := c.GetString("role")
	if err := accessrole.Admin_SuperAdmin_Hr(role, "only ADMIN, SUPERADMIN, and HR can update designations"); err != nil {
		errors.RespondWithError(c, http.StatusForbidden, err.Error())
		return
	}
	actor, err := h.resolveActor(c)
	if err != nil {
		errors.RespondWithError(c, http.StatusForbidden, "Access Denied")
		return
	}

	// ── ON WHAT ───────────────────────────────────────────────────────────────
	designationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid designation ID")
		return
	}

	// Fetch the BEFORE snapshot for the diff.
	before, err := h.Query.GetDesignationByID(designationID)
	if err != nil {
		errors.RespondWithError(c, http.StatusNotFound, "designation not found")
		return
	}

	// ── Input ─────────────────────────────────────────────────────────────────
	var input models.DesignationInput
	if err := c.ShouldBindJSON(&input); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid input: "+err.Error())
		return
	}
	if err := h.Validator.Struct(input); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "validation failed: "+err.Error())
		return
	}

	// ── Persist ───────────────────────────────────────────────────────────────
	err = database.ExecuteTransaction(c, h.Query.DB, func(tx *sqlx.Tx) error {
		return h.Query.UpdateDesignation(tx, designationID, &input)
	})
	if err != nil {
		errors.RespondWithError(c, http.StatusInternalServerError, "failed to update designation: "+err.Error())
		return
	}

	// ── Audit (async) — full before/after diff ────────────────────────────────
	h.AuditSvc.Log(audit.AuditEntry{
		ActorID:      actor.ID,
		ActorName:    actor.Name,
		ActorRole:    actor.Role,
		Component:    "designation",
		Action:       "designation.updated",
		ResourceType: "Designation",
		ResourceID:   designationID.String(),
		ResourceName: input.DesignationName,
		OldValue: map[string]interface{}{
			"designation_name": before.DesignationName,
			"description":      before.Description,
		},
		NewValue: map[string]interface{}{
			"designation_name": input.DesignationName,
			"description":      input.Description,
		},
	})

	c.JSON(http.StatusOK, gin.H{
		"message":        "designation updated successfully",
		"designation_id": designationID,
	})
}

// DeleteDesignation - DELETE /api/designations/:id
func (h *HandlerFunc) DeleteDesignation(c *gin.Context) {
	// ── WHO ──────────────────────────────────────────────────────────────────
	actor, err := h.resolveActor(c)
	if err != nil {
		errors.RespondWithError(c, http.StatusForbidden, "Access Denied")
		return
	}

	// ── ON WHAT ───────────────────────────────────────────────────────────────
	designationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid designation ID: "+err.Error())
		return
	}

	// Fetch BEFORE snapshot so the audit record is useful even after deletion.
	before, err := h.Query.GetDesignationByID(designationID)
	if err != nil {
		errors.RespondWithError(c, http.StatusNotFound, "designation not found")
		return
	}

	// ── Persist ───────────────────────────────────────────────────────────────
	err = database.ExecuteTransaction(c, h.Query.DB, func(tx *sqlx.Tx) error {
		return h.Query.DeleteDesignation(tx, designationID)
	})
	if err != nil {
		errors.RespondWithError(c, http.StatusInternalServerError, "failed to delete designation: "+err.Error())
		return
	}

	// ── Audit (async) — pure delete, NewValue is nil ──────────────────────────
	h.AuditSvc.Log(audit.AuditEntry{
		ActorID:      actor.ID,
		ActorName:    actor.Name,
		ActorRole:    actor.Role,
		Component:    "designation",
		Action:       "designation.deleted",
		ResourceType: "Designation",
		ResourceID:   designationID.String(),
		ResourceName: before.DesignationName,
		OldValue: map[string]interface{}{
			"designation_name": before.DesignationName,
			"description":      before.Description,
		},
		// NewValue intentionally nil — resource no longer exists.
	})

	c.JSON(http.StatusOK, gin.H{
		"message": "designation deleted successfully. Employee designation_id set to NULL.",
	})
}
