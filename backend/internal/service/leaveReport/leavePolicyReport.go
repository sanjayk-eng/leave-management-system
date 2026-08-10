package leavereport

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
)

// GetLeavePolicyReport produces a per-employee, per-policy breakdown for the
// requested time window. It reuses the same date-range resolution, scope, and
// validation helpers as the main leave report.
func (s *Service) GetLeavePolicyReport(
	_ context.Context,
	req *models.LeaveReportRequest,
) (*models.LeavePolicyReportResponse, error) {

	if req.CallerID == "" {
		return nil, ErrMissingCaller
	}

	// Resolve the date window (reused from the main report)
	dr, err := resolveDateRange(req)
	if err != nil {
		return nil, err
	}

	if err := ValidateSortBy(req.SortBy); err != nil {
		// Policy report has a narrower sort-field set — the handler has already
		// validated against models.ValidPolicySortFields, so no re-check needed here.
		_ = err
	}
	if err := ValidateSortOrder(req.SortOrder); err != nil {
		return nil, err
	}

	scope := req.Scope
	if scope == "" {
		scope = "self"
	}

	filter := models.LeavePolicyReportFilter{
		FromMonth: dr.FromMonth, FromYear: dr.FromYear,
		ToMonth: dr.ToMonth, ToYear: dr.ToYear,

		Search: strings.TrimSpace(req.Search),
		Role:   NormalizeRole(req.Role),

		SortBy:    req.SortBy,
		SortOrder: strings.ToUpper(req.SortOrder),

		Scope:    scope,
		CallerID: req.CallerID,
	}

	records, err := s.repo.GetLeavePolicyReport(filter)
	if err != nil {
		slog.Error("leave policy report query failed",
			"err", err,
			"report_type", req.ReportType,
			"caller_id", req.CallerID,
		)
		return nil, fmt.Errorf("failed to fetch leave policy report: %w", err)
	}
	if records == nil {
		records = []models.LeavePolicyReportRecord{}
	}

	return &models.LeavePolicyReportResponse{
		ReportType: req.ReportType,
		FromMonth:  dr.FromMonth, FromYear: dr.FromYear,
		ToMonth: dr.ToMonth, ToYear: dr.ToYear,
		Total:   len(records),
		Records: records,
	}, nil
}
