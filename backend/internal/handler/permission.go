package handler

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/pkg/audit"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/gin-gonic/gin"
)

func (h *HandlerFunc) GetRolePermissions(c *gin.Context) {

	targetRoleID, err := strconv.Atoi(c.Param("role_id"))
	if err != nil || targetRoleID <= 0 {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid role_id: must be a positive integer")
		return
	}

	callerRoleID, ok := c.Get("role_id")
	if !ok {
		errors.RespondWithError(c, http.StatusInternalServerError, "caller role_id missing from context")
		return
	}
	callerID, ok := callerRoleID.(int)
	if !ok {
		errors.RespondWithError(c, http.StatusInternalServerError, "caller role_id has unexpected type")
		return
	}

	resp, err := h.PermissionSvc.GetRolePermissions(c.Request.Context(), callerID, targetRoleID)
	if err != nil {
		errors.Error(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *HandlerFunc) UpdateRolePermissions(c *gin.Context) {

	targetRoleID, err := strconv.Atoi(c.Param("role_id"))
	if err != nil || targetRoleID <= 0 {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid role_id: must be a positive integer")
		return
	}

	callerRoleID, ok := c.Get("role_id")
	if !ok {
		errors.RespondWithError(c, http.StatusInternalServerError, "caller role_id missing from context")
		return
	}
	callerID, ok := callerRoleID.(int)
	if !ok {
		errors.RespondWithError(c, http.StatusInternalServerError, "caller role_id has unexpected type")
		return
	}

	var input models.TogglePermissionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid input: "+err.Error())
		return
	}
	if err := h.Validator.Struct(&input); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "validation error: "+err.Error())
		return
	}

	if err := h.PermissionSvc.TogglePermissions(c.Request.Context(), callerID, targetRoleID, &input); err != nil {
		errors.Error(c, err)
		return
	}

	// Audit — record which role's permissions were toggled.
	actor := h.resolveActorBestEffort(c)
	roleIDStr := strconv.Itoa(targetRoleID)
	h.AuditSvc.Log(audit.AuditEntry{
		ActorID:      actor.ID,
		ActorName:    actor.Name,
		ActorRole:    actor.Role,
		Component:    "permission",
		Action:       "permission.updated",
		ResourceType: "Role",
		ResourceID:   roleIDStr,
		ResourceName: fmt.Sprintf("Role #%d", targetRoleID),
		NewValue: map[string]interface{}{
			"target_role_id":    targetRoleID,
			"permissions_count": len(input.Permissions),
		},
	})

	c.JSON(http.StatusOK, gin.H{
		"message": "permissions updated successfully",
		"role_id": targetRoleID,
		"updated": len(input.Permissions),
	})
}
