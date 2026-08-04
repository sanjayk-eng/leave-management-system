package models

import (
	"fmt"
	"strings"
)

// ─── Leave Policy Report ──────────────────────────────────────────────────────

// LeavePolicyEntry holds the totals for a single leave policy (leave type)
// within the report window for one employee.
type LeavePolicyEntry struct {
	PolicyID           int     `json:"policy_id"           db:"policy_id"`
	PolicyName         string  `json:"policy_name"         db:"policy_name"`
	IsPaid             bool    `json:"is_paid"             db:"is_paid"`
	IsEarly            bool    `json:"is_early"            db:"is_early"`
	IsActive           bool    `json:"is_active"           db:"is_active"`
	DefaultEntitlement float64 `json:"default_entitlement" db:"default_entitlement"`
	AssociateMonth     *int    `json:"associate_month,omitempty" db:"associate_month"`
	UsedDays           float64 `json:"used_days"           db:"used_days"`
	Balance            float64 `json:"balance"             db:"balance"`
}

// LeavePolicyReportRecord is one employee row with a breakdown per leave policy.
type LeavePolicyReportRecord struct {
	EmployeeID   string             `json:"employee_id"   db:"employee_id"`
	EmployeeName string             `json:"employee_name" db:"employee_name"`
	Email        string             `json:"email"         db:"email"`
	Role         string             `json:"role"          db:"role"`
	TotalUsed    float64            `json:"total_used"    db:"total_used"`
	TotalBalance float64            `json:"total_balance" db:"total_balance"`
	Policies     []LeavePolicyEntry `json:"policies"`
}

// LeavePolicyReportResponse is the unified API response.
type LeavePolicyReportResponse struct {
	ReportType string                    `json:"report_type"`
	FromMonth  int                       `json:"from_month"`
	FromYear   int                       `json:"from_year"`
	ToMonth    int                       `json:"to_month"`
	ToYear     int                       `json:"to_year"`
	Total      int                       `json:"total"`
	Records    []LeavePolicyReportRecord `json:"records"`
}

// ─── Sort helpers ─────────────────────────────────────────────────────────────

const (
	PolicySortEmployeeName = "employee_name"
	PolicySortEmail        = "email"
	PolicySortRole         = "role"
	PolicySortTotalUsed    = "total_used"
	PolicySortTotalBalance = "total_balance"
	PolicyDefaultOrderCol  = "e.full_name"
)

var ValidPolicySortFields = map[string]bool{
	PolicySortEmployeeName: true,
	PolicySortEmail:        true,
	PolicySortRole:         true,
	PolicySortTotalUsed:    true,
	PolicySortTotalBalance: true,
}

// BuildLeavePolicyReportOrder returns the ORDER BY clause for the employee-level query.
func BuildLeavePolicyReportOrder(sortBy, sortOrder string) string {
	col := PolicyDefaultOrderCol
	switch sortBy {
	case PolicySortEmail:
		col = "e.email"
	case PolicySortRole:
		col = "r.type"
	case PolicySortTotalUsed:
		col = "total_used"
	case PolicySortTotalBalance:
		col = "total_balance"
	}

	dir := "ASC"
	if strings.ToUpper(sortOrder) == "DESC" {
		dir = "DESC"
	}

	return fmt.Sprintf(" ORDER BY %s %s", col, dir)
}

// ─── Filter ───────────────────────────────────────────────────────────────────

// LeavePolicyReportFilter is the resolved, sanitised filter passed to the repository.
type LeavePolicyReportFilter struct {
	FromMonth int
	FromYear  int
	ToMonth   int
	ToYear    int

	Search string
	Role   string

	SortBy    string
	SortOrder string

	// RBAC scope — mirrors LeaveReportFilter
	Scope    string // "own" | "team" | "all"
	CallerID string // UUID string
}
