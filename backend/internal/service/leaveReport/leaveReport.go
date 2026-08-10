package leavereport

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/internal/repositories"
)

// Service handles business logic for all leave report types.
type Service struct {
	repo *repositories.Repository
}

// NewService constructs a Service for the leave report domain.
func NewService(repo *repositories.Repository) *Service {
	return &Service{repo: repo}
}

// GetLeaveReport resolves the report window, validates all inputs
// independently of any caller (handler, cron, CLI, etc.), and delegates
// to the repository.
func (s *Service) GetLeaveReport(_ context.Context, req *models.LeaveReportRequest) (*models.LeaveReportResponse, error) {
	if req.CallerID == "" {
		return nil, ErrMissingCaller
	}

	dr, err := resolveDateRange(req)
	if err != nil {
		return nil, err
	}

	if err := ValidateSortBy(req.SortBy); err != nil {
		return nil, err
	}
	if err := ValidateSortOrder(req.SortOrder); err != nil {
		return nil, err
	}

	scope := req.Scope
	if scope == "" {
		scope = "self" // fail-closed default, mirrors handler default
	}

	filter := models.LeaveReportFilter{
		FromMonth: dr.FromMonth, FromYear: dr.FromYear,
		ToMonth: dr.ToMonth, ToYear: dr.ToYear,

		Search: strings.TrimSpace(req.Search),
		Role:   NormalizeRole(req.Role),

		SortBy:    req.SortBy,
		SortOrder: strings.ToUpper(req.SortOrder),

		Scope:    scope,
		CallerID: req.CallerID,
	}

	records, err := s.repo.GetLeaveReportByRange(filter)
	if err != nil {
		slog.Error("leave report query failed",
			"err", err,
			"report_type", req.ReportType,
			"caller_id", req.CallerID,
		)
		return nil, fmt.Errorf("failed to fetch leave report: %w", err)
	}
	if records == nil {
		records = []models.LeaveReportRecord{}
	}

	return &models.LeaveReportResponse{
		ReportType: req.ReportType,
		FromMonth:  dr.FromMonth, FromYear: dr.FromYear,
		ToMonth: dr.ToMonth, ToYear: dr.ToYear,
		Total:   len(records),
		Records: records,
	}, nil
}
