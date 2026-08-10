package notification

// Type identifies which kind of notification event occurred.
type Type string

const (
	// LeaveApplied is fired when an employee submits a leave request.
	LeaveApplied          Type = "LEAVE_APPLIED"
	// LeaveApproved is fired when a leave request is fully approved.
	LeaveApproved         Type = "LEAVE_APPROVED"
	LeaveRejected         Type = "LEAVE_REJECTED"
	LeaveWithdrawn        Type = "LEAVE_WITHDRAWN"
	LeaveWithdrawalPending Type = "LEAVE_WITHDRAWAL_PENDING"
	LeaveCancelled        Type = "LEAVE_CANCELLED"

	// EmployeeCreated is fired when a new employee account is created.
	EmployeeCreated Type = "EMPLOYEE_CREATED"
	EmployeeUpdated Type = "EMPLOYEE_UPDATED"

	// PasswordReset is fired when a password reset is requested.
	PasswordReset   Type = "PASSWORD_RESET"
	PasswordChanged Type = "PASSWORD_CHANGED"
)

// Event is the generic envelope published onto the notification bus.
// Data must be one of the typed payloads defined in notification/models/.
type Event struct {
	Type Type
	Data any
}
