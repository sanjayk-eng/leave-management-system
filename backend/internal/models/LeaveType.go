package models

import "time"

type LeaveTypeInput struct {
	Name               string  `json:"name" validate:"required"`
	IsPaid             *bool   `json:"is_paid,omitempty"`
	IsEarly            *bool   `json:"is_early,omitempty" validate:"omitempty"`
	IsWorkFromHome     *bool   `json:"is_work_from_home,omitempty"`
	DefaultEntitlement *int    `json:"default_entitlement,omitempty"`
	InternEntitlement  *int    `json:"intern_entitlement,omitempty"`
	LeaveCount         *int    `json:"leave_count,omitempty" validate:"omitempty,gt=0"`
	ApprovalFlowID     *string `json:"approval_flow_id,omitempty"`
	IsActive           *bool   `json:"is_active,omitempty"`
	// AssociateMonth is the 1-12 month used as the proration anchor when
	// allocating balances for a newly created policy.
	// If nil or 0, defaults to the current calendar month.
	AssociateMonth *int `json:"associate_month,omitempty"`
}

// ----------------- LEAVE TYPE -----------------
type LeaveType struct {
	ID                 int       `json:"id" db:"id"`
	Name               string    `json:"name" db:"name"`
	IsPaid             bool      `json:"is_paid" db:"is_paid"`
	DefaultEntitlement int       `json:"default_entitlement" db:"default_entitlement"`
	InternEntitlement  *int      `json:"intern_entitlement,omitempty" db:"intern_entitlement"`
	IsEarly            *bool     `json:"is_early,omitempty" db:"is_early"`
	IsWorkFromHome     bool      `json:"is_work_from_home" db:"is_work_from_home"`
	IsActive           bool      `json:"is_active" db:"is_active"`
	ApprovalFlowID     *string   `json:"approval_flow_id,omitempty" db:"approval_flow_id"`
	// AssociateMonth is the 1-12 proration anchor month stored at policy creation time.
	// NULL for legacy policies — callers fall back to EXTRACT(MONTH FROM created_at).
	AssociateMonth     *int      `json:"associate_month,omitempty" db:"associate_month"`
	CreatedAt          time.Time `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time `json:"updated_at" db:"updated_at"`
}

// LeaveTypeResponse is a LeaveType with its ApprovalFlow nested inside it.
type LeaveTypeResponse struct {
	ID                 int                        `json:"id"`
	Name               string                     `json:"name"`
	IsPaid             bool                       `json:"is_paid"`
	DefaultEntitlement int                        `json:"default_entitlement"`
	InternEntitlement  *int                       `json:"intern_entitlement,omitempty"`
	IsEarly            *bool                      `json:"is_early,omitempty"`
	IsWorkFromHome     bool                       `json:"is_work_from_home"`
	IsActive           bool                       `json:"is_active"`
	ApprovalFlowID     *string                    `json:"approval_flow_id,omitempty"`
	AssociateMonth     *int                       `json:"associate_month,omitempty"`
	CreatedAt          time.Time                  `json:"created_at"`
	UpdatedAt          time.Time                  `json:"updated_at"`
	ApprovalFlow       *LeaveApprovalFlowResponse `json:"approval_flow,omitempty"`
}

type LeaveTypeRow struct {
	ID                 int  `db:"id"`
	DefaultEntitlement int  `db:"default_entitlement"`
	InternEntitlement  *int `db:"intern_entitlement"`
}

// MappPayload builds a LeaveTypeResponse with ApprovalFlow nested inside LeaveType.
func MappPayload(leavetype *LeaveType, leaveApprovalFlow *LeaveApprovalFlowResponse) *LeaveTypeResponse {
	res := &LeaveTypeResponse{
		ID:                 leavetype.ID,
		Name:               leavetype.Name,
		IsPaid:             leavetype.IsPaid,
		DefaultEntitlement: leavetype.DefaultEntitlement,
		InternEntitlement:  leavetype.InternEntitlement,
		IsEarly:            leavetype.IsEarly,
		IsWorkFromHome:     leavetype.IsWorkFromHome,
		IsActive:           leavetype.IsActive,
		ApprovalFlowID:     leavetype.ApprovalFlowID,
		AssociateMonth:     leavetype.AssociateMonth,
		CreatedAt:          leavetype.CreatedAt,
		UpdatedAt:          leavetype.UpdatedAt,
	}

	if leaveApprovalFlow != nil && leavetype.ApprovalFlowID != nil && *leavetype.ApprovalFlowID != "" {
		res.ApprovalFlow = leaveApprovalFlow
	}

	return res
}
