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

export type LogAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';

export type LogComponent = 'EMPLOYEE' | 'LEAVE' | 'PAYROLL' | 'SETTINGS' | 'DESIGNATION' | 'HOLIDAY' | 'AUTH';

export interface SystemLog {
  id: string;
  user_name: string;
  action: LogAction;
  component: LogComponent;
  created_at: string;
}

export interface LogsResponse {
  data: {
    logs: SystemLog[];
    total_count: number;
    days_filter: number;
    date_from: string;
  };
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