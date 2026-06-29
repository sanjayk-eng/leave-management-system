import { api } from '@/lib/api';

export interface LeaveBalanceItem {
  leave_type: string;
  used: number;
  total: number;
  available: number;
  adjusted?: number; // Add adjustment field
  opening?: number;  // Add opening balance
  accrued?: number;  // Add accrued balance
  closing?: number;  // Add closing balance
}

export interface LeaveBalanceResponse {
  employee_id: string;
  balances: LeaveBalanceItem[];
}

export interface AdjustLeaveBalanceRequest {
  leave_type_id: number;
  quantity: number;
  reason: string;
}

export const leaveBalanceService = {
  getByEmployee: async (employeeId: string) => {
    const response = await api.get<LeaveBalanceResponse>(`/leave-balances/employee/${employeeId}`);
    return response;
  },

  getById: async (employeeId: string) => {
    const response = await api.get<LeaveBalanceResponse>(`/leave-balances/employee/${employeeId}`);
    return response;
  },

  adjust: async (employeeId: string, data: AdjustLeaveBalanceRequest) => {
    return api.post<{
      message: string;
      new_adjusted: number;
      new_closing: number;
      year: number;
    }>(`/leave-balances/${employeeId}/adjust`, data);
  },
};
