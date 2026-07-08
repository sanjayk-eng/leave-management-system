// middleware/rbac.go
package middleware

import (
	"fmt"
	"net/http"

	"github.com/Zenithive/LeaveManagementSystem/internal/handler"
	apierrors "github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/gin-gonic/gin"
)

// SuperAdminRoleName matches the Tbl_Role seed (id=1, type='SUPERADMIN').
// SUPERADMIN always has full, unrestricted access — checked directly
// against the role name so this path never needs a role_id lookup.
const SuperAdminRoleName = "SUPERADMIN"

// RequirePermission builds a Gin middleware that authorizes a request
// against a single (resource, action) permission pair, e.g.
// RequirePermission(h, "employee", "deactivate").
//
// Must be chained AFTER AuthMiddleware — it reads "user_id" and "role"
// from the Gin context, which only AuthMiddleware sets. AuthMiddleware
// stores role as a name string (claims.UserRole).
//
// On success it stores two values in context for downstream handlers:
//   - "perm_scope"             string ("own" | "team" | "all")
//   - "perm_require_seniority" bool
//
// middleware/rbac.go
func RequirePermission(h *handler.HandlerFunc, resource, action string) gin.HandlerFunc {
	return func(c *gin.Context) {

		if _, authRan := c.Get("user_id"); !authRan {
			apierrors.RespondWithError(c, http.StatusInternalServerError,
				fmt.Sprintf("RequirePermission(%s:%s) called without AuthMiddleware running first", resource, action))
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
			apierrors.RespondWithError(c, http.StatusInternalServerError,
				fmt.Sprintf("RequirePermission(%s:%s): role_id missing from context", resource, action))
			c.Abort()
			return
		}
		roleID, ok := roleIDVal.(int)
		if !ok {
			apierrors.RespondWithError(c, http.StatusInternalServerError,
				fmt.Sprintf("RequirePermission(%s:%s): role_id has unexpected type %T", resource, action, roleIDVal))
			c.Abort()
			return
		}

		perm, err := h.PermissionSvc.Check(c.Request.Context(), roleID, resource, action)
		if err != nil {
			apierrors.RespondWithError(c, http.StatusInternalServerError,
				fmt.Sprintf("permission check failed for role=%s %s:%s: %v", roleName, resource, action, err))
			c.Abort()
			return
		}
		if !perm.Allowed {
			apierrors.RespondWithError(c, http.StatusForbidden,
				fmt.Sprintf("permission denied for %s:%s", resource, action))
			c.Abort()
			return
		}

		c.Set("perm_scope", perm.Scope)
		c.Set("perm_require_seniority", perm.RequireSeniority)
		c.Next()
	}
}
