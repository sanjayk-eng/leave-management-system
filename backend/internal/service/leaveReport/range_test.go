package leavereport

import (
	"testing"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
)

func TestResolveDateRange_Monthly(t *testing.T) {
	req := &models.LeaveReportRequest{
		ReportType: string(ReportTypeMonthly),
		Month:      5,
		Year:       2026,
	}

	dr, err := resolveDateRange(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if dr.FromMonth != 5 || dr.FromYear != 2026 || dr.ToMonth != 5 || dr.ToYear != 2026 {
		t.Errorf("got %+v, want single-month range 5/2026", dr)
	}
}

func TestResolveDateRange_Yearly(t *testing.T) {
	req := &models.LeaveReportRequest{
		ReportType: string(ReportTypeYearly),
		Year:       2026,
	}

	dr, err := resolveDateRange(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if dr.FromMonth != 1 || dr.ToMonth != 12 || dr.FromYear != 2026 || dr.ToYear != 2026 {
		t.Errorf("got %+v, want Jan-Dec 2026", dr)
	}
}

func TestResolveDateRange_Range_Valid(t *testing.T) {
	req := &models.LeaveReportRequest{
		ReportType: string(ReportTypeRange),
		FromMonth:  1, FromYear: 2026,
		ToMonth: 6, ToYear: 2026,
	}

	dr, err := resolveDateRange(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if dr.spanMonths() != 5 {
		t.Errorf("got span %d, want 5", dr.spanMonths())
	}
}

func TestResolveDateRange_Range_FromAfterTo(t *testing.T) {
	req := &models.LeaveReportRequest{
		ReportType: string(ReportTypeRange),
		FromMonth:  6, FromYear: 2026,
		ToMonth: 1, ToYear: 2026,
	}

	_, err := resolveDateRange(req)
	if err != ErrInvalidDateRange {
		t.Errorf("got err=%v, want ErrInvalidDateRange", err)
	}
}

func TestResolveDateRange_Range_ExceedsMaxSpan(t *testing.T) {
	req := &models.LeaveReportRequest{
		ReportType: string(ReportTypeRange),
		FromMonth:  1, FromYear: 2000,
		ToMonth: 1, ToYear: 2026, // 26 years, way over 24 months
	}

	_, err := resolveDateRange(req)
	if err != ErrRangeTooLarge {
		t.Errorf("got err=%v, want ErrRangeTooLarge", err)
	}
}

func TestResolveDateRange_Range_ExactlyAtMaxSpan(t *testing.T) {
	// 24 months exactly should be allowed (boundary check)
	req := &models.LeaveReportRequest{
		ReportType: string(ReportTypeRange),
		FromMonth:  1, FromYear: 2024,
		ToMonth: 1, ToYear: 2026, // exactly 24 months
	}

	_, err := resolveDateRange(req)
	if err != nil {
		t.Errorf("unexpected error at exact max span boundary: %v", err)
	}
}

func TestResolveDateRange_Range_SameMonth(t *testing.T) {
	// from == to should be valid (zero-width range)
	req := &models.LeaveReportRequest{
		ReportType: string(ReportTypeRange),
		FromMonth:  3, FromYear: 2026,
		ToMonth: 3, ToYear: 2026,
	}

	dr, err := resolveDateRange(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if dr.spanMonths() != 0 {
		t.Errorf("got span %d, want 0", dr.spanMonths())
	}
}

func TestResolveDateRange_InvalidReportType(t *testing.T) {
	req := &models.LeaveReportRequest{ReportType: "weekly"}

	_, err := resolveDateRange(req)
	if err != ErrInvalidReportType {
		t.Errorf("got err=%v, want ErrInvalidReportType", err)
	}
}
