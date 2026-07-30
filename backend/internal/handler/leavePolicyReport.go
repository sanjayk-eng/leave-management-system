package handler

import (
	"net/http"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/gin-gonic/gin"
)

// GetLeavePolicyReport returns a per-employee, per-leave-policy breakdown.
// Supports: monthly, weekly, yearly, range.
// "weekly" is treated as a range on the backend (caller passes from_*/to_*).
//
// Route: GET /api/leaves/Get-Leave-Policy-Report
func (h *HandlerFunc) GetLeavePolicyReport(c *gin.Context) {
	reportType := c.Query("report_type")
	if reportType == "" {
		errors.RespondWithError(c, http.StatusBadRequest,
			"Missing required query param: report_type (monthly|weekly|yearly|range)")
		return
	}

	req := models.LeaveReportRequest{ReportType: reportType}

	// Auth + scope — set by AuthMiddleware and RequirePermission before this runs.
	callerID, scope, ok := resolveReportIdentity(c)
	if !ok {
		return
	}
	req.CallerID, req.Scope = callerID, scope

	// Date params
	switch reportType {
	case "monthly":
		if req.Month, ok = parseMonth(c, "month"); !ok {
			return
		}
		if req.Year, ok = parseYear(c, "year"); !ok {
			return
		}

	case "yearly":
		if req.Year, ok = parseYear(c, "year"); !ok {
			return
		}

	case "weekly", "range":
		// Weekly and range share identical param names; the service resolves the
		// date window the same way for both. We normalise "weekly" → "range" so
		// the service's existing switch statement handles it without a new case.
		if !parseRangeParams(c, &req) {
			return
		}
		req.ReportType = "range"

	default:
		errors.RespondWithError(c, http.StatusBadRequest,
			"Invalid report_type — must be: monthly, weekly, yearly, or range")
		return
	}

	// Filters + sort (policy report has its own sort-field whitelist)
	if !parseReportFilters(c, &req, models.ValidPolicySortFields) {
		return
	}

	response, err := h.LeaveReportSvc.GetLeavePolicyReport(c.Request.Context(), &req)
	if err != nil {
		handleReportServiceError(c, err, "leave policy report")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Leave policy report fetched successfully",
		"data":    response,
	})
}
