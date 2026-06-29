/* eslint-disable react-refresh/only-export-components */
/**
 * Shared reusable pieces for equipment components
 */
import React, { useState, useMemo, useCallback } from 'react';
import { TableHead } from '@/components/ui/table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { useServerSelect } from '../../hooks/useServerSelect';
import { equipmentCategoryService, equipmentService } from '../../services/equipmentService';
import { employeeService } from '../../services/employeeService';
import type { EquipmentCategory, Equipment } from '../../types';
import type { Employee } from '../../services/employeeService';

// ─── SortableTableHead ─────────────────────────────────────────────────────────

interface SortableTableHeadProps {
  column: string;
  label: string;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  onSort: (col: string) => void;
  className?: string;
}

export const SortableTableHead: React.FC<SortableTableHeadProps> = ({
  column, label, sortBy, sortDir, onSort, className,
}) => {
  const isActive = sortBy === column;
  const Icon = isActive ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <TableHead
      className={`cursor-pointer select-none hover:bg-muted/50 ${className ?? ''}`}
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        <Icon className={`h-4 w-4 ${isActive ? '' : 'opacity-40'}`} />
      </div>
    </TableHead>
  );
};

// ─── useTableSort ──────────────────────────────────────────────────────────────

export function useTableSort<T extends string>(initial?: T) {
  const [sortBy, setSortBy] = useState<T | ''>((initial ?? '') as T | '');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = useCallback((col: string) => {
    setSortBy(prev => {
      if (prev === col) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        return prev;
      }
      setSortDir('asc');
      return col as T;
    });
  }, []);

  return { sortBy, sortDir, handleSort };
}

// ─── useSearchSort ─────────────────────────────────────────────────────────────

export function useSearchSort<T extends string>(initialSort?: T) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const debouncedSearch = useDebounce(searchQuery, 400);
  const { sortBy, sortDir, handleSort } = useTableSort<T>(initialSort);

  const params = useMemo(() => ({
    page: currentPage,
    page_size: pageSize,
    search: debouncedSearch || undefined,
    sort_by: sortBy || undefined,
    sort_dir: sortDir,
  }), [currentPage, pageSize, debouncedSearch, sortBy, sortDir]);

  const onSearch = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, []);

  const onPageChange = useCallback((page: number) => setCurrentPage(page), []);
  const onPageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  return {
    searchQuery, debouncedSearch, currentPage, pageSize,
    sortBy, sortDir, params, onSearch, onPageChange, onPageSizeChange,
    handleSort, setCurrentPage,
  };
}

// ─── Reusable server-select hooks ─────────────────────────────────────────────

const DROPDOWN_PAGE_SIZE = 10;

/** Server-driven searchable dropdown for equipment categories */
export function useCategorySelect() {
  const fetcher = useCallback(async (search: string, page: number) => {
    const res = await equipmentCategoryService.getAll({ search: search || undefined, page, page_size: DROPDOWN_PAGE_SIZE });
    return { items: res.categories || [] as EquipmentCategory[], totalPages: res.pagination?.total_pages ?? 1 };
  }, []);
  const toOption = useCallback((cat: EquipmentCategory) => ({ value: cat.id || '', label: cat.name || '' }), []);
  return useServerSelect({ fetcher, toOption });
}

/** Server-driven searchable dropdown for equipment items */
export function useEquipmentSelect() {
  const fetcher = useCallback(async (search: string, page: number) => {
    const res = await equipmentService.getAll({ search: search || undefined, page, page_size: DROPDOWN_PAGE_SIZE });
    return { items: res.equipment || [] as Equipment[], totalPages: res.pagination?.total_pages ?? 1 };
  }, []);
  const toOption = useCallback((item: Equipment) => ({ value: item.id || '', label: item.name || '' }), []);
  return useServerSelect({ fetcher, toOption });
}

/** Server-driven searchable dropdown for employees */
export function useEmployeeSelect() {
  const fetcher = useCallback(async (search: string, page: number) => {
    const res = await employeeService.getAll({ search: search || undefined, page, page_size: DROPDOWN_PAGE_SIZE });
    return { items: res.employees || [] as Employee[], totalPages: res.total_pages ?? 1 };
  }, []);
  const toOption = useCallback((emp: Employee) => ({ value: emp.id, label: emp.full_name }), []);
  return useServerSelect({ fetcher, toOption });
}

/** Server-driven searchable dropdown for manager assignment (HR, MANAGER, ADMIN, SUPERADMIN only) */
export function useManagerSelect() {
  const fetcher = useCallback(async (search: string, page: number) => {
    const res = await employeeService.getAll({
      search: search || undefined,
      page,
      page_size: DROPDOWN_PAGE_SIZE,
      status: 'active',
      roles: ['HR', 'MANAGER', 'ADMIN', 'SUPERADMIN'],
    });
    return { items: res.employees || [] as Employee[], totalPages: res.total_pages ?? 1 };
  }, []);
  const toOption = useCallback(
    (emp: Employee) => ({ value: emp.id, label: `${emp.full_name} (${emp.role})` }),
    [],
  );
  return useServerSelect({ fetcher, toOption });
}