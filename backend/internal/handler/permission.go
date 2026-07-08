package handler

import (
	"net/http"
	"strconv"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/pkg/accessrole"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/gin-gonic/gin"
)

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/permissions/roles/:role_id
//
// Returns the full permission matrix for the requested role, grouped by
// resource.  Only SUPERADMIN and ADMIN can call this endpoint.
//
// Response shape:
//
//	{
//	  "role_id":   3,
//	  "role_name": "ADMIN",
//	  "resources": [
//	    {
//	      "resource": "employee",
//	      "permissions": [
//	        {
//	          "permission_id":     1,
//	          "action":            "add",
//	          "label":             "Add Employee",
//	          "description":       "Create a new employee account",
//	          "scope":             "all",
//	          "require_seniority": true,
//	          "is_enabled":        true
//	        },
//	        ...
//	      ]
//	    },
//	    ...
//	  ]
//	}
// ─────────────────────────────────────────────────────────────────────────────

func (h *HandlerFunc) GetRolePermissions(c *gin.Context) {
	// 1. Auth check — only SUPERADMIN and ADMIN
	role := c.GetString("role")
	if err := accessrole.Admin_SuperAdmin(role, "only SUPERADMIN and ADMIN can view role permissions"); err != nil {
		errors.RespondWithError(c, http.StatusForbidden, err.Error())
		return
	}

	// 2. Parse role_id from URL
	roleID, err := strconv.Atoi(c.Param("role_id"))
	if err != nil || roleID <= 0 {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid role_id: must be a positive integer")
		return
	}

	// 3. Fetch via service
	resp, err := h.PermissionSvc.GetRolePermissions(c.Request.Context(), roleID)
	if err != nil {
		errors.Error(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/permissions/roles/:role_id
//
// Toggles is_enabled for one or more permissions on the given role.
// Only SUPERADMIN and ADMIN can call this endpoint.
// SUPERADMIN's own permissions (role_id=1) cannot be toggled — the service
// enforces this and returns 403.
//
// Request body:
//
//	{
//	  "permissions": [
//	    { "permission_id": 12, "is_enabled": false },
//	    { "permission_id": 13, "is_enabled": true  }
//	  ]
//	}
//
// Success response:
//
//	{
//	  "message":    "permissions updated successfully",
//	  "role_id":    3,
//	  "updated":    2
//	}
// ─────────────────────────────────────────────────────────────────────────────

func (h *HandlerFunc) UpdateRolePermissions(c *gin.Context) {
	// 1. Auth check — only SUPERADMIN and ADMIN
	role := c.GetString("role")
	if err := accessrole.Admin_SuperAdmin(role, "only SUPERADMIN and ADMIN can update role permissions"); err != nil {
		errors.RespondWithError(c, http.StatusForbidden, err.Error())
		return
	}

	// 2. Parse role_id from URL
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

	// 4. Delegate to service
	if err := h.PermissionSvc.TogglePermissions(c.Request.Context(), roleID, &input); err != nil {
		errors.Error(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "permissions updated successfully",
		"role_id":  roleID,
		"updated":  len(input.Permissions),
	})
}
