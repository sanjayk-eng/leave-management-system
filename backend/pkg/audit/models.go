// Package audit provides the write-side and read-side shapes for the audit log,
// the async service, the repository interface, and description generation.
//
// Two shapes, not one:
//   - AuditEntry  — the write side (passed to AuditSvc.Log). Contains the full diff,
//     actor/resource snapshots, and trace fields.
//   - ActivityEntry — the read side (returned by the feed API). Only display fields:
//     actor name, description, resource name, timestamp.
//
// Never collapse these into one struct.
package audit

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// ─────────────────────────────────────────────────────────────────────────────
// Write side — AuditEntry
// ─────────────────────────────────────────────────────────────────────────────

// AuditEntry is what a service passes to AuditSvc.Log().
// Every field marked "required" must be populated; omitting them is a logic error
// (the service will log a warning and drop the entry rather than persist garbage).
type AuditEntry struct {
	// WHO
	ActorID   uuid.UUID `json:"actor_id"`   // required
	ActorName string    `json:"actor_name"` // required
	ActorRole string    `json:"actor_role"` // required; use "System" for cron/automated actions

	// WHAT — dot-namespaced strings, e.g. "designation", "designation.created"
	Component string `json:"component"` // required; domain area
	Action    string `json:"action"`    // required; specific action within the domain

	// ON WHAT
	ResourceType string `json:"resource_type"` // required; e.g. "Designation"
	ResourceID   string `json:"resource_id"`   // required; UUID or other stable identifier
	ResourceName string `json:"resource_name"` // required; human-readable name

	// DIFF — populate for any state-changing operation.
	// Skip OldValue only for pure creates (nothing existed before).
	// Skip NewValue only for pure deletes (nothing remains after).
	OldValue interface{} `json:"old_value,omitempty"` // snapshot before the change
	NewValue interface{} `json:"new_value,omitempty"` // snapshot after the change

	// DISPLAY — optional; generated from Action via BuildDescription if empty.
	Description string `json:"description,omitempty"`

	// TRACE — optional extra context (IP address, request ID, etc.)
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// MarshalOldValue serialises OldValue to a JSON byte slice.
// Returns nil if OldValue is nil (pure create).
func (e *AuditEntry) MarshalOldValue() ([]byte, error) {
	if e.OldValue == nil {
		return nil, nil
	}
	return json.Marshal(e.OldValue)
}

// MarshalNewValue serialises NewValue to a JSON byte slice.
// Returns nil if NewValue is nil (pure delete).
func (e *AuditEntry) MarshalNewValue() ([]byte, error) {
	if e.NewValue == nil {
		return nil, nil
	}
	return json.Marshal(e.NewValue)
}

// MarshalMetadata serialises Metadata to a JSON byte slice.
func (e *AuditEntry) MarshalMetadata() ([]byte, error) {
	if len(e.Metadata) == 0 {
		return nil, nil
	}
	return json.Marshal(e.Metadata)
}

// Validate checks that the mandatory fields are present.
// A missing actor, resource, or action is not audit-grade.
func (e *AuditEntry) Validate() error {
	if e.ActorID == uuid.Nil {
		return fmt.Errorf("audit: ActorID is required")
	}
	if e.ActorName == "" {
		return fmt.Errorf("audit: ActorName is required")
	}
	if e.ActorRole == "" {
		return fmt.Errorf("audit: ActorRole is required")
	}
	if e.Component == "" {
		return fmt.Errorf("audit: Component is required")
	}
	if e.Action == "" {
		return fmt.Errorf("audit: Action is required")
	}
	if e.ResourceType == "" {
		return fmt.Errorf("audit: ResourceType is required")
	}
	if e.ResourceID == "" {
		return fmt.Errorf("audit: ResourceID is required")
	}
	if e.ResourceName == "" {
		return fmt.Errorf("audit: ResourceName is required")
	}
	return nil
}

// ─────────────────────────────────────────────────────────────────────────────
// Read side — ActivityEntry
// ─────────────────────────────────────────────────────────────────────────────

// ActivityEntry is what the feed API returns.
// Only display fields — never expose raw JSONB diffs or internal actor IDs
// unless explicitly requested by a separate admin-only endpoint.
type ActivityEntry struct {
	ID           uuid.UUID `json:"id"            db:"id"`
	ActorName    string    `json:"actor_name"    db:"actor_name"`
	ActorRole    string    `json:"actor_role"    db:"actor_role"`
	Component    string    `json:"component"     db:"component"`
	Action       string    `json:"action"        db:"action"`
	ResourceType string    `json:"resource_type" db:"resource_type"`
	ResourceName string    `json:"resource_name" db:"resource_name"`
	Description  string    `json:"description"   db:"description"`
	CreatedAt    time.Time `json:"created_at"    db:"created_at"`
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter — used by GetActivity
// ─────────────────────────────────────────────────────────────────────────────

// ActivityFilter holds the optional query parameters for the feed.
type ActivityFilter struct {
	ResourceID string // filter to history of a specific resource
	ActorID    string // filter to everything a specific actor did
	Component  string // filter to a specific domain component
	Action     string // filter to a specific action
	// Search does a case-insensitive substring match across actor_name,
	// description, and resource_name — powers the free-text search box.
	Search   string
	Page     int // 1-indexed; defaults to 1
	PageSize int // defaults to 20; max 100
}

// ─────────────────────────────────────────────────────────────────────────────
// Description generation — BuildDescription
// ─────────────────────────────────────────────────────────────────────────────

// BuildDescription generates a human-readable sentence from the AuditEntry.
// It is called at write time and the result is stored in the DB column —
// never reconstructed from JSONB on every read.
//
// Add a case here for every new action you introduce.
// Do not let an unlisted action fall through to the generic fallback silently
// — callers should notice the fallback string and add a proper case.
func BuildDescription(e *AuditEntry) string {
	switch e.Action {

	// ── Designation ──────────────────────────────────────────────────────────
	case "designation.created":
		return fmt.Sprintf("%s created designation \"%s\".", e.ActorName, e.ResourceName)
	case "designation.updated":
		return fmt.Sprintf("%s updated designation \"%s\".", e.ActorName, e.ResourceName)
	case "designation.deleted":
		return fmt.Sprintf("%s deleted designation \"%s\".", e.ActorName, e.ResourceName)

	// ── Employee ─────────────────────────────────────────────────────────────
	case "employee.created":
		return fmt.Sprintf("%s created employee account \"%s\".", e.ActorName, e.ResourceName)
	case "employee.updated":
		return fmt.Sprintf("%s updated employee \"%s\".", e.ActorName, e.ResourceName)
	case "employee.role_updated":
		return fmt.Sprintf("%s changed the role of \"%s\".", e.ActorName, e.ResourceName)
	case "employee.manager_updated":
		return fmt.Sprintf("%s updated the manager for \"%s\".", e.ActorName, e.ResourceName)
	case "employee.designation_updated":
		return fmt.Sprintf("%s assigned a new designation to \"%s\".", e.ActorName, e.ResourceName)
	case "employee.password_changed":
		return fmt.Sprintf("%s changed the password for \"%s\".", e.ActorName, e.ResourceName)
	case "employee.activated":
		return fmt.Sprintf("%s activated employee account \"%s\".", e.ActorName, e.ResourceName)
	case "employee.deactivated":
		return fmt.Sprintf("%s deactivated employee account \"%s\".", e.ActorName, e.ResourceName)

	// ── Leave ─────────────────────────────────────────────────────────────────
	case "leave.applied":
		return fmt.Sprintf("%s applied for leave (\"%s\").", e.ActorName, e.ResourceName)
	case "leave.approved":
		return fmt.Sprintf("%s approved the leave request for \"%s\".", e.ActorName, e.ResourceName)
	case "leave.rejected":
		return fmt.Sprintf("%s rejected the leave request for \"%s\".", e.ActorName, e.ResourceName)
	case "leave.cancelled":
		return fmt.Sprintf("%s cancelled the leave request \"%s\".", e.ActorName, e.ResourceName)
	case "leave.withdrawn":
		return fmt.Sprintf("%s withdrew the leave request \"%s\".", e.ActorName, e.ResourceName)
	case "leave.updated":
		return fmt.Sprintf("%s updated the leave request \"%s\".", e.ActorName, e.ResourceName)

	// ── Leave Approval Flow ───────────────────────────────────────────────────
	case "leave_approval_flow.created":
		return fmt.Sprintf("%s created leave approval flow \"%s\".", e.ActorName, e.ResourceName)
	case "leave_approval_flow.updated":
		return fmt.Sprintf("%s updated leave approval flow \"%s\".", e.ActorName, e.ResourceName)
	case "leave_approval_flow.deleted":
		return fmt.Sprintf("%s deleted leave approval flow \"%s\".", e.ActorName, e.ResourceName)

	// ── Leave Balance ─────────────────────────────────────────────────────────
	case "leave_balance.adjusted":
		return fmt.Sprintf("%s manually adjusted the leave balance for \"%s\".", e.ActorName, e.ResourceName)

	// ── Leave Policy ──────────────────────────────────────────────────────────
	case "leave_policy.created":
		return fmt.Sprintf("%s created leave policy \"%s\".", e.ActorName, e.ResourceName)
	case "leave_policy.updated":
		return fmt.Sprintf("%s updated leave policy \"%s\".", e.ActorName, e.ResourceName)
	case "leave_policy.deleted":
		return fmt.Sprintf("%s deleted leave policy \"%s\".", e.ActorName, e.ResourceName)

	// ── Holiday ───────────────────────────────────────────────────────────────
	case "holiday.created":
		return fmt.Sprintf("%s added holiday \"%s\".", e.ActorName, e.ResourceName)
	case "holiday.deleted":
		return fmt.Sprintf("%s removed holiday \"%s\".", e.ActorName, e.ResourceName)

	// ── Company Settings ──────────────────────────────────────────────────────
	case "settings.updated":
		return fmt.Sprintf("%s updated company settings.", e.ActorName)

	// ── Payroll ───────────────────────────────────────────────────────────────
	case "payroll.run":
		return fmt.Sprintf("%s ran payroll for \"%s\".", e.ActorName, e.ResourceName)
	case "payroll.finalized":
		return fmt.Sprintf("%s finalized payroll for \"%s\".", e.ActorName, e.ResourceName)

	// ── Asset / Equipment ─────────────────────────────────────────────────────
	case "asset.created":
		return fmt.Sprintf("%s added equipment \"%s\".", e.ActorName, e.ResourceName)
	case "asset.updated":
		return fmt.Sprintf("%s updated equipment \"%s\".", e.ActorName, e.ResourceName)
	case "asset.deleted":
		return fmt.Sprintf("%s removed equipment \"%s\".", e.ActorName, e.ResourceName)
	case "asset.assigned":
		return fmt.Sprintf("%s assigned equipment \"%s\".", e.ActorName, e.ResourceName)
	case "asset.unassigned":
		return fmt.Sprintf("%s returned equipment \"%s\".", e.ActorName, e.ResourceName)

	// ── Permission ────────────────────────────────────────────────────────────
	case "permission.updated":
		return fmt.Sprintf("%s updated role permissions for \"%s\".", e.ActorName, e.ResourceName)

	// ── Fallback — visible in production so callers notice and add a case ─────
	default:
		return fmt.Sprintf(
			"[UNREGISTERED ACTION: %q] %s performed %s on %s \"%s\".",
			e.Action, e.ActorName, e.Action, e.ResourceType, e.ResourceName,
		)
	}
}
