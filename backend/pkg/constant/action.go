// Package constant provides domain-wide constants for audit actions, components, and leave statuses.
package constant

// Audit action constants used for recording what operation was performed.
const (
	// ActionCreate represents a resource creation event.
	ActionCreate = "create"
	// ActionUpdate represents a resource update event.
	ActionUpdate     = "update"
	ActionDelete     = "delete"
	ActionApproval   = "approval"
	ActionRejection  = "rejection"
	ActionRun        = "run"
	ActionFinalize   = "finalize"
	ActionCancel     = "cancel"
	ActionWithdrawal = "withdrawal"
)
