// middleware/rbac.go
package middleware

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/Zenithive/LeaveManagementSystem/internal/handler"
	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	apierrors "github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/Zenithive/LeaveManagementSystem/pkg/constant/rbsc"
	"github.com/gin-gonic/gin"
)

const SuperAdminRoleName = "SUPERADMIN"

func RequirePermission(h *handler.HandlerFunc, resource, action string) gin.HandlerFunc {
	return func(c *gin.Context) {

		if _, authRan := c.Get("user_id"); !authRan {
			apierrors.RespondWithError(c, http.StatusInternalServerError, fmt.Sprintf("RequirePermission(%s:%s) called without AuthMiddleware running first", resource, action))
			c.Abort()
			return
		}

		roleNameVal, _ := c.Get("role")
		roleName, _ := roleNameVal.(string)

		if roleName == SuperAdminRoleName {
			c.Set("perm_scope", "all")
			c.Set("perm_require_seniority", false)
			c.Next()
			return
		}

		roleIDVal, ok := c.Get("role_id")
		if !ok {
			apierrors.RespondWithError(c, http.StatusInternalServerError, fmt.Sprintf("RequirePermission(%s:%s): role_id missing from context", resource, action))
			c.Abort()
			return
		}
		roleID, ok := roleIDVal.(int)
		if !ok {
			apierrors.RespondWithError(c, http.StatusInternalServerError, fmt.Sprintf("RequirePermission(%s:%s): role_id has unexpected type %T", resource, action, roleIDVal))
			c.Abort()
			return
		}

		perm, err := h.PermissionSvc.Check(c.Request.Context(), roleID, resource, action)
		if err != nil {
			apierrors.RespondWithError(c, http.StatusInternalServerError, fmt.Sprintf("permission check failed for role=%s %s:%s: %v", roleName, resource, action, err))
			c.Abort()
			return
		}
		if !perm.Allowed {
			apierrors.RespondWithError(c, http.StatusForbidden, fmt.Sprintf("permission denied for %s:%s", resource, action))
			c.Abort()
			return
		}

		c.Set("perm_scope", perm.Scope)
		c.Set("perm_require_seniority", perm.RequireSeniority)
		c.Next()
	}
}

// leaveActionMap maps the request action string (uppercased) to its RBAC action constant.
// Only the three valid leave workflow actions are permitted through this route.
var leaveActionMap = map[string]rbsc.Action{
	"APPROVE":  rbsc.ActionApprove,
	"REJECT":   rbsc.ActionReject,
	"WITHDRAW": rbsc.ActionWithdraw,
}

func RequireLeaveAction(h *handler.HandlerFunc) gin.HandlerFunc {
	return func(c *gin.Context) {

		// ── Guard: AuthMiddleware must have run ──────────────────────────────
		if _, authRan := c.Get("user_id"); !authRan {
			apierrors.RespondWithError(c, http.StatusInternalServerError, "RequireLeaveAction called without AuthMiddleware running first")
			c.Abort()
			return
		}

		// ── 1. Read body bytes — do NOT consume the reader ───────────────────
		bodyBytes, err := io.ReadAll(c.Request.Body)
		if err != nil {
			apierrors.RespondWithError(c, http.StatusBadRequest, "failed to read request body")
			c.Abort()
			return
		}
		// Restore the body so ShouldBindJSON in the handler still works if needed.
		c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

		// ── 2. Peek only the "action" field ──────────────────────────────────
		var peek struct {
			Action string `json:"action"`
		}
		if err := json.Unmarshal(bodyBytes, &peek); err != nil {
			apierrors.RespondWithError(c, http.StatusBadRequest, "invalid JSON body")
			c.Abort()
			return
		}

		actionKey := strings.ToUpper(strings.TrimSpace(peek.Action))
		if actionKey == "" {
			apierrors.RespondWithError(c, http.StatusBadRequest, "action field is required")
			c.Abort()
			return
		}

		// ── 3. Validate action is one of the recognised leave actions ─────────
		rbacAction, supported := leaveActionMap[actionKey]
		if !supported {
			apierrors.RespondWithError(c, http.StatusBadRequest,
				fmt.Sprintf("unsupported leave action %q — must be one of: approve, reject, withdraw", peek.Action))
			c.Abort()
			return
		}

		// ── 4. Parse full payload and store in context ────────────────────────
		// Handler reads from context; body is still intact in c.Request.Body.
		var req models.ActionLeaveReq
		if err := json.Unmarshal(bodyBytes, &req); err != nil {
			apierrors.RespondWithError(c, http.StatusBadRequest, "invalid payload: "+err.Error())
			c.Abort()
			return
		}
		c.Set("leave_action_req", req)

		// ── 5. RBAC check ─────────────────────────────────────────────────────
		roleNameVal, _ := c.Get("role")
		roleName, _ := roleNameVal.(string)

		// SUPERADMIN bypasses the permission table entirely.
		if roleName == SuperAdminRoleName {
			c.Set("perm_scope", "all")
			c.Set("perm_require_seniority", false)
			c.Next()
			return
		}

		roleIDVal, ok := c.Get("role_id")
		if !ok {
			apierrors.RespondWithError(c, http.StatusInternalServerError, "RequireLeaveAction: role_id missing from context")
			c.Abort()
			return
		}
		roleID, ok := roleIDVal.(int)
		if !ok {
			apierrors.RespondWithError(c, http.StatusInternalServerError, fmt.Sprintf("RequireLeaveAction: role_id has unexpected type %T", roleIDVal))
			c.Abort()
			return
		}

		perm, err := h.PermissionSvc.Check(c.Request.Context(), roleID, string(rbsc.ResourceLeave), string(rbacAction))
		if err != nil {
			apierrors.RespondWithError(c, http.StatusInternalServerError, fmt.Sprintf("permission check failed for role=%s leave:%s: %v", roleName, rbacAction, err))
			c.Abort()
			return
		}
		if !perm.Allowed {
			apierrors.RespondWithError(c, http.StatusForbidden, fmt.Sprintf("permission denied for leave:%s", rbacAction))
			c.Abort()
			return
		}

		c.Set("perm_scope", perm.Scope)
		c.Set("perm_require_seniority", perm.RequireSeniority)
		c.Next()
	}
}
