// middleware/auth.go
package middleware

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"

	"github.com/Zenithive/LeaveManagementSystem/internal/handler"
	apierrors "github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/Zenithive/LeaveManagementSystem/pkg/security"
	"github.com/gin-gonic/gin"
)

// AuthMiddleware verifies the Bearer JWT token and resolves the caller's
// role_id from Tbl_Role so downstream RBAC middleware (RequirePermission)
// doesn't need its own lookup on every route.
func AuthMiddleware(h *handler.HandlerFunc) gin.HandlerFunc {
	return func(c *gin.Context) {

		// 1. Read Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			apierrors.RespondWithError(c, http.StatusUnauthorized, "Missing Authorization header")
			c.Abort()
			return
		}

		// 2. Allow both "Bearer <token>" and "<token>"
		var tokenString string
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		}
		tokenString = strings.TrimSpace(tokenString)

		if tokenString == "" {
			apierrors.RespondWithError(c, http.StatusUnauthorized, "Token missing")
			c.Abort()
			return
		}

		// 3. Validate JWT token
		claims, err := security.ValidateToken(tokenString, h.Env.SECRET_KEY)
		if err != nil {
			apierrors.RespondWithError(c, http.StatusUnauthorized, "Invalid or expired token: "+err.Error())
			c.Abort()
			return
		}

		// 4. Resolve role_id from role name — one lookup here, reused by
		//    every RequirePermission call later in the chain.
		var roleID int
		dbErr := h.Query.DB.GetContext(c.Request.Context(), &roleID,
			`SELECT id FROM Tbl_Role WHERE type = $1`, claims.UserRole)
		if dbErr != nil {
			if errors.Is(dbErr, sql.ErrNoRows) {
				apierrors.RespondWithError(c, http.StatusForbidden,
					"unrecognized role: "+claims.UserRole)
			} else {
				apierrors.RespondWithError(c, http.StatusInternalServerError,
					"role lookup failed: "+dbErr.Error())
			}
			c.Abort()
			return
		}

		// 5. Store useful info in context
		c.Set("user_id", claims.UserID)
		c.Set("role", claims.UserRole)
		c.Set("role_id", roleID)

		c.Next()
	}
}
