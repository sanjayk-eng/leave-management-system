import { useState, useEffect, useCallback } from 'react';
import { logsService } from '@/services/logsService';
import { ActivityEntry, ActivityFeedFilter, ActivityPagination } from '@/types';
import { handleApiError } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

const DEFAULT_PAGE_SIZE = 20;

const EMPTY_PAGINATION: ActivityPagination = {
  page: 1,
  page_size: DEFAULT_PAGE_SIZE,
  total: 0,
  total_pages: 0,
};

export const useLogs = () => {
  const navigate = useNavigate();

  // Filter state
  const [filter, setFilter] = useState<ActivityFeedFilter>({
    page: 1,
    page_size: DEFAULT_PAGE_SIZE,
  });

  // Data state
  const [entries, setEntries]       = useState<ActivityEntry[]>([]);
  const [pagination, setPagination] = useState<ActivityPagination>(EMPTY_PAGINATION);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const fetchActivity = useCallback(async (f: ActivityFeedFilter) => {
    setLoading(true);
    setError(null);
    try {
      const res = await logsService.getActivity(f);
      setEntries(res.data ?? []);
      setPagination(res.pagination ?? EMPTY_PAGINATION);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load activity log');
      handleApiError(err, navigate);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Re-fetch whenever filter changes
  useEffect(() => {
    fetchActivity(filter);
  }, [fetchActivity, filter]);

  // Helpers that update a single filter field and reset page to 1
  const setComponent = (component: string) =>
    setFilter(f => ({ ...f, component: component || undefined, page: 1 }));

  const setAction = (action: string) =>
    setFilter(f => ({ ...f, action: action || undefined, page: 1 }));

  const setPage = (page: number) =>
    setFilter(f => ({ ...f, page }));

  const setPageSize = (page_size: number) =>
    setFilter(f => ({ ...f, page_size, page: 1 }));

  const clearFilters = () =>
    setFilter({ page: 1, page_size: filter.page_size ?? DEFAULT_PAGE_SIZE });

  const refresh = () => fetchActivity(filter);

  return {
    entries,
    pagination,
    loading,
    error,
    filter,
    setFilter,
    setComponent,
    setAction,
    setPage,
    setPageSize,
    clearFilters,
    refresh,
  };
};
