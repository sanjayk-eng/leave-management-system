package handler

import (
	"net/http"
	"strconv"

	"github.com/Zenithive/LeaveManagementSystem/pkg/audit"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/gin-gonic/gin"
)

// GetActivityMeta - GET /api/logs/meta
//
// Returns every registered component and action from the backend's single
// source of truth (audit.GetMeta). The frontend uses this to populate
// filter dropdowns dynamically — no hardcoded lists on the client side.
// Adding a new action to audit.GetMeta + BuildDescription is all that's
// needed for it to appear in the UI.
//
// Public within the auth boundary — no extra RBAC needed beyond the
// existing log:read permission applied to the parent route group.
func (h *HandlerFunc) GetActivityMeta(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message": "audit meta fetched successfully",
		"data":    audit.GetMeta(),
	})
}

// GetActivityFeed - GET /api/logs
//
// Returns the human-readable audit activity feed.
// Only the read-side (ActivityEntry) is exposed — no raw JSONB diffs.
//
// Query parameters (all optional):
//
//	resource_id  — filter to the history of one resource
//	actor_id     — filter to everything one actor did
//	component    — filter to a domain component (e.g. "designation")
//	action       — filter to a specific action (e.g. "designation.created")
//	page         — 1-indexed page number (default: 1)
//	page_size    — entries per page (default: 20, max: 100)
func (h *HandlerFunc) GetActivityFeed(c *gin.Context) {
	filter := audit.ActivityFilter{
		ResourceID: c.Query("resource_id"),
		ActorID:    c.Query("actor_id"),
		Component:  c.Query("component"),
		Action:     c.Query("action"),
		Search:     c.Query("search"),
		Page:       parseIntQuery(c, "page", 1),
		PageSize:   parseIntQuery(c, "page_size", 20),
	}

	entries, total, err := h.AuditSvc.GetActivity(c.Request.Context(), filter)
	if err != nil {
		errors.RespondWithError(c, http.StatusInternalServerError, "failed to fetch activity log: "+err.Error())
		return
	}

	page := filter.Page
	pageSize := filter.PageSize
	if pageSize > 100 {
		pageSize = 100
	}

	totalPages := 0
	if total > 0 {
		totalPages = (total + pageSize - 1) / pageSize
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "activity log fetched successfully",
		"pagination": gin.H{
			"page":        page,
			"page_size":   pageSize,
			"total":       total,
			"total_pages": totalPages,
		},
		"data": entries,
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// parseIntQuery parses an integer query parameter with a default fallback.
func parseIntQuery(c *gin.Context, key string, defaultVal int) int {
	raw := c.Query(key)
	if raw == "" {
		return defaultVal
	}
	v, err := strconv.Atoi(raw)
	if err != nil || v < 1 {
		return defaultVal
	}
	return v
}
