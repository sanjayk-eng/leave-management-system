import { api, apiFetchBlob } from '@/lib/api';

export interface RunPayrollRequest {
  month: number;
  year: number;
}

export interface PayrollPreviewItem {
  employee_id: string;
  employee: string;
  basic_salary: number;
  working_days: number;
  paid_leaves: number;
  unpaid_leaves: number;
  deductions: number;
  net_salary: number;
  payslip_id?: string;
}

export interface RunPayrollResponse {
  payroll_run_id: string;
  month: number;
  year: number;
  total_payroll: number;
  total_deductions: number;
  employees_count: number;
  payroll_preview: PayrollPreviewItem[];
}

export interface PayslipData {
  payslip_id: string;
  employee_id: string;
  full_name: string;
  email: string;
  month: number;
  year: number;
  basic_salary: number;
  working_days: number;
  PaidLeaves: number;
  unpaid_leaves: number;
  deduction_amount: number;
  net_salary: number;
  pdf_path: string;
  calculation: string;
  created_at: string;
}

export interface GetPayslipsResponse {
  data: PayslipData[];
  message: string;
  total_payslips: number;
}

export const payrollService = {
  run: async (data: RunPayrollRequest) => {
    return api.post<RunPayrollResponse>('/payroll/run', data);
  },

  finalize: async (payrollRunId: string) => {
    return api.post<{
      message: string;
      payslip_ids: string[];
      working_days_used: number;
    }>(`/payroll/${payrollRunId}/finalize`);
  },

  getPayslips: async () => {
    return api.get<GetPayslipsResponse>('/payroll/payslip');
  },

  // Fixed: was raw fetch — 401 silently failed. Now uses apiFetchBlob which
  // clears auth tokens and redirects to /login on 401.
  downloadPayslipPdf: async (payslipId: string) => {
    const blob = await apiFetchBlob(`/payroll/payslips/${payslipId}/pdf`);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payslip-${payslipId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Fixed: same issue — raw fetch replaced with apiFetchBlob.
  previewPayslipPdf: async () => {
    const blob = await apiFetchBlob('/payroll/payslips/preview');
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => window.URL.revokeObjectURL(url), 10_000);
  },
};