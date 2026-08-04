package service

// leaveBalance_test.go — unit tests for the leave balance business logic.
//
// Scope: pure business-logic functions that require no database connection.
//
//   - ProratedLeave                  — core proration formula
//   - calculateClosingBalance        — opening - used + adjusted
//   - calculateEntitlementAsOf       — role selection + prior-year bypass + proration
//   - calculateLeaveBalances         — merging leave-type rows with balance records
//
// All tests run with go test ./internal/service/... -run ^Test
// No mocks, no DB — these are pure unit tests.

import (
	"testing"
	"time"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	accessrole "github.com/Zenithive/LeaveManagementSystem/pkg/accessrole"
)

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────

// svc returns a zero-value leaveBalance with no deps — sufficient for pure
// methods that don't touch DB, repo, or external services.
func svc() *leaveBalance { return &leaveBalance{} }

// dateInCurrentYear builds a date in the current calendar year.
func dateInCurrentYear(month time.Month, day int) time.Time {
	return time.Date(time.Now().Year(), month, day, 0, 0, 0, 0, time.UTC)
}

// dateInPriorYear builds a date one year before the current calendar year.
func dateInPriorYear(month time.Month, day int) time.Time {
	return time.Date(time.Now().Year()-1, month, day, 0, 0, 0, 0, time.UTC)
}

// ptr helpers
func intPtr(v int) *int       { return &v }
func timePtr(t time.Time) *time.Time { return &t }

// ─────────────────────────────────────────────────────────────────────────────
// ProratedLeave
// ─────────────────────────────────────────────────────────────────────────────

func TestProratedLeave_January_FullYear(t *testing.T) {
	// January → remainingMonths = 13-1 = 12 → full entitlement
	asOf := dateInCurrentYear(time.January, 1)
	got := ProratedLeave(24, asOf)
	if got != 24 {
		t.Errorf("January: got %.1f, want 24", got)
	}
}

func TestProratedLeave_July_HalfYear(t *testing.T) {
	// July → remainingMonths = 13-7 = 6 → 24 × 6/12 = 12.0
	asOf := dateInCurrentYear(time.July, 1)
	got := ProratedLeave(24, asOf)
	if got != 12 {
		t.Errorf("July/24: got %.1f, want 12", got)
	}
}

func TestProratedLeave_December_OneMonth(t *testing.T) {
	// December → remainingMonths = 13-12 = 1 → 24 × 1/12 = 2.0
	asOf := dateInCurrentYear(time.December, 1)
	got := ProratedLeave(24, asOf)
	if got != 2 {
		t.Errorf("December/24: got %.1f, want 2", got)
	}
}

func TestProratedLeave_RoundUpToHalf(t *testing.T) {
	// 18 days, August → 18 × 5/12 = 7.5 → rounds to 7.5
	asOf := dateInCurrentYear(time.August, 1)
	got := ProratedLeave(18, asOf)
	if got != 7.5 {
		t.Errorf("August/18: got %.1f, want 7.5", got)
	}
}

func TestProratedLeave_RoundDown(t *testing.T) {
	// 12 days, October → 12 × 3/12 = 3.0 → rounds to 3.0
	asOf := dateInCurrentYear(time.October, 1)
	got := ProratedLeave(12, asOf)
	if got != 3 {
		t.Errorf("October/12: got %.1f, want 3", got)
	}
}

func TestProratedLeave_FutureYear_ReturnsFullEntitlement(t *testing.T) {
	// A date in a future year is outside current year → full entitlement fallback
	asOf := time.Date(time.Now().Year()+2, time.June, 1, 0, 0, 0, 0, time.UTC)
	got := ProratedLeave(18, asOf)
	if got != 18 {
		t.Errorf("future year: got %.1f, want 18 (full)", got)
	}
}

func TestProratedLeave_PastYear_ReturnsFullEntitlement(t *testing.T) {
	// A date in a prior year → full entitlement fallback (safety net)
	asOf := dateInPriorYear(time.March, 1)
	got := ProratedLeave(18, asOf)
	if got != 18 {
		t.Errorf("prior year: got %.1f, want 18 (full)", got)
	}
}

func TestProratedLeave_ZeroEntitlement(t *testing.T) {
	asOf := dateInCurrentYear(time.June, 1)
	got := ProratedLeave(0, asOf)
	if got != 0 {
		t.Errorf("zero entitlement: got %.1f, want 0", got)
	}
}

// Rounding table: verify nearest-0.5 rounding for various raw values
func TestProratedLeave_RoundingTable(t *testing.T) {
	// Use March so remainingMonths = 10
	asOf := dateInCurrentYear(time.March, 1)

	cases := []struct {
		annual int
		want   float64
		label  string
	}{
		// 15 × 10/12 = 12.5   → rounds to 12.5
		{15, 12.5, "15d March"},
		// 10 × 10/12 = 8.333  → fraction 0.333 → rounds to nearest 0.5 = 8.5
		{10, 8.5, "10d March"},
		// 7 × 10/12 = 5.833   → fraction 0.833 ≥ 0.75 → rounds up = 6.0
		{7, 6.0, "7d March"},
		// 20 × 10/12 = 16.666 → fraction 0.666 in [0.25,0.75) → 16.5
		{20, 16.5, "20d March"},
	}

	for _, tc := range cases {
		got := ProratedLeave(tc.annual, asOf)
		if got != tc.want {
			t.Errorf("[%s] ProratedLeave(%d) = %.2f, want %.2f", tc.label, tc.annual, got, tc.want)
		}
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// calculateClosingBalance
// ─────────────────────────────────────────────────────────────────────────────

func TestCalculateClosingBalance_PositiveBalance(t *testing.T) {
	// opening=18, used=5, adjusted=0 → closing=13
	got := svc().calculateClosingBalance(18, 5, 0)
	if got != 13 {
		t.Errorf("got %.1f, want 13", got)
	}
}

func TestCalculateClosingBalance_WithPositiveAdjustment(t *testing.T) {
	// opening=10, used=4, adjusted=+3 → closing=9
	got := svc().calculateClosingBalance(10, 4, 3)
	if got != 9 {
		t.Errorf("got %.1f, want 9", got)
	}
}

func TestCalculateClosingBalance_WithNegativeAdjustment(t *testing.T) {
	// opening=10, used=2, adjusted=-2 → closing=6
	got := svc().calculateClosingBalance(10, 2, -2)
	if got != 6 {
		t.Errorf("got %.1f, want 6", got)
	}
}

func TestCalculateClosingBalance_Deficit(t *testing.T) {
	// opening=5, used=8, adjusted=0 → closing=-3 (deficit — intentionally allowed)
	got := svc().calculateClosingBalance(5, 8, 0)
	if got != -3 {
		t.Errorf("deficit case: got %.1f, want -3", got)
	}
}

func TestCalculateClosingBalance_DeficitRecoveredByAdjustment(t *testing.T) {
	// opening=5, used=8, adjusted=+5 → closing=2
	got := svc().calculateClosingBalance(5, 8, 5)
	if got != 2 {
		t.Errorf("deficit+adj: got %.1f, want 2", got)
	}
}

func TestCalculateClosingBalance_AllZero(t *testing.T) {
	got := svc().calculateClosingBalance(0, 0, 0)
	if got != 0 {
		t.Errorf("all zero: got %.1f, want 0", got)
	}
}

func TestCalculateClosingBalance_FractionalDays(t *testing.T) {
	// opening=7.5, used=2.5, adjusted=1.0 → closing=6.0
	got := svc().calculateClosingBalance(7.5, 2.5, 1.0)
	if got != 6.0 {
		t.Errorf("fractional: got %.2f, want 6.0", got)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// calculateEntitlementAsOf
// ─────────────────────────────────────────────────────────────────────────────

func TestCalculateEntitlementAsOf_EmployeeRole_UseDefaultEntitlement(t *testing.T) {
	joiningDate := dateInCurrentYear(time.January, 1)
	asOf        := dateInCurrentYear(time.January, 1)
	internEnt   := intPtr(12)

	// EMPLOYEE role → should use defaultEntitlement (18), not intern (12)
	got := svc().calculateEntitlementAsOf(accessrole.ROLE_EMPLOYEE, &joiningDate, 18, internEnt, asOf)
	// Jan asOf → 18 × 12/12 = 18
	if got != 18 {
		t.Errorf("EMPLOYEE role: got %.1f, want 18", got)
	}
}

func TestCalculateEntitlementAsOf_InternRole_UseInternEntitlement(t *testing.T) {
	joiningDate := dateInCurrentYear(time.January, 1)
	asOf        := dateInCurrentYear(time.January, 1)
	internEnt   := intPtr(12)

	// INTERN role → should use internEntitlement (12), full year from Jan
	got := svc().calculateEntitlementAsOf(accessrole.ROLE_INTERN, &joiningDate, 18, internEnt, asOf)
	if got != 12 {
		t.Errorf("INTERN role: got %.1f, want 12", got)
	}
}

func TestCalculateEntitlementAsOf_InternRole_NilInternEntitlement_FallsBackToDefault(t *testing.T) {
	joiningDate := dateInCurrentYear(time.January, 1)
	asOf        := dateInCurrentYear(time.January, 1)

	// INTERN but no intern entitlement configured → falls back to default (18)
	got := svc().calculateEntitlementAsOf(accessrole.ROLE_INTERN, &joiningDate, 18, nil, asOf)
	if got != 18 {
		t.Errorf("INTERN nil intern ent: got %.1f, want 18", got)
	}
}

func TestCalculateEntitlementAsOf_PriorYearEmployee_FullEntitlement(t *testing.T) {
	joiningDate := dateInPriorYear(time.March, 15)
	// asOf in current year July — but prior-year joiner gets full entitlement regardless
	asOf := dateInCurrentYear(time.July, 1)

	got := svc().calculateEntitlementAsOf(accessrole.ROLE_EMPLOYEE, &joiningDate, 18, nil, asOf)
	if got != 18 {
		t.Errorf("prior-year employee: got %.1f, want 18 (full)", got)
	}
}

func TestCalculateEntitlementAsOf_PriorYearIntern_FullInternEntitlement(t *testing.T) {
	joiningDate := dateInPriorYear(time.June, 1)
	asOf        := dateInCurrentYear(time.August, 1)
	internEnt   := intPtr(12)

	// Prior-year joiner → full entitlement → uses intern rate (12)
	got := svc().calculateEntitlementAsOf(accessrole.ROLE_INTERN, &joiningDate, 18, internEnt, asOf)
	if got != 12 {
		t.Errorf("prior-year intern: got %.1f, want 12 (full intern)", got)
	}
}

func TestCalculateEntitlementAsOf_NilJoiningDate_Prorated(t *testing.T) {
	// nil joining date → no prior-year bypass → normal proration applies
	asOf := dateInCurrentYear(time.July, 1)
	// July → remaining = 6 months → 18 × 6/12 = 9
	got := svc().calculateEntitlementAsOf(accessrole.ROLE_EMPLOYEE, nil, 18, nil, asOf)
	if got != 9 {
		t.Errorf("nil joining date: got %.1f, want 9", got)
	}
}

func TestCalculateEntitlementAsOf_CurrentYearJoiner_Prorated(t *testing.T) {
	joiningDate := dateInCurrentYear(time.August, 1)
	asOf        := dateInCurrentYear(time.August, 1)
	// Aug → remaining = 5 months → 18 × 5/12 = 7.5
	got := svc().calculateEntitlementAsOf(accessrole.ROLE_EMPLOYEE, &joiningDate, 18, nil, asOf)
	if got != 7.5 {
		t.Errorf("current-year joiner Aug: got %.1f, want 7.5", got)
	}
}

func TestCalculateEntitlementAsOf_InternCurrentYearJoiner_Prorated(t *testing.T) {
	joiningDate := dateInCurrentYear(time.September, 1)
	asOf        := dateInCurrentYear(time.September, 1)
	internEnt   := intPtr(12)
	// Sep → remaining = 4 months → 12 × 4/12 = 4.0
	got := svc().calculateEntitlementAsOf(accessrole.ROLE_INTERN, &joiningDate, 18, internEnt, asOf)
	if got != 4 {
		t.Errorf("intern current-year Sep: got %.1f, want 4", got)
	}
}

func TestCalculateEntitlementAsOf_PolicyAsOfLaterThanJoining(t *testing.T) {
	// Employee joined in March, but policy anchor is August.
	// asOf = August (caller has already taken the later of the two).
	joiningDate := dateInCurrentYear(time.March, 1)
	asOf        := dateInCurrentYear(time.August, 1)
	// Aug → 18 × 5/12 = 7.5
	got := svc().calculateEntitlementAsOf(accessrole.ROLE_EMPLOYEE, &joiningDate, 18, nil, asOf)
	if got != 7.5 {
		t.Errorf("policy asOf later than joining: got %.1f, want 7.5", got)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// calculateLeaveBalances
// ─────────────────────────────────────────────────────────────────────────────

func TestCalculateLeaveBalances_MergesCorrectly(t *testing.T) {
	leaveTypes := []models.LeaveTypeData{
		{LeaveTypeID: 1, LeaveTypeName: "Annual Leave", DefaultEntitlement: 18},
		{LeaveTypeID: 2, LeaveTypeName: "Sick Leave",   DefaultEntitlement: 10},
	}
	records := []models.BalanceData{
		{LeaveTypeID: 1, Opening: 15, Accrued: 2, Used: 5, Adjusted: 1, Closing: 11},
		{LeaveTypeID: 2, Opening: 8,  Accrued: 0, Used: 3, Adjusted: 0, Closing: 5},
	}

	balances := svc().calculateLeaveBalances(leaveTypes, records)

	if len(balances) != 2 {
		t.Fatalf("expected 2 balances, got %d", len(balances))
	}

	// Annual Leave
	al := balances[0]
	if al.LeaveTypeID != 1 {
		t.Errorf("wrong leave type id: got %d", al.LeaveTypeID)
	}
	if al.LeaveType != "Annual Leave" {
		t.Errorf("wrong leave type name: got %s", al.LeaveType)
	}
	if al.Opening != 15 {
		t.Errorf("opening: got %.1f, want 15", al.Opening)
	}
	if al.Used != 5 {
		t.Errorf("used: got %.1f, want 5", al.Used)
	}
	if al.Adjusted != 1 {
		t.Errorf("adjusted: got %.1f, want 1", al.Adjusted)
	}
	// Total = opening + adjusted = 15+1 = 16
	if al.Total != 16 {
		t.Errorf("total: got %.1f, want 16", al.Total)
	}
	// Available = closing = opening - used + adjusted = 15-5+1 = 11
	if al.Available != 11 {
		t.Errorf("available: got %.1f, want 11", al.Available)
	}

	// Sick Leave
	sl := balances[1]
	if sl.Available != 5 {
		t.Errorf("sick leave available: got %.1f, want 5", sl.Available)
	}
}

func TestCalculateLeaveBalances_MissingBalanceRecord_DefaultsToZero(t *testing.T) {
	// Leave type 3 has no balance record in DB — should default all fields to 0
	leaveTypes := []models.LeaveTypeData{
		{LeaveTypeID: 3, LeaveTypeName: "WFH", DefaultEntitlement: 12},
	}
	records := []models.BalanceData{} // empty — no record for type 3

	balances := svc().calculateLeaveBalances(leaveTypes, records)

	if len(balances) != 1 {
		t.Fatalf("expected 1 balance, got %d", len(balances))
	}

	b := balances[0]
	if b.Opening != 0 || b.Used != 0 || b.Adjusted != 0 || b.Available != 0 || b.Total != 0 {
		t.Errorf("missing record should produce all-zero balance, got %+v", b)
	}
}

func TestCalculateLeaveBalances_MultipleTypes_WithMissingRecord(t *testing.T) {
	leaveTypes := []models.LeaveTypeData{
		{LeaveTypeID: 1, LeaveTypeName: "Annual Leave", DefaultEntitlement: 18},
		{LeaveTypeID: 2, LeaveTypeName: "Unpaid Leave", DefaultEntitlement: 0},
		{LeaveTypeID: 3, LeaveTypeName: "WFH",          DefaultEntitlement: 12},
	}
	// Only type 1 has a record
	records := []models.BalanceData{
		{LeaveTypeID: 1, Opening: 18, Accrued: 0, Used: 3, Adjusted: 0, Closing: 15},
	}

	balances := svc().calculateLeaveBalances(leaveTypes, records)

	if len(balances) != 3 {
		t.Fatalf("expected 3 balances, got %d", len(balances))
	}

	// Type 1 should have real data
	if balances[0].Available != 15 {
		t.Errorf("type1 available: got %.1f, want 15", balances[0].Available)
	}
	// Types 2 and 3 should be zero
	for _, b := range balances[1:] {
		if b.Available != 0 || b.Used != 0 {
			t.Errorf("type %d should be zero, got opening=%.1f used=%.1f", b.LeaveTypeID, b.Opening, b.Used)
		}
	}
}

func TestCalculateLeaveBalances_AssociateMonthPropagated(t *testing.T) {
	month := 8 // August
	leaveTypes := []models.LeaveTypeData{
		{LeaveTypeID: 1, LeaveTypeName: "Annual Leave", DefaultEntitlement: 18, AssociateMonth: intPtr(month)},
	}
	records := []models.BalanceData{
		{LeaveTypeID: 1, Opening: 7.5, Used: 0, Adjusted: 0, Closing: 7.5},
	}

	balances := svc().calculateLeaveBalances(leaveTypes, records)

	if balances[0].AssociateMonth == nil || *balances[0].AssociateMonth != month {
		t.Errorf("associate_month not propagated correctly, got %v", balances[0].AssociateMonth)
	}
}

func TestCalculateLeaveBalances_NegativeBalance_Deficit(t *testing.T) {
	// Employee used more than their entitlement (deficit scenario)
	leaveTypes := []models.LeaveTypeData{
		{LeaveTypeID: 1, LeaveTypeName: "Annual Leave", DefaultEntitlement: 18},
	}
	records := []models.BalanceData{
		{LeaveTypeID: 1, Opening: 5, Accrued: 0, Used: 8, Adjusted: 0, Closing: -3},
	}

	balances := svc().calculateLeaveBalances(leaveTypes, records)

	// Available = 5-8+0 = -3
	if balances[0].Available != -3 {
		t.Errorf("deficit: available got %.1f, want -3", balances[0].Available)
	}
}

func TestCalculateLeaveBalances_PreservesOrderOfLeaveTypes(t *testing.T) {
	leaveTypes := []models.LeaveTypeData{
		{LeaveTypeID: 10, LeaveTypeName: "Z Leave", DefaultEntitlement: 5},
		{LeaveTypeID: 20, LeaveTypeName: "A Leave", DefaultEntitlement: 10},
		{LeaveTypeID: 30, LeaveTypeName: "M Leave", DefaultEntitlement: 8},
	}
	records := []models.BalanceData{}

	balances := svc().calculateLeaveBalances(leaveTypes, records)

	if balances[0].LeaveTypeID != 10 || balances[1].LeaveTypeID != 20 || balances[2].LeaveTypeID != 30 {
		t.Errorf("order not preserved: got ids %d %d %d", balances[0].LeaveTypeID, balances[1].LeaveTypeID, balances[2].LeaveTypeID)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Integration: ProratedLeave + calculateClosingBalance together
// ─────────────────────────────────────────────────────────────────────────────

func TestProratedLeave_ThenClosingBalance_FullScenario(t *testing.T) {
	// Scenario: new employee joins in August (current year).
	// Policy: 18 days annual.
	// Aug → prorated = 18 × 5/12 = 7.5
	// Employee uses 3 days, no adjustment.
	// Closing = 7.5 - 3 + 0 = 4.5
	asOf    := dateInCurrentYear(time.August, 1)
	opening := ProratedLeave(18, asOf)
	if opening != 7.5 {
		t.Fatalf("opening: got %.1f, want 7.5", opening)
	}
	closing := svc().calculateClosingBalance(opening, 3, 0)
	if closing != 4.5 {
		t.Errorf("closing: got %.1f, want 4.5", closing)
	}
}

func TestProratedLeave_ThenClosingBalance_Deficit(t *testing.T) {
	// Policy changes anchor from Jan → Jul mid-year.
	// Annual = 18. New opening = 18 × 6/12 = 9.
	// Employee already used 12. Closing = 9 - 12 + 0 = -3.
	asOf    := dateInCurrentYear(time.July, 1)
	opening := ProratedLeave(18, asOf)
	if opening != 9 {
		t.Fatalf("opening: got %.1f, want 9", opening)
	}
	closing := svc().calculateClosingBalance(opening, 12, 0)
	if closing != -3 {
		t.Errorf("deficit closing: got %.1f, want -3", closing)
	}
}

func TestProratedLeave_ThenClosingBalance_AdjustmentCoversDeficit(t *testing.T) {
	// Same deficit scenario, but admin adds +5 adjustment.
	// Closing = 9 - 12 + 5 = 2
	asOf    := dateInCurrentYear(time.July, 1)
	opening := ProratedLeave(18, asOf)
	closing := svc().calculateClosingBalance(opening, 12, 5)
	if closing != 2 {
		t.Errorf("adjusted closing: got %.1f, want 2", closing)
	}
}
