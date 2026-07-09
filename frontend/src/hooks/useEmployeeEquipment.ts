import { useState, useEffect, useCallback, useRef } from 'react';
import { AssignedEquipment } from '../types';
import { PaginationParams, PaginatedResponse } from '../types/pagination';
import { equipmentAssignmentService } from '../services/equipmentService';

export const useEmployeeEquipment = (employeeId: string, paginationParams?: PaginationParams) => {
  const [assignments, setAssignments] = useState<AssignedEquipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
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
    setLoading(true);
    setError(null);
    try {
      const response: PaginatedResponse<AssignedEquipment> =
        await equipmentAssignmentService.getByEmployee(employeeId, params ?? paramsRef.current);
      setAssignments(response?.data ?? []);
      if (response.pagination) {
        setCurrentPage(response.pagination.page);
        setPageSizeState(response.pagination.page_size);
        setTotalItems(response.pagination.total_items);
        setTotalPages(response.pagination.total_pages);
      }
    } catch (err) {
      // Preserve the raw Error (including ApiError.status) so ErrorDisplay
      // can pick the right icon, color, and message automatically.
      setError(err instanceof Error ? err : new Error(String(err)));
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
