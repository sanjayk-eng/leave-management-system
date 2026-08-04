package handler

import (
	"net/http"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/gin-gonic/gin"
)

// GetLeaveReport returns a per-employee leave summary (accrued, used, balance,
// paid, unpaid, early) for a given monthly / yearly / range window.
//
// Route: GET /api/leaves/Get-Leave-Report
func (h *HandlerFunc) GetLeaveReport(c *gin.Context) {
	reportType := c.Query("report_type")
	if reportType == "" {
		errors.RespondWithError(c, http.StatusBadRequest,
			"Missing required query param: report_type (monthly|yearly|range)")
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

	case "range":
		if !parseRangeParams(c, &req) {
			return
		}

	default:
		errors.RespondWithError(c, http.StatusBadRequest,
			"Invalid report_type — must be: monthly, yearly, or range")
		return
	}

	// Filters + sort (uses the shared leavereport sort-field whitelist)
	if !parseReportFilters(c, &req, nil) {
		return
	}

	response, err := h.LeaveReportSvc.GetLeaveReport(c.Request.Context(), &req)
	if err != nil {
		handleReportServiceError(c, err, "leave report")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Leave report fetched successfully",
		"data":    response,
	})
}
