package handler

// reportHelpers.go — shared parsing helpers used by GetLeaveReport and
// GetLeavePolicyReport. Centralises all repeated extraction so each
// handler only contains logic that is genuinely unique to it.

import (
	stderrors "errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/internal/service/leaveReport"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/gin-gonic/gin"
)

// ── Context extraction ────────────────────────────────────────────────────────

// resolveReportIdentity reads user_id and perm_scope from the gin context
// (both are set by AuthMiddleware + RequirePermission before this handler runs).
// Returns false and writes the error response when user_id is absent.
func resolveReportIdentity(c *gin.Context) (callerID, scope string, ok bool) {
	userID, exists := c.Get("user_id")
	uid, isStr := userID.(string)
	if !exists || !isStr || uid == "" {
		errors.RespondWithError(c, http.StatusUnauthorized, "Missing caller identity")
		return "", "", false
	}

	scope = "self" // fail-closed default — mirrors the middleware default
	if s, hasScope := c.Get("perm_scope"); hasScope {
		if sv, isStr := s.(string); isStr && sv != "" {
			scope = sv
		}
	}
	return uid, scope, true
}

// ── Query-param parsers ───────────────────────────────────────────────────────

// parseMonth reads a 1-12 month query param. Returns false and writes a 400.
func parseMonth(c *gin.Context, param string) (int, bool) {
	v, err := strconv.Atoi(c.Query(param))
	if err != nil || v < 1 || v > 12 {
		errors.RespondWithError(c, http.StatusBadRequest,
			"Invalid or missing "+param+" (must be 1-12)")
		return 0, false
	}
	return v, true
}

// parseYear reads a 2000-2100 year query param. Returns false and writes a 400.
func parseYear(c *gin.Context, param string) (int, bool) {
	v, err := strconv.Atoi(c.Query(param))
	if err != nil || v < 2000 || v > 2100 {
		errors.RespondWithError(c, http.StatusBadRequest,
			"Invalid or missing "+param+" (must be 2000-2100)")
		return 0, false
	}
	return v, true
}

// parseRangeParams reads from_month, from_year, to_month, to_year in one call.
// Returns false and writes a 400 on the first invalid param.
func parseRangeParams(c *gin.Context, req *models.LeaveReportRequest) bool {
	var ok bool
	if req.FromMonth, ok = parseMonth(c, "from_month"); !ok {
		return false
	}
	if req.FromYear, ok = parseYear(c, "from_year"); !ok {
		return false
	}
	if req.ToMonth, ok = parseMonth(c, "to_month"); !ok {
		return false
	}
	if req.ToYear, ok = parseYear(c, "to_year"); !ok {
		return false
	}
	return true
}

// ── Filter/sort parsing ───────────────────────────────────────────────────────

// parseReportFilters reads search, role, sort_by, sort_order from query params,
// validates them and writes the results into req.
// Returns false (with a 400 already written) on any validation failure.
// sortFieldCheck is the per-report-type sort whitelist; pass nil to use the
// shared leavereport.ValidSortFields.
func parseReportFilters(
	c *gin.Context,
	req *models.LeaveReportRequest,
	sortFieldCheck map[string]bool,
) bool {
	req.Search = strings.TrimSpace(c.Query("search"))
	if len(req.Search) > 100 {
		errors.RespondWithError(c, http.StatusBadRequest,
			"search query too long (max 100 chars)")
		return false
	}

	rawRole := strings.TrimSpace(c.Query("role"))
	if rawRole != "" {
		normalised, err := leavereport.ValidateRole(rawRole)
		if err != nil {
			errors.RespondWithError(c, http.StatusBadRequest, err.Error())
			return false
		}
		req.Role = normalised
	}

	req.SortBy = strings.TrimSpace(c.Query("sort_by"))
	req.SortOrder = strings.TrimSpace(c.Query("sort_order"))

	if sortFieldCheck != nil {
		// Use the supplied whitelist (e.g. policy-report has a different set)
		if req.SortBy != "" && !sortFieldCheck[req.SortBy] {
			errors.RespondWithError(c, http.StatusBadRequest,
				"invalid sort_by field")
			return false
		}
	} else {
		if err := leavereport.ValidateSortBy(req.SortBy); err != nil {
			errors.RespondWithError(c, http.StatusBadRequest, err.Error())
			return false
		}
	}
	if err := leavereport.ValidateSortOrder(req.SortOrder); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, err.Error())
		return false
	}
	return true
}

// ── Error response ────────────────────────────────────────────────────────────

// handleReportServiceError maps service-layer sentinel errors to HTTP responses.
// logContext is included in the slog message on unexpected errors.
func handleReportServiceError(c *gin.Context, err error, logContext string) {
	switch {
	case stderrors.Is(err, leavereport.ErrInvalidReportType),
		stderrors.Is(err, leavereport.ErrInvalidDateRange),
		stderrors.Is(err, leavereport.ErrRangeTooLarge),
		stderrors.Is(err, leavereport.ErrInvalidSortBy),
		stderrors.Is(err, leavereport.ErrInvalidSortOrder),
		stderrors.Is(err, leavereport.ErrInvalidRole):
		errors.RespondWithError(c, http.StatusBadRequest, err.Error())

	case stderrors.Is(err, leavereport.ErrMissingCaller):
		errors.RespondWithError(c, http.StatusUnauthorized, err.Error())

	default:
		slog.Error(logContext+" service error", "err", err)
		errors.RespondWithError(c, http.StatusInternalServerError,
			"Failed to fetch "+logContext)
	}
}
