package rbsc

// Action identifies an operation performed on a Resource.
// These values map 1:1 to tbl_permission.action.
type Action string

const (
	ActionAdd    Action = "add"
	ActionRead   Action = "read"
	ActionEdit   Action = "edit"
	ActionRemove Action = "remove"

	ActionApply    Action = "apply"
	ActionApprove  Action = "approve"
	ActionReject   Action = "reject"
	ActionCancel   Action = "cancel"
	ActionWithdraw Action = "withdraw"

	ActionAssign   Action = "assign"
	ActionUnassign Action = "unassign"


	ActionActivate   Action = "activate"
	ActionDeactivate Action = "deactivate"

	ActionRun    Action = "run"
	ActionAdjust Action = "adjust"
	ActionManage Action = "manage"
)

func (a Action) String() string {
	return string(a)
}
