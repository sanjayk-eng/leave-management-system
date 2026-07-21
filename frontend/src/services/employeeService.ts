import { api } from '@/lib/api';

export interface Employee {
  id: string;
  full_name: string;
  email: string;
  status: string;
  role: string;
  manager_id?: string;
  manager_name?: string;
  designation_id?: string;
  designation_name?: string;
  salary: number;
  joining_date: string;
  ending_date?: string;
  birth_date?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface CreateEmployeeRequest {
  full_name: string;
  email: string;
  role: string;
  salary: number;
  joining_date: string;
  ending_date?: string | null;
  birth_date?: string | null;
  password?: string; // Optional - auto-generated if not provided
}

export interface UpdateRoleRequest {
  role: string;
}

export interface UpdateManagerRequest {
  manager_id: string;
}

export interface EmployeeFilters {
  page?: number;
  page_size?: number;
  search?: string; // fuzzy: name | email | manager_name
  role?: string;
  roles?: string[]; // multiple role filter: appended as repeated role= params
  designation?: string;
  status?: string;
  manager?: string; // exact match on manager's full_name
  sort_by?: string; // name | email | joining_date | ending_date | salary | birth_date | manager_name | role | status
  sort_order?: 'asc' | 'desc';
}

export interface EmployeeResponse {
  message: string;
  employees: Employee[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
  filters?: EmployeeFilters;
}

export const employeeService = {
  getAll: async (filters?: EmployeeFilters) => {
    let url = '/employee';
    const params = new URLSearchParams();
    
    // Pagination
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());
    
    // Unified search filter (searches name, email, and manager_name)
    if (filters?.search) params.append('search', filters.search);
    
    // Exact match filters
    if (filters?.role) params.append('role', filters.role);
    if (filters?.roles?.length) filters.roles.forEach(r => params.append('role', r));
    if (filters?.designation) params.append('designation', filters.designation);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.manager) params.append('manager', filters.manager);
    
    // Sorting
    if (filters?.sort_by) params.append('sort_by', filters.sort_by);
    if (filters?.sort_order) params.append('sort_order', filters.sort_order);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await api.get<EmployeeResponse>(url);
    return response;
  },

  getById: async (id: string) => {
    const response = await api.get<{ message: string; employee: Employee }>(`/employee/${id}`);
    return response.employee;
  },

  updateInfo: async (id: string, data: { full_name?: string; email?: string; salary?: number; joining_date?: string; ending_date?: string | null; birth_date?: string | null }) => {
    return api.patch<{ message: string; employee_id: string }>(`/employee/${id}`, data);
  },

  updatePassword: async (id: string, newPassword: string) => {
    return api.patch<{ message: string; employee_id: string }>(`/employee/${id}/password`, {
      new_password: newPassword,
    });
  },

  create: async (data: CreateEmployeeRequest) => {
    return api.post<{ message: string }>('/employee', data);
  },

  updateRole: async (id: string, data: UpdateRoleRequest) => {
    return api.patch<{ message: string; employee_id: string }>(`/employee/${id}/role`, data);
  },

  updateManager: async (id: string, data: UpdateManagerRequest) => {
    return api.patch<{ message: string; employee_id: string; manager_id: string }>(
      `/employee/${id}/manager`,
      data
    );
  },

  deactivate: async (id: string) => {
    return api.put<{ message: string }>(`/employee/deactivate/${id}`);
  },

  getReports: async (id: string) => {
    return api.get<{ message: string }>(`/employee/${id}/reports`);
  },

  updateDesignation: async (employeeId: string, designationId: string | null) => {
    if (designationId) {
      // Assign: PATCH /designations/:designationId/assign-employee  { employee_id }
      return api.patch<{ message: string; employee_id: string; designation_id: string; designation_name: string }>(
        `/designations/${designationId}/assign-employee`,
        { employee_id: employeeId }
      );
    }
    // Remove — requires the employee's current designation_id, handled by caller passing it
    // This path should not be reached via this function — use designationService.removeEmployee instead
    throw new Error('Use designationService.removeEmployee to clear a designation');
  },
};
