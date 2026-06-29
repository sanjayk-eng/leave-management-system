import {
  EquipmentCategory,
  EquipmentCategoryRequest,
  Equipment,
  EquipmentRequest,
  AssignEquipmentRequest,
  AssignedEquipment,
  RemoveEquipmentRequest,
  UpdateAssignmentRequest,
} from '../types';
import { PaginationParams, PaginatedResponse } from '../types/pagination';
import { api } from '@/lib/api';

// ─── Helpers ───────────────────────────────────────────────────────────────────

type SortParams = { sort_by?: string; sort_dir?: 'asc' | 'desc' };
type SearchParams = { search?: string };
type FullParams = PaginationParams & SearchParams & SortParams;

function buildQuery(params?: FullParams): string {
  if (!params) return '';
  const q = new URLSearchParams();
  if (params.page)      q.append('page', String(params.page));
  if (params.page_size) q.append('page_size', String(params.page_size));
  if (params.search)    q.append('search', params.search);
  if (params.sort_by)   q.append('sort_by', params.sort_by);
  if (params.sort_dir)  q.append('sort_dir', params.sort_dir);
  const str = q.toString();
  return str ? `?${str}` : '';
}

// ─── Category service ──────────────────────────────────────────────────────────

export const equipmentCategoryService = {
  create: (data: EquipmentCategoryRequest) =>
    api.post<{ message: string }>('/catagory', data),

  getAll: async (params?: FullParams): Promise<PaginatedResponse<EquipmentCategory>> => {
    const response = await api.get<PaginatedResponse<EquipmentCategory>>(`/catagory${buildQuery(params)}`);
    return { ...response, categories: response.categories || [] };
  },

  update: (id: string, data: EquipmentCategoryRequest) =>
    api.put<{ message: string }>(`/catagory/${id}`, data),

  delete: (id: string) =>
    api.delete<{ message: string }>(`/catagory/${id}`),
};

// ─── Equipment service ─────────────────────────────────────────────────────────

export const equipmentService = {
  create: (data: EquipmentRequest) =>
    api.post<{ message: string }>('/catagory/equipment', data),

  getAll: async (params?: FullParams): Promise<PaginatedResponse<Equipment>> => {
    const response = await api.get<PaginatedResponse<Equipment>>(`/catagory/equipment${buildQuery(params)}`);
    return { ...response, equipment: response.equipment || [] };
  },

  getByCategory: async (categoryId: string, params?: FullParams): Promise<PaginatedResponse<Equipment>> => {
    const q = new URLSearchParams({ id: categoryId });
    if (params?.page)      q.append('page', String(params.page));
    if (params?.page_size) q.append('page_size', String(params.page_size));
    if (params?.search)    q.append('search', params.search);
    if (params?.sort_by)   q.append('sort_by', params.sort_by);
    if (params?.sort_dir)  q.append('sort_dir', params.sort_dir);
    const response = await api.get<PaginatedResponse<Equipment>>(`/catagory/equipment/by-category?${q}`);
    return { ...response, equipment: response.equipment || [] };
  },

  update: (id: string, data: EquipmentRequest) =>
    api.put<{ message: string }>(`/catagory/equipment/${id}`, data),

  delete: (id: string) =>
    api.delete<{ message: string }>(`/catagory/equipment/${id}`),
};

// ─── Assignment service ────────────────────────────────────────────────────────

export const equipmentAssignmentService = {
  assign: (data: AssignEquipmentRequest) =>
    api.post<{ message: string }>('/catagory/equipment/assign', data),

  getAll: async (params?: PaginationParams): Promise<PaginatedResponse<AssignedEquipment>> => {
    const q = new URLSearchParams();
    if (params?.page)      q.append('page', String(params.page));
    if (params?.page_size) q.append('page_size', String(params.page_size));
    const qs = q.toString();
    return api.get<PaginatedResponse<AssignedEquipment>>(`/catagory/equipment/assign${qs ? `?${qs}` : ''}`);
  },

  getByEmployee: async (employeeId: string, params?: PaginationParams): Promise<PaginatedResponse<AssignedEquipment>> => {
    if (!employeeId) throw new Error('Employee ID is required');
    const q = new URLSearchParams();
    if (params?.page)      q.append('page', String(params.page));
    if (params?.page_size) q.append('page_size', String(params.page_size));
    const qs = q.toString();
    return api.get<PaginatedResponse<AssignedEquipment>>(`/catagory/equipment/assign/employee/${employeeId}${qs ? `?${qs}` : ''}`);
  },

  remove: async (data: RemoveEquipmentRequest): Promise<{ message: string }> => {
    try {
      return await api.deleteWithBody<{ message: string }>('/catagory/equipment/assign/remove', data);
    } catch {
      const q = new URLSearchParams({ employee_id: data.employee_id, equipment_id: data.equipment_id });
      return api.delete<{ message: string }>(`/catagory/equipment/assign/remove?${q}`);
    }
  },

  updateAssignment: (data: UpdateAssignmentRequest) =>
    api.put<{ message: string }>('/catagory/equipment/assign/update', data),
};
