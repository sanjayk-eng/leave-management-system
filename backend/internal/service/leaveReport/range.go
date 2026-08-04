package leavereport

import "github.com/Zenithive/LeaveManagementSystem/internal/models"

// dateRange is an internal, resolved month/year window for a report.
type dateRange struct {
	FromMonth, FromYear int
	ToMonth, ToYear     int
}

func (d dateRange) totalFrom() int  { return d.FromYear*12 + d.FromMonth }
func (d dateRange) totalTo() int    { return d.ToYear*12 + d.ToMonth }
func (d dateRange) spanMonths() int { return d.totalTo() - d.totalFrom() }

// resolveDateRange converts a report request into a concrete from/to window,
// enforcing chronological order and max span for range-type reports.
// This is pure and has no external dependencies — easy to table-test.
func resolveDateRange(req *models.LeaveReportRequest) (dateRange, error) {
	switch ReportType(req.ReportType) {

	case ReportTypeMonthly:
		return dateRange{
			FromMonth: req.Month, FromYear: req.Year,
			ToMonth: req.Month, ToYear: req.Year,
		}, nil

	case ReportTypeYearly:
		return dateRange{
			FromMonth: 1, FromYear: req.Year,
			ToMonth: 12, ToYear: req.Year,
		}, nil

	case ReportTypeRange:
		dr := dateRange{
			FromMonth: req.FromMonth, FromYear: req.FromYear,
			ToMonth: req.ToMonth, ToYear: req.ToYear,
		}
		if dr.totalFrom() > dr.totalTo() {
			return dateRange{}, ErrInvalidDateRange
		}
		if dr.spanMonths() > MaxRangeMonths {
			return dateRange{}, ErrRangeTooLarge
		}
		return dr, nil

	default:
		return dateRange{}, ErrInvalidReportType
	}
}
