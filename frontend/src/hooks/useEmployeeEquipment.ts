import { useState, useEffect, useCallback, useRef } from 'react';
import { AssignedEquipment } from '../types';
import { PaginationParams, PaginatedResponse } from '../types/pagination';
import { equipmentAssignmentService } from '../services/equipmentService';

// Fix: typed interface instead of `any` for API errors that carry an HTTP status code.
// Using an interface (not `class`) means no runtime overhead — it's erased at compile time.
interface ApiError extends Error {
  status?: number;
}

// Narrow an unknown catch value to ApiError so we can safely read `.status`
const toApiError = (err: unknown): ApiError => {
  if (err instanceof Error) return err as ApiError;
  return Object.assign(new Error(String(err)), { status: undefined });
};

export const useEmployeeEquipment = (employeeId: string, paginationParams?: PaginationParams) => {
  const [assignments, setAssignments] = useState<AssignedEquipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(paginationParams?.page || 1);
  const [pageSize, setPageSizeState] = useState(paginationParams?.page_size || 10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const paramsRef = useRef(paginationParams);
  paramsRef.current = paginationParams;

  const fetchEmployeeEquipment = useCallback(async (params?: PaginationParams) => {
    if (!employeeId) {
      setAssignments([]);
      setError(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response: PaginatedResponse<AssignedEquipment> =
        await equipmentAssignmentService.getByEmployee(employeeId, params ?? paramsRef.current);
      setAssignments(response?.data ?? []);
      if (response.pagination) {
        setCurrentPage(response.pagination.page);
        setPageSizeState(response.pagination.page_size);
        setTotalItems(response.pagination.total_items);
        setTotalPages(response.pagination.total_pages);
      }
    } catch (err: unknown) {
      // Fix: narrow `unknown` → ApiError via helper; no `any` needed
      const apiErr = toApiError(err);
      const status = apiErr.status;
      const errorMessage =
        status === 401 ? 'Authentication required. Please refresh the page.' :
        status === 403 ? 'Access denied. You may not have permission to view equipment data.' :
        status === 404 ? 'Equipment data not found for this employee.' :
        status === 0   ? 'Unable to connect to server. Please check your connection.' :
        apiErr.message || 'Failed to load equipment data';
      setError(errorMessage);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (employeeId) {
      fetchEmployeeEquipment(paramsRef.current);
    } else {
      setAssignments([]);
      setError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, paginationParams?.page, paginationParams?.page_size]);

  return {
    assignments,
    loading,
    error,
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    refetch: () => fetchEmployeeEquipment(paramsRef.current),
    setPage: (page: number) => fetchEmployeeEquipment({ ...paramsRef.current, page }),
    setPageSize: (size: number) => fetchEmployeeEquipment({ ...paramsRef.current, page_size: size, page: 1 }),
  };
};