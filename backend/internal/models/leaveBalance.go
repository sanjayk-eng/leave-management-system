package models

import "github.com/google/uuid"

type Balance struct {
	LeaveTypeID int     `json:"leave_type_id"`
	LeaveType   string  `json:"leave_type"`
	Opening     float64 `json:"opening"`
	Accrued     float64 `json:"accrued"`
	Used        float64 `json:"used"`
	Adjusted    float64 `json:"adjusted"`
	Total       float64 `json:"total"`
	Available   float64 `json:"available"`
}
type LeaveTypeData struct {
	LeaveTypeID        int      `db:"leave_type_id"`
	LeaveTypeName      string   `db:"leave_type_name"`
	DefaultEntitlement float64  `db:"default_entitlement"`
	InternEntitlement  *float64 `db:"intern_entitlement"`
}

// BalanceData represents raw balance data from database
type BalanceData struct {
	LeaveTypeID int     `db:"leave_type_id"`
	Opening     float64 `db:"opening"`
	Accrued     float64 `db:"accrued"`
	Used        float64 `db:"used"`
	Adjusted    float64 `db:"adjusted"`
	Closing     float64 `db:"closing"`
}

// LeaveBalanceForAdjustment represents leave balance structure for adjustment operations
type LeaveBalanceForAdjustment struct {
	ID          uuid.UUID `db:"id"`
	Opening     float64   `db:"opening"`
	Accrued     float64   `db:"accrued"`
	Used        float64   `db:"used"`
	Adjusted    float64   `db:"adjusted"`
	Closing     float64   `db:"closing"`
	EmployeeID  uuid.UUID `db:"employee_id"`
	LeaveTypeID int       `db:"leave_type_id"`
	Year        int       `db:"year"`
}

type LeaveBalanceAdjustInput struct {
	LeaveTypeID int     `json:"leave_type_id" binding:"required"`
	Quantity    float64 `json:"quantity" binding:"required"` // +ve or -ve
	Reason      string  `json:"reason" binding:"required"`
}

type LeaveBalanceAdjustResult struct {
	EmployeeID   uuid.UUID
	LeaveTypeID  int
	Year         int
	OldAdjusted  float64
	OldClosing   float64
	NewAdjusted  float64
	NewClosing   float64
	QuantityDiff float64
	Reason       string
}

type EmployeeBalancesResult struct {
	EmployeeID uuid.UUID `json:"employee_id"`
	Year       int       `json:"year"`
	Balances   []Balance `json:"balances"`
}
