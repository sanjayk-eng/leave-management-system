package handler

import (
	stderrors "errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/internal/service/leavereport"
	accessrole "github.com/Zenithive/LeaveManagementSystem/pkg/accessrole"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/gin-gonic/gin"
)

func (h *HandlerFunc) GetLeaveReport(c *gin.Context) {
	reportType := c.Query("report_type")
	if reportType == "" {
		errors.RespondWithError(c, http.StatusBadRequest, "Missing required query param: report_type (monthly|yearly|range)")
		return
	}

	req := models.LeaveReportRequest{ReportType: reportType}

	// ── Caller identity: hard-fail, don't proceed with empty CallerID ─────
	userID, ok := c.Get("user_id")
	uid, uidOK := userID.(string)
	if !ok || !uidOK || uid == "" {
		errors.RespondWithError(c, http.StatusUnauthorized, "Missing caller identity")
		return
	}
	req.CallerID = uid

	// ── Scope: fail-closed default ─────────────────────────────────────────
	scope := "self"
	if s, ok := c.Get("perm_scope"); ok {
		if sv, ok := s.(string); ok && sv != "" {
			scope = sv
		}
	}
	req.Scope = scope

	switch reportType {
	case "monthly":
		month, err := strconv.Atoi(c.Query("month"))
		if err != nil || month < 1 || month > 12 {
			errors.RespondWithError(c, http.StatusBadRequest, "Invalid or missing month. Must be between 1-12")
			return
		}
		year, err := strconv.Atoi(c.Query("year"))
		if err != nil || year < 2000 || year > 2100 {
			errors.RespondWithError(c, http.StatusBadRequest, "Invalid or missing year. Must be between 2000-2100")
			return
		}
		req.Month, req.Year = month, year

	case "yearly":
		year, err := strconv.Atoi(c.Query("year"))
		if err != nil || year < 2000 || year > 2100 {
			errors.RespondWithError(c, http.StatusBadRequest, "Invalid or missing year. Must be between 2000-2100")
			return
		}
		req.Year = year

	case "range":
		fromMonth, err := strconv.Atoi(c.Query("from_month"))
		if err != nil || fromMonth < 1 || fromMonth > 12 {
			errors.RespondWithError(c, http.StatusBadRequest, "Invalid or missing from_month. Must be between 1-12")
			return
		}
		fromYear, err := strconv.Atoi(c.Query("from_year"))
		if err != nil || fromYear < 2000 || fromYear > 2100 {
			errors.RespondWithError(c, http.StatusBadRequest, "Invalid or missing from_year. Must be between 2000-2100")
			return
		}
		toMonth, err := strconv.Atoi(c.Query("to_month"))
		if err != nil || toMonth < 1 || toMonth > 12 {
			errors.RespondWithError(c, http.StatusBadRequest, "Invalid or missing to_month. Must be between 1-12")
			return
		}
		toYear, err := strconv.Atoi(c.Query("to_year"))
		if err != nil || toYear < 2000 || toYear > 2100 {
			errors.RespondWithError(c, http.StatusBadRequest, "Invalid or missing to_year. Must be between 2000-2100")
			return
		}
		req.FromMonth, req.FromYear = fromMonth, fromYear
		req.ToMonth, req.ToYear = toMonth, toYear

	default:
		errors.RespondWithError(c, http.StatusBadRequest, "Invalid report_type. Must be: monthly, yearly, or range")
		return
	}

	// ── Filters / sort ──────────────────────────────────────────────────
	req.Search = strings.TrimSpace(c.Query("search"))
	if len(req.Search) > 100 {
		errors.RespondWithError(c, http.StatusBadRequest, "search query too long (max 100 chars)")
		return
	}

	req.Role = strings.TrimSpace(c.Query("role"))
	if req.Role != "" {
		validRoles := map[string]bool{
			accessrole.ROLE_EMPLOYEE: true, accessrole.ROLE_INTERN: true,
			accessrole.ROLE_HR: true, accessrole.ROLE_ADMIN: true,
			accessrole.ROLE_SUPER_ADMIN: true, accessrole.ROLE_MANAGER: true,
		}
		req.Role = leavereport.NormalizeRole(req.Role)
		if !validRoles[req.Role] {
			errors.RespondWithError(c, http.StatusBadRequest, "Invalid role filter. Must be: EMPLOYEE, INTERN, HR, ADMIN, SUPER_ADMIN, MANAGER")
			return
		}
	}

	req.SortBy = strings.TrimSpace(c.Query("sort_by"))
	req.SortOrder = strings.TrimSpace(c.Query("sort_order"))
	if err := leavereport.ValidateSortBy(req.SortBy); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := leavereport.ValidateSortOrder(req.SortOrder); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, err.Error())
		return
	}

	// ── Service call ────────────────────────────────────────────────────
	response, err := h.LeaveReportSvc.GetLeaveReport(c.Request.Context(), &req)
	if err != nil {
		switch {
		case stderrors.Is(err, leavereport.ErrInvalidReportType),
			stderrors.Is(err, leavereport.ErrInvalidDateRange),
			stderrors.Is(err, leavereport.ErrRangeTooLarge),
			stderrors.Is(err, leavereport.ErrInvalidSortBy),
			stderrors.Is(err, leavereport.ErrInvalidSortOrder):
			errors.RespondWithError(c, http.StatusBadRequest, err.Error())

		case stderrors.Is(err, leavereport.ErrMissingCaller):
			errors.RespondWithError(c, http.StatusUnauthorized, err.Error())

		default:
			slog.Error("GetLeaveReport service error", "err", err)
			errors.RespondWithError(c, http.StatusInternalServerError, "Failed to fetch leave report")
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Leave report fetched successfully",
		"data":    response,
	})
}
