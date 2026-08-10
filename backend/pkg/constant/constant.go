// Package constant defines domain-wide string constants for leave statuses,
// birthday states, and other shared values.
package constant

// Leave status constants used throughout the leave workflow.
const (
	// LeaveReject is the action string for rejecting a leave request.
	LeaveReject = "REJECT"
	// LeaveApproved is the status set when a leave is fully approved.
	LeaveApproved = "APPROVED"
	// LeaveRejected is the status set when a leave is rejected.
	LeaveRejected = "REJECTED"
	// LeaveCancelled is the status set when a leave is cancelled by the employee.
	LeaveCancelled = "CANCELLED"
	// LeaveWithdrawn is the status set when a leave is fully withdrawn.
	LeaveWithdrawn = "WITHDRAWN"
	// LeavePending is the initial status for a newly applied leave.
	LeavePending = "Pending"
	// LeaveWithdrawalPending is set when withdrawal is initiated but not yet confirmed by all stages.
	LeaveWithdrawalPending = "WITHDRAWAL_PENDING"
)

// Aliases retained for backward compatibility with existing code.
// Deprecated: prefer the CamelCase names above.
//
//nolint:revive
const (
	LEAVE_REJECT             = LeaveReject
	LEAVE_APPLOVED           = LeaveApproved
	LEAVE_REJECTED           = LeaveRejected
	LEAVE_CANCELLED          = LeaveCancelled
	LEAVE_WITHDRAWN          = LeaveWithdrawn
	LEAVE_PENDING            = LeavePending
	LEAVE_WITHDRAWAL_PENDING = LeaveWithdrawalPending
)

// BirthdayStatus categorises an employee's birthday relative to today.
type BirthdayStatus string

const (
	// StatusToday marks an employee whose birthday is today.
	StatusToday BirthdayStatus = "TODAY"
	// StatusUpcoming marks an employee whose birthday is upcoming.
	StatusUpcoming BirthdayStatus = "UPCOMING"
	// StatusPast marks an employee whose birthday has already passed.
	StatusPast BirthdayStatus = "PAST"
)
