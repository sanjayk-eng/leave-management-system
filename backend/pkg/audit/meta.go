package audit

// ─────────────────────────────────────────────────────────────────────────────
// Meta — single source of truth for every registered component and action.
//
// This is the ONLY place the component/action catalogue lives on the backend.
// BuildDescription's switch cases must match this list exactly.
//
// The GET /api/logs/meta endpoint serves this to the frontend so the filter
// dropdowns are always in sync with the backend — zero hardcoding on the
// client side. Adding a new action here (and in BuildDescription) is all that
// is needed for it to appear in the UI.
// ─────────────────────────────────────────────────────────────────────────────

// ActionMeta is one entry in the meta catalogue.
type ActionMeta struct {
	// Component is the domain area, e.g. "designation".
	Component string `json:"component"`
	// Action is the dot-namespaced action, e.g. "designation.created".
	Action string `json:"action"`
	// Label is the human-readable display string for filter UIs.
	Label string `json:"label"`
}

// ComponentMeta groups all actions under one domain area.
type ComponentMeta struct {
	Value   string       `json:"value"`
	Label   string       `json:"label"`
	Actions []ActionMeta `json:"actions"`
}

// MetaResponse is what GET /api/logs/meta returns.
type MetaResponse struct {
	// Components is the flat, deduplicated list of component values.
	Components []ComponentMeta `json:"components"`
	// Actions is the full flat list — useful for an "all actions" search dropdown.
	Actions []ActionMeta `json:"actions"`
}

// GetMeta returns the canonical catalogue of every component and action.
// The frontend uses this to populate filter dropdowns dynamically.
// RULE: every entry here must have a corresponding case in BuildDescription.
func GetMeta() MetaResponse {
	all := []ActionMeta{
		// ── Designation ──────────────────────────────────────────────────
		{Component: "designation", Action: "designation.created", Label: "Designation — Created"},
		{Component: "designation", Action: "designation.updated", Label: "Designation — Updated"},
		{Component: "designation", Action: "designation.deleted", Label: "Designation — Deleted"},

		// ── Employee ─────────────────────────────────────────────────────
		{Component: "employee", Action: "employee.created",             Label: "Employee — Created"},
		{Component: "employee", Action: "employee.updated",             Label: "Employee — Updated"},
		{Component: "employee", Action: "employee.role_updated",        Label: "Employee — Role Updated"},
		{Component: "employee", Action: "employee.manager_updated",     Label: "Employee — Manager Updated"},
		{Component: "employee", Action: "employee.designation_updated", Label: "Employee — Designation Updated"},
		{Component: "employee", Action: "employee.password_changed",    Label: "Employee — Password Changed"},
		{Component: "employee", Action: "employee.activated",           Label: "Employee — Activated"},
		{Component: "employee", Action: "employee.deactivated",         Label: "Employee — Deactivated"},

		// ── Leave ─────────────────────────────────────────────────────────
		{Component: "leave", Action: "leave.applied",   Label: "Leave — Applied"},
		{Component: "leave", Action: "leave.approved",  Label: "Leave — Approved"},
		{Component: "leave", Action: "leave.rejected",  Label: "Leave — Rejected"},
		{Component: "leave", Action: "leave.cancelled", Label: "Leave — Cancelled"},
		{Component: "leave", Action: "leave.withdrawn", Label: "Leave — Withdrawn"},
		{Component: "leave", Action: "leave.updated",   Label: "Leave — Updated"},

		// ── Leave Approval Flow ───────────────────────────────────────────
		{Component: "leave_approval_flow", Action: "leave_approval_flow.created", Label: "Leave Approval Flow — Created"},
		{Component: "leave_approval_flow", Action: "leave_approval_flow.updated", Label: "Leave Approval Flow — Updated"},
		{Component: "leave_approval_flow", Action: "leave_approval_flow.deleted", Label: "Leave Approval Flow — Deleted"},

		// ── Leave Balance ─────────────────────────────────────────────────
		{Component: "leave_balance", Action: "leave_balance.adjusted", Label: "Leave Balance — Adjusted"},

		// ── Leave Policy ──────────────────────────────────────────────────
		{Component: "leave_policy", Action: "leave_policy.created", Label: "Leave Policy — Created"},
		{Component: "leave_policy", Action: "leave_policy.updated", Label: "Leave Policy — Updated"},
		{Component: "leave_policy", Action: "leave_policy.deleted", Label: "Leave Policy — Deleted"},

		// ── Holiday ───────────────────────────────────────────────────────
		{Component: "holiday", Action: "holiday.created", Label: "Holiday — Created"},
		{Component: "holiday", Action: "holiday.deleted", Label: "Holiday — Deleted"},

		// ── Settings ──────────────────────────────────────────────────────
		{Component: "settings", Action: "settings.updated", Label: "Settings — Updated"},

		// ── Payroll ───────────────────────────────────────────────────────
		{Component: "payroll", Action: "payroll.run",       Label: "Payroll — Run"},
		{Component: "payroll", Action: "payroll.finalized", Label: "Payroll — Finalized"},

		// ── Asset ─────────────────────────────────────────────────────────
		{Component: "asset", Action: "asset.created",    Label: "Asset — Created"},
		{Component: "asset", Action: "asset.updated",    Label: "Asset — Updated"},
		{Component: "asset", Action: "asset.deleted",    Label: "Asset — Deleted"},
		{Component: "asset", Action: "asset.assigned",   Label: "Asset — Assigned"},
		{Component: "asset", Action: "asset.unassigned", Label: "Asset — Unassigned"},

		// ── Permission ────────────────────────────────────────────────────
		{Component: "permission", Action: "permission.updated", Label: "Permission — Updated"},
	}

	// Build components index — preserves insertion order, deduplicates.
	seen := map[string]bool{}
	compOrder := []string{}
	compActions := map[string][]ActionMeta{}
	compLabel := map[string]string{
		"designation":   "Designation",
		"employee":      "Employee",
		"leave":         "Leave",
		"leave_approval_flow": "Leave Approval Flow",
		"leave_balance":        "Leave Balance",
		"leave_policy":  "Leave Policy",
		"holiday":       "Holiday",
		"settings":      "Settings",
		"payroll":       "Payroll",
		"asset":         "Asset",
		"permission":    "Permission",
	}

	for _, a := range all {
		if !seen[a.Component] {
			seen[a.Component] = true
			compOrder = append(compOrder, a.Component)
		}
		compActions[a.Component] = append(compActions[a.Component], a)
	}

	components := make([]ComponentMeta, 0, len(compOrder))
	for _, c := range compOrder {
		components = append(components, ComponentMeta{
			Value:   c,
			Label:   compLabel[c],
			Actions: compActions[c],
		})
	}

	return MetaResponse{
		Components: components,
		Actions:    all,
	}
}
