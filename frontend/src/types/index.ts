export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE' | 'INTERN';

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type PayrollStatus = 'DRAFT' | 'FINALIZED';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  managerId?: string;
  salary: number;
  joiningDate: string;
  isActive: boolean;
}

export interface LeaveType {
  id: string;
  name: string;
  isPaid: boolean;
  defaultEntitlement: number;
}

export interface Leave {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveTypeId: string;
  leaveTypeName: string;
  leave_timing_type?: string;
  leave_timing?: string;
  startDate: string;
  endDate: string;
  days: number;
  status: LeaveStatus;
  appliedBy: string;
  approvedBy?: string;
  approval_name?: string;
  reason?: string;
  leaveTimingId?: number;
  createdAt: string;
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  leaveTypeName: string;
  year: number;
  opening: number;
  accrued: number;
  used: number;
  adjusted: number;
  closing: number;
}

export interface PayrollRun {
  id: string;
  month: number;
  year: number;
  status: PayrollStatus;
  createdAt: string;
  finalizedAt?: string;
}

export interface Payslip {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeName: string;
  basicSalary: number;
  workingDays: number;
  absentDays: number;
  deductionAmount: number;
  netSalary: number;
  month: number;
  year: number;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  day: string;
  type: string;
  created_at: string;
  updated_at: string;
}

export interface CompanySettings {
  workingDaysPerMonth: number;
  allowManagerAddLeave: boolean;
}

export interface Designation {
  id: string;
  designation_name: string;
  description?: string;
}

// ─── Audit / Activity Log (new API) ──────────────────────────────────────────

/** Read-side shape — what the feed API returns per entry. No raw diffs. */
export interface ActivityEntry {
  id: string;
  actor_name: string;
  actor_role: string;
  component: string;
  action: string;
  resource_type: string;
  resource_name: string;
  description: string;
  created_at: string;
}

export interface ActivityPagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface ActivityFeedResponse {
  message: string;
  pagination: ActivityPagination;
  data: ActivityEntry[];
}

export interface ActivityFeedFilter {
  resource_id?: string;
  actor_id?: string;
  component?: string;
  action?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

// ─── Audit meta — served by GET /api/logs/meta ───────────────────────────────

/** One action entry in the meta catalogue. */
export interface AuditActionMeta {
  component: string;
  action: string;
  label: string;
}

/** One component group with its nested actions. */
export interface AuditComponentMeta {
  value: string;
  label: string;
  actions: AuditActionMeta[];
}

/** Shape of GET /api/logs/meta response.data */
export interface AuditMeta {
  components: AuditComponentMeta[];
  actions: AuditActionMeta[];
}

export interface AuditMetaResponse {
  message: string;
  data: AuditMeta;
}

export type LeaveTimingType = 'FIRST_HALF' | 'SECOND_HALF' | 'FULL' | 'EARLY';

export interface LeaveTiming {
  id: number;
  type: LeaveTimingType;
  timing: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface LeaveTimingResponse {
  message: string;
  total: number;
  data: LeaveTiming[];
}

export interface UpdateLeaveTimingRequest {
  id: number;
  timing: string;
}

export interface LeaveReportRecord {
  employee_id: string;
  employee_name: string;
  email: string;
  role: string;
  accrued_leaves: number;
  used_leaves: number;
  balance_leaves: number;
  total_leaves: number;
  paid_leaves: number;
  unpaid_leaves: number;
  early_leaves: number;
}

export type LeaveReportType = 'monthly' | 'yearly' | 'range';

export interface LeaveReportParams {
  report_type: LeaveReportType;
  month?: number;
  year?: number;
  from_month?: number;
  from_year?: number;
  to_month?: number;
  to_year?: number;
  search?: string;
  role?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface LeaveReportResponse {
  message: string;
  data: {
    report_type: LeaveReportType;
    from_month: number;
    from_year: number;
    to_month: number;
    to_year: number;
    total: number;
    records: LeaveReportRecord[];
  };
}

export type LeaveMonthlyRecord = LeaveReportRecord;
export type LeaveMonthlyReportResponse = LeaveReportResponse;

// ─── Leave Policy Report ──────────────────────────────────────────────────────

/** Usage + balance for a single leave policy, within the report window. */
export interface LeavePolicyEntry {
  policy_id: number;
  policy_name: string;
  is_paid: boolean;
  is_early: boolean;
  used_days: number;
  balance: number;
}

/** One employee row containing a breakdown per leave policy. */
export interface LeavePolicyReportRecord {
  employee_id: string;
  employee_name: string;
  email: string;
  role: string;
  total_used: number;
  total_balance: number;
  policies: LeavePolicyEntry[];
}

export interface LeavePolicyReportResponse {
  message: string;
  data: {
    report_type: LeaveReportType;
    from_month: number;
    from_year: number;
    to_month: number;
    to_year: number;
    total: number;
    records: LeavePolicyReportRecord[];
  };
}

export type LeavePolicyReportType = 'monthly' | 'weekly' | 'yearly' | 'range';

export interface LeavePolicyReportParams {
  report_type: LeavePolicyReportType;
  month?: number;
  year?: number;
  // weekly uses from_*/to_* just like range
  from_month?: number;
  from_year?: number;
  to_month?: number;
  to_year?: number;
  search?: string;
  role?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export type ApproverRole = 'SUPERADMIN' | 'HR' | 'ADMIN' | 'MANAGER';

export interface ApprovalStage {
  stage_no:      number;
  approver_role: ApproverRole;
}

export interface LeaveApprovalFlowRequest {
  name: string;
  flow: ApprovalStage[];
}

export interface LeaveApprovalFlowResponse {
  id:        string;
  name:      string;
  is_system: boolean;
  flow:      ApprovalStage[];
}

export interface Role {
  id:   number;
  type: string;
}

export interface EquipmentCategory {
  id?: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EquipmentCategoryRequest {
  name: string;
  description?: string;
}

export interface Equipment {
  id?: string;
  name: string;
  category_id: string;
  is_shared: boolean;
  price: number;
  total_quantity: number;
  remaining_quantity: number;
  purchase_date: string;
  created_at?: string;
  updated_at?: string;
}

export interface EquipmentRequest {
  id?: string;
  name: string;
  category_id: string;
  is_shared?: boolean;
  price: number;
  total_quantity: number;
  purchase_date?: string;
}

export interface AssignEquipmentRequest {
  employee_id: string;
  equipment_id: string;
  quantity: number;
  assigned_by?: string;
}

export interface AssignedEquipment {
  employee_id?: string;
  equipment_id?: string;
  employee_name: string;
  employee_email: string;
  equipment_name: string;
  purchase_date?: string;
  quantity: number;
  approved_by_name?: string;
}

export interface RemoveEquipmentRequest {
  employee_id: string;
  equipment_id: string;
}

export interface UpdateAssignmentRequest {
  from_employee_id: string;
  to_employee_id?: string;
  equipment_id: string;
  quantity: number;
  assigned_by?: string;
}