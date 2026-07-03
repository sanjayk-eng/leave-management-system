package handler

import (
	"net/http"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/Zenithive/LeaveManagementSystem/pkg/security"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GetAllRoles — GET /api/auth/roles
// Returns all available role types from Tbl_Role.
// Public endpoint — no authentication required.
func (s *HandlerFunc) GetAllRoles(c *gin.Context) {
	roles, err := s.Query.GetAllRoles()
	if err != nil {
		errors.RespondWithError(c, http.StatusInternalServerError, "Failed to fetch roles: "+err.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "Roles fetched successfully",
		"data":    roles,
	})
}

func (h *HandlerFunc) Login(c *gin.Context) {

	var input models.LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Default to local if provider not specified (backwards compat)
	if input.Provider == "" {
		input.Provider = models.ProviderLocal
	}

	result, err := h.AuthSvc.Login(&input)
	if err != nil {
		errors.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Login successful",
		"token":   result.Token,
		"user": gin.H{
			"id":    result.ID,
			"email": result.Email,
			"role":  result.Role,
		},
	})
}

func (s *HandlerFunc) VerifyToken(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		errors.RespondWithError(c, http.StatusUnauthorized, "Missing Authorization header")
		return
	}

	tokenString := extractToken(authHeader)
	if tokenString == "" {
		errors.RespondWithError(c, http.StatusUnauthorized, "Token missing")
		return
	}

	claims, err := security.ValidateToken(tokenString, s.Env.SECRET_KEY)
	if err != nil {
		errors.RespondWithError(c, http.StatusUnauthorized, "Invalid or expired token")
		return
	}

	userID, err := uuid.Parse(claims.UserID)
	if err != nil {
		errors.RespondWithError(c, http.StatusUnauthorized, "Invalid user ID")
		return
	}

	emp, err := s.Query.GetEmployeeByID(userID)
	if err != nil {
		errors.RespondWithError(c, http.StatusUnauthorized, "User not found")
		return
	}

	if emp.Status == "deactive" {
		errors.RespondWithError(c, http.StatusForbidden, "Account is deactivated")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Token is valid",
		"user": gin.H{
			"id":    emp.ID,
			"email": emp.Email,
			"role":  emp.Role,
		},
	})
}

// Logout — POST /api/auth/logout
// Returns an expired token so the client discards its stored token.
func (s *HandlerFunc) Logout(c *gin.Context) {
	userIDRaw, _ := c.Get("user_id")
	userRoleRaw, _ := c.Get("role")

	expiredToken, err := security.GenerateExpiredToken(userIDRaw.(string), userRoleRaw.(string), s.Env.SECRET_KEY)
	if err != nil {
		errors.RespondWithError(c, http.StatusInternalServerError, "Failed to generate expired token")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Logged out successfully",
		"token":   expiredToken,
	})
}

// ── helpers ───────────────────────────────────────────────────────────────────

// extractToken strips the "Bearer " prefix from an Authorization header value.
func extractToken(authHeader string) string {
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		return authHeader[7:]
	}
	return authHeader
}
