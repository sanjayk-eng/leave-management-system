package rbsc

// Resource identifies a protectable entity.
// Values map 1:1 to the permission_resource DB enum in tbl_permission.
// Naming: singular snake_case — no drift between code and DB allowed.
type Resource string

// ResourceEmployee is the RBAC resource for employee management.
const (
	ResourceEmployee     Resource = "employee"
	ResourceLeave        Resource = "leave"
	ResourceLeaveBalance Resource = "leave_balance"
	ResourceLeaveReport  Resource = "leave_report"
	ResourcePayroll      Resource = "payroll"
	ResourceSettings     Resource = "settings"
	ResourceDesignation  Resource = "designation"
	ResourceAsset        Resource = "asset" // was "asset" in old migration — fixed
	ResourcePermission   Resource = "permission"
	ResourceLog          Resource = "log"
	ResourcePayslip      Resource = "payslip"
)

func (r Resource) String() string { return string(r) }
