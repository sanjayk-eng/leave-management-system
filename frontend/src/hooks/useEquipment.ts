import { useState, useEffect, useCallback, useRef } from 'react';
import {
  EquipmentCategory,
  Equipment,
  AssignedEquipment,
  EquipmentCategoryRequest,
  EquipmentRequest,
  AssignEquipmentRequest,
  RemoveEquipmentRequest,
  UpdateAssignmentRequest,
} from '../types';
import { PaginationParams, PaginatedResponse } from '../types/pagination';
import {
  equipmentCategoryService,
  equipmentService,
  equipmentAssignmentService,
} from '../services/equipmentService';

type SortParams = { sort_by?: string; sort_dir?: 'asc' | 'desc' };
type SearchParams = { search?: string };
type FullParams = PaginationParams & SearchParams & SortParams;

// Normalise any caught value to an Error so ErrorDisplay gets a real object
// with status preserved if it's already an ApiError.
function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

// ─── useEquipmentCategories ────────────────────────────────────────────────────

export const useEquipmentCategories = (params?: FullParams) => {
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const hasFetchedOnce = useRef(false);

  const paramsRef = useRef(params);
  paramsRef.current = params;

  const fetchCategories = useCallback(async (fetchParams?: FullParams) => {
    const isFirst = !hasFetchedOnce.current;
    if (isFirst) setInitialLoading(true);
    else setFetching(true);
    setError(null);
    try {
      const response = await equipmentCategoryService.getAll(fetchParams ?? paramsRef.current);
      setCategories(response?.categories ?? []);
      if (response.pagination) {
        setTotalItems(response.pagination.total_items);
        setTotalPages(response.pagination.total_pages);
      }
    } catch (err) {
      setError(toError(err));
      setCategories([]);
    } finally {
      hasFetchedOnce.current = true;
      setInitialLoading(false);
      setFetching(false);
    }
  }, []);

  const createCategory = useCallback(async (data: EquipmentCategoryRequest) => {
    try {
      await equipmentCategoryService.create(data);
      await fetchCategories(paramsRef.current);
      return { success: true };
    } catch (err) {
      return { success: false, error: toError(err).message };
    }
  }, [fetchCategories]);

  const updateCategory = useCallback(async (id: string, data: EquipmentCategoryRequest) => {
    try {
      await equipmentCategoryService.update(id, data);
      await fetchCategories(paramsRef.current);
      return { success: true };
    } catch (err) {
      return { success: false, error: toError(err).message };
    }
  }, [fetchCategories]);

  const deleteCategory = useCallback(async (id: string) => {
    try {
      await equipmentCategoryService.delete(id);
      await fetchCategories(paramsRef.current);
      return { success: true };
    } catch (err) {
      return { success: false, error: toError(err).message };
    }
  }, [fetchCategories]);

  useEffect(() => {
    fetchCategories(paramsRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.page, params?.page_size, params?.search, params?.sort_by, params?.sort_dir]);

  return {
    categories,
    loading: initialLoading,
    fetching,
    error,
    totalItems,
    totalPages,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    setPage: (page: number) => fetchCategories({ ...paramsRef.current, page }),
    setPageSize: (size: number) => fetchCategories({ ...paramsRef.current, page_size: size, page: 1 }),
  };
};

// ─── useEquipment ──────────────────────────────────────────────────────────────

export const useEquipment = (params?: FullParams) => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentCategoryId, setCurrentCategoryId] = useState<string | null>(null);
  const hasFetchedOnce = useRef(false);

  const paramsRef = useRef(params);
  paramsRef.current = params;
  const categoryRef = useRef(currentCategoryId);
  categoryRef.current = currentCategoryId;

  const applyResponse = useCallback((response: PaginatedResponse<Equipment>) => {
    setEquipment(response?.equipment ?? []);
    if (response?.pagination) {
      setTotalItems(response.pagination.total_items);
      setTotalPages(response.pagination.total_pages);
    }
  }, []);

  const withLoading = useCallback(async (fn: () => Promise<void>) => {
    const isFirst = !hasFetchedOnce.current;
    if (isFirst) setInitialLoading(true);
    else setFetching(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(toError(err));
      setEquipment([]);
    } finally {
      hasFetchedOnce.current = true;
      setInitialLoading(false);
      setFetching(false);
    }
  }, []);

  const fetchEquipment = useCallback(async (fetchParams?: FullParams) => {
    setCurrentCategoryId(null);
    await withLoading(async () => {
      const response = await equipmentService.getAll(fetchParams ?? paramsRef.current);
      applyResponse(response);
    });
  }, [withLoading, applyResponse]);

  const fetchEquipmentByCategory = useCallback(async (categoryId: string, fetchParams?: FullParams) => {
    setCurrentCategoryId(categoryId);
    await withLoading(async () => {
      const response = await equipmentService.getByCategory(categoryId, fetchParams ?? paramsRef.current);
      applyResponse(response);
    });
  }, [withLoading, applyResponse]);

  const refreshCurrent = useCallback(async () => {
    if (categoryRef.current) {
      await fetchEquipmentByCategory(categoryRef.current, paramsRef.current);
    } else {
      await fetchEquipment(paramsRef.current);
    }
  }, [fetchEquipment, fetchEquipmentByCategory]);

  const createEquipment = useCallback(async (data: EquipmentRequest) => {
    try {
      await equipmentService.create(data);
      await refreshCurrent();
      return { success: true };
    } catch (err) {
      return { success: false, error: toError(err).message };
    }
  }, [refreshCurrent]);

  const updateEquipment = useCallback(async (id: string, data: EquipmentRequest) => {
    try {
      await equipmentService.update(id, data);
      await refreshCurrent();
      return { success: true };
    } catch (err) {
      return { success: false, error: toError(err).message };
    }
  }, [refreshCurrent]);

  const deleteEquipment = useCallback(async (id: string) => {
    try {
      await equipmentService.delete(id);
      await refreshCurrent();
      return { success: true };
    } catch (err) {
      return { success: false, error: toError(err).message };
    }
  }, [refreshCurrent]);

  useEffect(() => {
    fetchEquipment(paramsRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.page, params?.page_size, params?.search, params?.sort_by, params?.sort_dir]);

  return {
    equipment,
    loading: initialLoading,
    fetching,
    error,
    totalItems,
    totalPages,
    fetchEquipment,
    fetchEquipmentByCategory,
    createEquipment,
    updateEquipment,
    deleteEquipment,
    setPage: (page: number) => {
      const p = { ...paramsRef.current, page };
      void (categoryRef.current ? fetchEquipmentByCategory(categoryRef.current, p) : fetchEquipment(p));
    },
    setPageSize: (size: number) => {
      const p = { ...paramsRef.current, page_size: size, page: 1 };
      void (categoryRef.current ? fetchEquipmentByCategory(categoryRef.current, p) : fetchEquipment(p));
    },
  };
};

// ─── useEquipmentAssignments ───────────────────────────────────────────────────

export const useEquipmentAssignments = (paginationParams?: PaginationParams) => {
  const [assignments, setAssignments] = useState<AssignedEquipment[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);
  const hasFetchedOnce = useRef(false);

  const paginationRef = useRef(paginationParams);
  paginationRef.current = paginationParams;
  const employeeRef = useRef(currentEmployeeId);
  employeeRef.current = currentEmployeeId;

  const applyResponse = useCallback((response: PaginatedResponse<AssignedEquipment>) => {
    setAssignments(Array.isArray(response?.data) ? response.data : []);
    if (response?.pagination) {
      setTotalItems(response.pagination.total_items);
      setTotalPages(response.pagination.total_pages);
    }
  }, []);

  const withLoading = useCallback(async (fn: () => Promise<void>) => {
    const isFirst = !hasFetchedOnce.current;
    if (isFirst) setInitialLoading(true);
    else setFetching(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(toError(err));
      setAssignments([]);
    } finally {
      hasFetchedOnce.current = true;
      setInitialLoading(false);
      setFetching(false);
    }
  }, []);

  const fetchAssignments = useCallback(async (params?: PaginationParams) => {
    setCurrentEmployeeId(null);
    await withLoading(async () => {
      const response = await equipmentAssignmentService.getAll(params ?? paginationRef.current);
      applyResponse(response);
    });
  }, [withLoading, applyResponse]);

  const fetchAssignmentsByEmployee = useCallback(async (employeeId: string, params?: PaginationParams) => {
    if (!employeeId?.trim()) {
      setError(new Error('Invalid employee ID'));
      setAssignments([]);
      return;
    }
    setCurrentEmployeeId(employeeId);
    await withLoading(async () => {
      const response = await equipmentAssignmentService.getByEmployee(employeeId, params ?? paginationRef.current);
      applyResponse(response);
    });
  }, [withLoading, applyResponse]);

  const refreshCurrent = useCallback(async () => {
    if (employeeRef.current) {
      await fetchAssignmentsByEmployee(employeeRef.current, paginationRef.current);
    } else {
      await fetchAssignments(paginationRef.current);
    }
  }, [fetchAssignments, fetchAssignmentsByEmployee]);

  const assignEquipment = useCallback(async (data: AssignEquipmentRequest) => {
    try {
      await equipmentAssignmentService.assign(data);
      await refreshCurrent();
      return { success: true };
    } catch (err) {
      return { success: false, error: toError(err).message };
    }
  }, [refreshCurrent]);

  const removeEquipment = useCallback(async (data: RemoveEquipmentRequest) => {
    try {
      await equipmentAssignmentService.remove(data);
      await refreshCurrent();
      return { success: true };
    } catch (err) {
      return { success: false, error: toError(err).message };
    }
  }, [refreshCurrent]);

  const updateAssignment = useCallback(async (data: UpdateAssignmentRequest) => {
    try {
      await equipmentAssignmentService.updateAssignment(data);
      await refreshCurrent();
      return { success: true };
    } catch (err) {
      return { success: false, error: toError(err).message };
    }
  }, [refreshCurrent]);

  useEffect(() => {
    if (employeeRef.current) {
      fetchAssignmentsByEmployee(employeeRef.current, paginationRef.current);
    } else {
      fetchAssignments(paginationRef.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationParams?.page, paginationParams?.page_size]);

  return {
    assignments,
    loading: initialLoading,
    fetching,
    error,
    totalItems,
    totalPages,
    fetchAssignments,
    fetchAssignmentsByEmployee,
    assignEquipment,
    removeEquipment,
    updateAssignment,
    setPage: (page: number) => {
      const p = { ...paginationRef.current, page };
      void (employeeRef.current ? fetchAssignmentsByEmployee(employeeRef.current, p) : fetchAssignments(p));
    },
    setPageSize: (size: number) => {
      const p = { ...paginationRef.current, page_size: size, page: 1 };
      void (employeeRef.current ? fetchAssignmentsByEmployee(employeeRef.current, p) : fetchAssignments(p));
    },
  };
};
