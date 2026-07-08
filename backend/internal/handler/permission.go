package handler

import (
	"net/http"
	"strconv"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/gin-gonic/gin"
)

func (h *HandlerFunc) GetRolePermissions(c *gin.Context) {

	roleID, err := strconv.Atoi(c.Param("role_id"))
	if err != nil || roleID <= 0 {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid role_id: must be a positive integer")
		return
	}

	resp, err := h.PermissionSvc.GetRolePermissions(c.Request.Context(), roleID)
	if err != nil {
		errors.Error(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *HandlerFunc) UpdateRolePermissions(c *gin.Context) {

	roleID, err := strconv.Atoi(c.Param("role_id"))
	if err != nil || roleID <= 0 {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid role_id: must be a positive integer")
		return
	}

	// 3. Bind + validate request body
	var input models.TogglePermissionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid input: "+err.Error())
		return
	}
	if err := h.Validator.Struct(&input); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "validation error: "+err.Error())
		return
	}

	if err := h.PermissionSvc.TogglePermissions(c.Request.Context(), roleID, &input); err != nil {
		errors.Error(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "permissions updated successfully",
		"role_id": roleID,
		"updated": len(input.Permissions),
	})
}
