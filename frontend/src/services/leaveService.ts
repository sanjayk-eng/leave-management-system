import { api } from '@/lib/api';
import { LeaveReportParams, LeaveReportResponse, UpdateLeaveTimingRequest } from '@/types';

// --- REQUEST INTERFACES ---

export interface ApplyLeaveRequest {
  employee_id?: string;        // Omit for self-apply; set for apply-on-behalf
  leave_type_id: number;
  start_date: string;
  end_date: string;
  reason?: string;
  leave_timing_id?: number;
  leave_timing?: string;
}

export interface UpdateLeaveRequest {
  leave_type_id?: number;
  start_date?: string;
  end_date?: string;
  reason?: string;
  leave_timing_id?: number;
  leave_timing?: string;
}

export interface AdminAddLeaveRequest {
  employee_id: string;
  leave_type_id: number;
  start_date: string;
  end_date: string;
  leave_timing_id?: number;
}

export interface AddLeavePolicyRequest {
  name: string;
  is_paid: boolean;
  is_early?: boolean;
  is_work_from_home?: boolean;
  default_entitlement: number;
  intern_entitlement?: number;
  approval_flow_id?: string;
}

export interface UpdateLeavePolicyRequest {
  name?: string;
  is_paid?: boolean;
  is_early?: boolean;
  is_work_from_home?: boolean;
  default_entitlement?: number;
  intern_entitlement?: number;
  approval_flow_id?: string;
}

export interface LeaveActionRequest {
  action: 'APPROVE' | 'REJECT' | 'WITHDRAW';
  reason?: string;
}

// --- RESPONSE INTERFACES ---

export interface LeaveSummary {
  total: number;
  pending: number;
  manager_approved: number;
  manager_rejected: number;
  admin_approved: number;
  admin_rejected: number;
  approved: number;
  rejected: number;
  cancelled: number;
  withdrawn: number;
  withdrawal_pending: number;
}

export interface LeavePolicy {
  id: number;
  name: string;
  is_paid: boolean;
  is_early?: boolean;
  is_work_from_home?: boolean;
  default_entitlement: number;
  intern_entitlement?: number;
  approval_flow_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ApprovalLogEntry {
  stage_no:          number;
  approver_role:     string;
  state:             'WAITING' | 'APPROVED' | 'REJECTED' | 'SKIPPED' | 'WITHDRAWN';
  approved_by?:      string;
  approved_by_name?: string;
  action_at?:        string;
}

export interface LeaveResponse {
  id: string;
  employee: string;
  leave_type: string;
  leave_type_id?: number;
  is_paid?: boolean;
  is_early?: boolean;
  leave_timing_type?: string;
  leave_timing?: string;
  start_date: string;
  end_date: string;
  days: number;
  status: string;
  applied_at?: string;
  applying_date?: string;
  created_at?: string;
  reason?: string;
  approval_name?: string;
  applied_by_name?: string;   // Populated when someone applied on behalf of the employee
  approval_log?: ApprovalLogEntry[];
}

// --- SERVICE OBJECT ---

export const leaveService = {
  apply: async (data: ApplyLeaveRequest) => {
    return api.post<{ message: string; leave_id: string; days: number }>('/leaves/apply', data);
  },

  update: async (id: string, data: UpdateLeaveRequest) => {
    return api.put<{ message: string; leave_id: string }>(`/leaves/edit/${id}`, data);
  },

  adminAdd: async (data: AdminAddLeaveRequest) => {
    return api.post<{ message: string; leave_id: string; days: number }>('/leaves/admin-add', data);
  },

  addPolicy: async (data: AddLeavePolicyRequest) => {
    return api.post<LeavePolicy>('/leaves/admin-add/policy', data);
  },

  updatePolicy: async (id: number, data: UpdateLeavePolicyRequest) => {
    return api.put<{ message: string; id: number }>(`/leaves/admin-update/policy/${id}`, data);
  },

  deletePolicy: async (id: number) => {
    return api.delete<{ message: string; id: number }>(`/leaves/admin-delete/policy/${id}`);
  },

  getAllPolicies: async () => {
    return api.get<LeavePolicy[]>('/leaves/Get-All-Leave-Policy');
  },

  action: async (id: string, data: LeaveActionRequest) => {
    return api.post<{ message: string; leave_id?: string; days_restored?: number }>(`/leaves/${id}/action`, data);
  },

  getAll: async (month?: number, year?: number) => {
    const params = new URLSearchParams();
    if (month !== undefined) params.append('month', month.toString());
    if (year !== undefined) params.append('year', year.toString());
    const queryString = params.toString();
    const url = queryString ? `/leaves/all?${queryString}` : '/leaves/all';
    return api.get<{ total: number; data: LeaveResponse[]; summary: LeaveSummary; message: string; month: number; year: number; role: string }>(url);
  },

  cancel: async (id: string) => {
    return api.delete<{ message: string; leave_id: string }>(`/leaves/${id}/cancel`);
  },

  getManagerHistory: async () => {
    const response = await api.get<{ leaves: LeaveResponse[] }>('/leaves/manager/history');
    return response.leaves;
  },

  getMyLeaves: async (month?: number, year?: number) => {
    const params = new URLSearchParams();
    if (month !== undefined) params.append('month', month.toString());
    if (year !== undefined) params.append('year', year.toString());
    const queryString = params.toString();
    const url = queryString ? `/leaves/my-leaves?${queryString}` : '/leaves/my-leaves';
    return api.get<{ message: string; total: number; data: LeaveResponse[]; month: number; year: number }>(url);
  },

  getLeaveTiming: async () => {
    return api.get('/leaves/timming');
  },

  // Fixed: was `data: any`, now properly typed
  updateLeaveTiming: async (data: UpdateLeaveTimingRequest) => {
    return api.put('/leaves/timming', data);
  },

  getLeaveReport: async (params: LeaveReportParams) => {
    const p = new URLSearchParams();
    p.append('report_type', params.report_type);
    if (params.month      !== undefined) p.append('month',      String(params.month));
    if (params.year       !== undefined) p.append('year',       String(params.year));
    if (params.from_month !== undefined) p.append('from_month', String(params.from_month));
    if (params.from_year  !== undefined) p.append('from_year',  String(params.from_year));
    if (params.to_month   !== undefined) p.append('to_month',   String(params.to_month));
    if (params.to_year    !== undefined) p.append('to_year',    String(params.to_year));
    if (params.search)     p.append('search',     params.search);
    if (params.role)       p.append('role',       params.role);
    if (params.sort_by)    p.append('sort_by',    params.sort_by);
    if (params.sort_order) p.append('sort_order', params.sort_order);
    return api.get<LeaveReportResponse>(`/leaves/Get-Leave-Report?${p.toString()}`);
  },

 

  getLeaveLog: async (leaveId: string) => {
    return api.get<{ leave_id: string; approval_log: ApprovalLogEntry[] }>(
      `/leaves/log/?leave_id=${leaveId}`
    );
  },
};