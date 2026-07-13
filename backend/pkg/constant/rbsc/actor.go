package rbsc

// Action identifies an operation on a Resource.
// Values map 1:1 to the permission_action DB enum in tbl_permission.
// Naming: singular snake_case verb — no drift between code and DB allowed.
type Action string

const (
	// ── Universal CRUD ──────────────────────────────────────────────────────
	ActionAdd    Action = "add"
	ActionRead   Action = "read"
	ActionEdit   Action = "edit"
	ActionRemove Action = "remove"

	// ── Employee lifecycle ───────────────────────────────────────────────────
	ActionChangePassword    Action = "change_password"
	ActionUpdateRole        Action = "update_role"
	ActionAssignManager     Action = "assign_manager"
	ActionUnassignManager   Action = "unassign_manager"
	ActionActivate          Action = "activate"
	ActionDeactivate        Action = "deactivate"
	ActionDesignationManage Action = "designation_management"

	// ── Leave workflow ───────────────────────────────────────────────────────
	ActionApply    Action = "apply"
	ActionApprove  Action = "approve"
	ActionReject   Action = "reject"
	ActionCancel   Action = "cancel"
	ActionWithdraw Action = "withdraw"

	// ── Leave balance ────────────────────────────────────────────────────────
	ActionAdjust Action = "adjust"

	// ── Settings sub-actions ─────────────────────────────────────────────────
	ActionManageHolidays      Action = "manage_holidays"
	ActionManageLeavePolicy   Action = "manage_leave_policy"
	ActionManageLeaveFlow     Action = "manage_leave_flow"
	ActionManageLeaveTiming   Action = "manage_leave_timing"
	ActionMangmentCompanyInfo Action = "manage_company_info"

	// ── Equipment ────────────────────────────────────────────────────────────
	ActionAssign Action = "assign"
)

func (a Action) String() string { return string(a) }
