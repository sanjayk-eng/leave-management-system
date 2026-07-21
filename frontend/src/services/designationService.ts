import { api } from '@/lib/api';
import { Designation } from '@/types';

export interface CreateDesignationRequest {
  designation_name: string;
  description?: string;
}

export interface UpdateDesignationRequest {
  designation_name?: string;
  description?: string;
}

// Raw shape as the backend actually sends it — includes a known typo'd key ("id " with trailing space)
interface RawDesignation {
  id?: string;
  'id '?: string; // backend typo
  designation_name?: string;
  description?: string;
}

// Helper function to normalize designation data (handles backend key typo: "id " instead of "id")
const normalizeDesignation = (data: RawDesignation): Designation => {
  return {
    id: data.id || data['id '] || '',
    designation_name: data.designation_name || '',
    description: data.description,
  };
};

export const designationService = {
  getAll: async () => {
    const response = await api.get<{ message: string; designations: RawDesignation[] }>('/designations');
    const designations = (response.designations || []).map(normalizeDesignation);
    return designations;
  },

  getById: async (id: string) => {
    if (!id || id === 'undefined') {
      throw new Error('Invalid designation ID');
    }
    const response = await api.get<{ message: string; designation: RawDesignation }>(`/designations/${id}`);
    return normalizeDesignation(response.designation);
  },

  create: async (data: CreateDesignationRequest) => {
    return api.post<{ message: string; designation_id: string }>('/designations', data);
  },

  update: async (id: string, data: UpdateDesignationRequest) => {
    if (!id || id === 'undefined') {
      throw new Error('Invalid designation ID');
    }
    return api.patch<{ message: string; designation_id: string }>(`/designations/${id}`, data);
  },

  delete: async (id: string) => {
    if (!id || id === 'undefined') {
      throw new Error('Invalid designation ID');
    }
    return api.delete<{ message: string }>(`/designations/${id}`);
  },

  // Assign an employee to this designation.
  // Route: PATCH /designations/:designationId/assign-employee
  // Body: { employee_id }
  assignEmployee: async (designationId: string, employeeId: string) => {
    if (!designationId || designationId === 'undefined') throw new Error('Invalid designation ID');
    if (!employeeId   || employeeId   === 'undefined') throw new Error('Invalid employee ID');
    return api.patch<{
      message: string;
      employee_id: string;
      designation_id: string;
      designation_name: string;
    }>(`/designations/${designationId}/assign-employee`, { employee_id: employeeId });
  },

  // Remove a designation from an employee (sets designation_id → NULL).
  // Route: DELETE /designations/:designationId/assign-employee/:employeeId
  removeEmployee: async (designationId: string, employeeId: string) => {
    if (!designationId || designationId === 'undefined') throw new Error('Invalid designation ID');
    if (!employeeId   || employeeId   === 'undefined') throw new Error('Invalid employee ID');
    return api.delete<{ message: string; employee_id: string }>(
      `/designations/${designationId}/assign-employee/${employeeId}`
    );
  },
};