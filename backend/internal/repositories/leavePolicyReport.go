package repositories

import (
	"fmt"
	"strings"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
)

// ─────────────────────────────────────────────────────────────────────────────
// Leave-Policy Report Repository
//
// Strategy: one flat SQL query returns one row per (employee, leave_type).
// The repository assembles those flat rows into the nested
// LeavePolicyReportRecord{Policies []LeavePolicyEntry} shape in Go,
// which keeps the SQL straightforward and avoids JSONB aggregation.
// ─────────────────────────────────────────────────────────────────────────────

// policyFlatRow is an internal scan target — one row per employee × policy.
type policyFlatRow struct {
	EmployeeID   string  `db:"employee_id"`
	EmployeeName string  `db:"employee_name"`
	Email        string  `db:"email"`
	Role         string  `db:"role"`
	PolicyID     int     `db:"policy_id"`
	PolicyName   string  `db:"policy_name"`
	IsPaid       bool    `db:"is_paid"`
	IsEarly      bool    `db:"is_early"`
	IsActive     bool    `db:"is_active"`
	UsedDays     float64 `db:"used_days"`
	Balance      float64 `db:"balance"`
}

// buildPolicyReportQuery assembles the full SQL for the leave-policy report.
//
// Parameters (positional):
//
//	$1 = fromYear   (int)
//	$2 = fromMonth  (int)
//	$3 = toYear     (int)
//	$4 = toMonth    (int)
//	$5 = search     (string, empty = no filter)
//	$6 = role       (string, empty = no filter)
//	$7 = callerID   (string UUID — only when scope == own | team)
func buildPolicyReportQuery(scope, sortBy, sortOrder string) string {
	// Scope clause — $7 is the caller UUID (string)
	scopeClause := ""
	switch scope {
	case "own":
		scopeClause = "\n  AND e.id::text = $7"
	case "team":
		scopeClause = "\n  AND (e.id::text = $7 OR e.manager_id::text = $7)"
	}

	orderBy := models.BuildLeavePolicyReportOrder(sortBy, sortOrder)

	// We build a CTE for the report window, then join Tbl_Leave_Type so every
	// employee gets a row for every policy (including ones with zero usage).
	// Proration reuses the same working-days approach as the main leave report.
	q := `
WITH holidays AS (
    SELECT date::date AS holiday_date
    FROM Tbl_Holiday
),

report_period AS (
    SELECT
        DATE_TRUNC('month', MAKE_DATE($1::int, $2::int, 1))::date  AS win_start,
        (DATE_TRUNC('month', MAKE_DATE($3::int, $4::int, 1)) + INTERVAL '1 month - 1 day')::date AS win_end
),

-- All active leave policies we want to report on
all_policies AS (
    SELECT id AS policy_id, name AS policy_name,
           COALESCE(is_paid, FALSE)   AS is_paid,
           COALESCE(is_early, FALSE)  AS is_early,
           COALESCE(is_active, TRUE)  AS is_active
    FROM Tbl_Leave_Type
    WHERE is_active = TRUE
),

-- Working days per leave that overlaps the window (proration)
leave_wd AS (
    SELECT
        l.id          AS leave_id,
        l.employee_id,
        l.leave_type_id,
        l.days        AS original_days,

        -- total working days in the full leave span
        (
            SELECT COUNT(*)
            FROM generate_series(l.start_date, l.end_date, INTERVAL '1 day') d
            WHERE EXTRACT(DOW FROM d) NOT IN (0, 6)
              AND d::date NOT IN (
                  SELECT holiday_date FROM holidays
                  WHERE holiday_date BETWEEN l.start_date::date AND l.end_date::date
              )
        ) AS total_wd,

        -- working days that fall inside the report window
        (
            SELECT COUNT(*)
            FROM generate_series(
                GREATEST(l.start_date, rp.win_start),
                LEAST(l.end_date,      rp.win_end),
                INTERVAL '1 day'
            ) d
            WHERE EXTRACT(DOW FROM d) NOT IN (0, 6)
              AND d::date NOT IN (
                  SELECT holiday_date FROM holidays
                  WHERE holiday_date BETWEEN GREATEST(l.start_date, rp.win_start)::date
                                         AND LEAST(l.end_date, rp.win_end)::date
              )
        ) AS overlap_wd

    FROM Tbl_Leave l
    CROSS JOIN report_period rp
    WHERE l.status = 'APPROVED'
      AND l.start_date <= rp.win_end
      AND l.end_date   >= rp.win_start
),

-- Prorated usage per (employee, policy)
policy_usage AS (
    SELECT
        lw.employee_id,
        lw.leave_type_id,
        COALESCE(SUM(
            CASE
                WHEN lw.overlap_wd <= 0 THEN 0
                WHEN lw.total_wd = lw.overlap_wd THEN lw.original_days
                WHEN lw.total_wd = 0 THEN 0
                ELSE (lw.overlap_wd::numeric / lw.total_wd) * lw.original_days
            END
        ), 0) AS used_days
    FROM leave_wd lw
    WHERE lw.overlap_wd > 0
    GROUP BY lw.employee_id, lw.leave_type_id
),

-- Per-employee, per-policy leave balance for the report year range
policy_balance AS (
    SELECT
        lb.employee_id,
        lb.leave_type_id,
        COALESCE(SUM(lb.closing), 0) AS balance
    FROM Tbl_Leave_balance lb
    CROSS JOIN report_period rp
    WHERE lb.year BETWEEN
          EXTRACT(YEAR FROM rp.win_start)::int
          AND EXTRACT(YEAR FROM rp.win_end)::int
    GROUP BY lb.employee_id, lb.leave_type_id
)

-- Final: cross all active employees with all policies, left-join usage & balance
SELECT
    e.id::text                                     AS employee_id,
    e.full_name                                    AS employee_name,
    e.email,
    r.type                                         AS role,

    ap.policy_id,
    ap.policy_name,
    ap.is_paid,
    ap.is_early,
    ap.is_active,

    COALESCE(pu.used_days, 0)                      AS used_days,
    COALESCE(pb.balance,   0)                      AS balance

FROM Tbl_Employee   e
JOIN Tbl_Role       r  ON e.role_id = r.id
CROSS JOIN all_policies ap
LEFT JOIN policy_usage  pu ON pu.employee_id  = e.id AND pu.leave_type_id = ap.policy_id
LEFT JOIN policy_balance pb ON pb.employee_id = e.id AND pb.leave_type_id = ap.policy_id

WHERE e.status = 'active'
  AND r.type   != 'SUPERADMIN'
  AND ($5 = '' OR LOWER(e.full_name) LIKE '%' || LOWER($5) || '%' OR LOWER(e.email) LIKE '%' || LOWER($5) || '%')
  AND ($6 = '' OR UPPER(r.type) = UPPER($6))` +
		scopeClause + orderBy
	return q
}

// GetLeavePolicyReport executes the flat (employee × policy) query and
// assembles the nested LeavePolicyReportRecord slice.
func (r *Repository) GetLeavePolicyReport(
	filter models.LeavePolicyReportFilter,
) ([]models.LeavePolicyReportRecord, error) {

	query := buildPolicyReportQuery(filter.Scope, filter.SortBy, filter.SortOrder)

	var flatRows []policyFlatRow
	var err error

	args := []interface{}{
		filter.FromYear, filter.FromMonth,
		filter.ToYear, filter.ToMonth,
		filter.Search, filter.Role,
	}

	switch filter.Scope {
	case "own", "team":
		args = append(args, filter.CallerID)
		err = r.DB.Select(&flatRows, query, args...)
	default: // "all"
		err = r.DB.Select(&flatRows, query, args...)
	}

	if err != nil {
		return nil, fmt.Errorf("GetLeavePolicyReport query: %w", err)
	}

	return assemblePolicyRecords(flatRows), nil
}

// assemblePolicyRecords groups the flat (employee × policy) rows into the
// nested output shape, preserving the employee order from SQL.
func assemblePolicyRecords(rows []policyFlatRow) []models.LeavePolicyReportRecord {
	if len(rows) == 0 {
		return []models.LeavePolicyReportRecord{}
	}

	// Use an ordered slice + index map so employees appear in SQL order.
	type empKey = string // employee_id string

	order := make([]empKey, 0)
	index := make(map[empKey]int) // empID → position in result

	result := make([]models.LeavePolicyReportRecord, 0)

	for _, row := range rows {
		pos, seen := index[row.EmployeeID]
		if !seen {
			pos = len(result)
			index[row.EmployeeID] = pos
			order = append(order, row.EmployeeID)
			result = append(result, models.LeavePolicyReportRecord{
				EmployeeID:   row.EmployeeID,
				EmployeeName: row.EmployeeName,
				Email:        row.Email,
				Role:         row.Role,
				Policies:     []models.LeavePolicyEntry{},
			})
		}

		entry := models.LeavePolicyEntry{
			PolicyID:   row.PolicyID,
			PolicyName: row.PolicyName,
			IsPaid:     row.IsPaid,
			IsEarly:    row.IsEarly,
			IsActive:   row.IsActive,
			UsedDays:   row.UsedDays,
			Balance:    row.Balance,
		}
		result[pos].Policies = append(result[pos].Policies, entry)
		result[pos].TotalUsed += row.UsedDays
		result[pos].TotalBalance += row.Balance
	}

	_ = order // ordering preserved via insertion sequence
	_ = strings.TrimSpace("") // import guard

	return result
}
