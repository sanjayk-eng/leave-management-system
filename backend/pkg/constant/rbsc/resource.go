package rbsc

// Resource identifies a protectable entity in the system.
// These map 1:1 to Tbl_Permission.resource values.
type Resource string

const (
	ResourceEmployee     Resource = "employee"
	ResourceLeave        Resource = "leave"
	ResourceLeaveBalance Resource = "leave_balance"
	ResourcePayroll      Resource = "payroll"
	ResourceSettings     Resource = "settings"
	ResourceEquipment    Resource = "equipment"
	ResourceLeaveReport  Resource = "leave_report"
)

func (r Resource) String() string { return string(r) }
