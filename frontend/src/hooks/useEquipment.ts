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

// ─── useEquipmentCategories ────────────────────────────────────────────────────

export const useEquipmentCategories = (params?: FullParams) => {
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  // initialLoading = true only on first fetch, so skeleton shows once
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      // `response.categories` is now `EquipmentCategory[] | undefined` — no `unknown`
      setCategories(response?.categories ?? []);
      if (response.pagination) {
        setTotalItems(response.pagination.total_items);
        setTotalPages(response.pagination.total_pages);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
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
      const msg = err instanceof Error ? err.message : 'Failed to create category';
      return { success: false, error: msg };
    }
  }, [fetchCategories]);

  const updateCategory = useCallback(async (id: string, data: EquipmentCategoryRequest) => {
    try {
      await equipmentCategoryService.update(id, data);
      await fetchCategories(paramsRef.current);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update category';
      return { success: false, error: msg };
    }
  }, [fetchCategories]);

  const deleteCategory = useCallback(async (id: string) => {
    try {
      await equipmentCategoryService.delete(id);
      await fetchCategories(paramsRef.current);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete category';
      return { success: false, error: msg };
    }
  }, [fetchCategories]);

  useEffect(() => {
    fetchCategories(paramsRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.page, params?.page_size, params?.search, params?.sort_by, params?.sort_dir]);

  // loading = true only on initial fetch (shows skeleton once)
  // fetching = true on subsequent fetches (keeps existing rows, no flash)
  const loading = initialLoading;

  return {
    categories,
    loading,
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
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentCategoryId, setCurrentCategoryId] = useState<string | null>(null);
  const hasFetchedOnce = useRef(false);

  const paramsRef = useRef(params);
  paramsRef.current = params;
  const categoryRef = useRef(currentCategoryId);
  categoryRef.current = currentCategoryId;

  // Fix: use PaginatedResponse<Equipment> instead of `any`
  // `response.equipment` is now `Equipment[] | undefined` — fully typed, no cast needed
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
      setError(err instanceof Error ? err.message : 'Failed to fetch equipment');
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
      return { success: false, error: err instanceof Error ? err.message : 'Failed to create equipment' };
    }
  }, [refreshCurrent]);

  const updateEquipment = useCallback(async (id: string, data: EquipmentRequest) => {
    try {
      await equipmentService.update(id, data);
      await refreshCurrent();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update equipment' };
    }
  }, [refreshCurrent]);

  const deleteEquipment = useCallback(async (id: string) => {
    try {
      await equipmentService.delete(id);
      await refreshCurrent();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete equipment' };
    }
  }, [refreshCurrent]);

  useEffect(() => {
    fetchEquipment(paramsRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.page, params?.page_size, params?.search, params?.sort_by, params?.sort_dir]);

  // loading = skeleton on first load only; fetching = soft refresh (no flash)
  const loading = initialLoading;

  return {
    equipment,
    loading,
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
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);
  const hasFetchedOnce = useRef(false);

  const paginationRef = useRef(paginationParams);
  paginationRef.current = paginationParams;
  const employeeRef = useRef(currentEmployeeId);
  employeeRef.current = currentEmployeeId;

  // Fix: use PaginatedResponse<AssignedEquipment> instead of `any`
  // `response.data` is now `AssignedEquipment[] | undefined` — fully typed, no cast needed
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
      setError(err instanceof Error ? err.message : 'Failed to fetch assignments');
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
      setError('Invalid employee ID');
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
      return { success: false, error: err instanceof Error ? err.message : 'Failed to assign equipment' };
    }
  }, [refreshCurrent]);

  const removeEquipment = useCallback(async (data: RemoveEquipmentRequest) => {
    try {
      await equipmentAssignmentService.remove(data);
      await refreshCurrent();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to remove equipment' };
    }
  }, [refreshCurrent]);

  const updateAssignment = useCallback(async (data: UpdateAssignmentRequest) => {
    try {
      await equipmentAssignmentService.updateAssignment(data);
      await refreshCurrent();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update assignment' };
    }
  }, [refreshCurrent]);

  useEffect(() => {
    // Respect current employee filter when pagination changes
    if (employeeRef.current) {
      fetchAssignmentsByEmployee(employeeRef.current, paginationRef.current);
    } else {
      fetchAssignments(paginationRef.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationParams?.page, paginationParams?.page_size]);

  const loading = initialLoading;

  return {
    assignments,
    loading,
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