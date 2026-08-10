package leavereport

import (
	"errors"
	"fmt"
)

// ReportType identifies the time window style for a leave report.
type ReportType string

const (
	// ReportTypeMonthly requests a single-month leave report.
	ReportTypeMonthly ReportType = "monthly"
	// ReportTypeYearly requests a full-year leave report.
	ReportTypeYearly ReportType = "yearly"
	// ReportTypeRange requests a date-range leave report.
	ReportTypeRange ReportType = "range"
)

// MaxRangeMonths caps how wide a "range" report can span, to bound query cost.
const MaxRangeMonths = 24

var (
	// ErrInvalidReportType is returned when the report_type query param is unrecognised.
	ErrInvalidReportType = errors.New("invalid report_type: must be monthly, yearly, or range")
	ErrInvalidDateRange  = errors.New("from date must be before or equal to to date")
	ErrRangeTooLarge     = fmt.Errorf("range exceeds maximum of %d months", MaxRangeMonths)
	ErrInvalidSortBy     = errors.New("invalid sort_by field")
	ErrInvalidSortOrder  = errors.New("invalid sort_order, must be ASC or DESC")
	ErrMissingCaller     = errors.New("missing caller identity")
	ErrInvalidRole       = errors.New("invalid role filter. Must be: EMPLOYEE, INTERN, HR, ADMIN, SUPERADMIN, MANAGER")
)

// ValidSortFields is the single source of truth for sortable columns.
// Shared by handler validation and service validation to avoid drift.
var ValidSortFields = map[string]bool{
	"name": true, "email": true, "role": true,
	"total_leaves": true, "paid_leaves": true,
	"unpaid_leaves": true, "early_leaves": true,
	"accrued_leaves": true, "balance_leaves": true, "used_leaves": true,
}

// ValidSortOrders is the whitelist of acceptable sort_order values.
var ValidSortOrders = map[string]bool{"ASC": true, "DESC": true}
