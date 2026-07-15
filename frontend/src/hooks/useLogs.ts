import { useState, useEffect, useCallback, useRef } from 'react';
import { logsService } from '@/services/logsService';
import { ActivityEntry, ActivityFeedFilter, ActivityPagination } from '@/types';
import { handleApiError } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import { useNavigate } from 'react-router-dom';

const DEFAULT_PAGE_SIZE = 20;

const EMPTY_PAGINATION: ActivityPagination = {
  page: 1,
  page_size: DEFAULT_PAGE_SIZE,
  total: 0,
  total_pages: 0,
};

/**
 * useLogs — infinite-scroll activity feed with debounced free-text search
 * and component/action filters.
 *
 * Behaviour:
 *  - First load or any filter/search change → replace entries (page 1).
 *  - loadMore() → append next page (called by scroll sentinel in LogsTable).
 *  - search is debounced 350 ms so keystrokes don't hammer the API.
 *  - component / action changes reset to page 1 immediately.
 */
export const useLogs = () => {
  const navigate = useNavigate();

  // ── Filter state (component, action — reset page on change) ────────────────
  const [component, setComponentState] = useState<string>('');
  const [action, setActionState]       = useState<string>('');
  const [searchRaw, setSearchRaw]      = useState<string>('');
  const search = useDebounce(searchRaw, 350);

  // ── Pagination state ────────────────────────────────────────────────────────
  const [page, setPage]               = useState(1);
  const [pagination, setPagination]   = useState<ActivityPagination>(EMPTY_PAGINATION);

  // ── Data state ──────────────────────────────────────────────────────────────
  const [entries, setEntries]         = useState<ActivityEntry[]>([]);
  const [loading, setLoading]         = useState(false);       // first-page / filter load
  const [loadingMore, setLoadingMore] = useState(false);       // append load
  const [error, setError]             = useState<string | null>(null);

  // Prevent stale responses overwriting newer ones
  const reqIdRef = useRef(0);

  // ── Core fetcher ────────────────────────────────────────────────────────────
  const fetchPage = useCallback(async (
    filter: ActivityFeedFilter,
    append: boolean,
  ) => {
    const reqId = ++reqIdRef.current;

    if (append) setLoadingMore(true);
    else        setLoading(true);

    setError(null);

    try {
      const res = await logsService.getActivity(filter);
      if (reqId !== reqIdRef.current) return; // stale response — discard

      const incoming = res.data ?? [];
      setEntries(prev => append ? [...prev, ...incoming] : incoming);
      setPagination(res.pagination ?? EMPTY_PAGINATION);
    } catch (err: unknown) {
      if (reqId !== reqIdRef.current) return;
      const msg = err instanceof Error ? err.message : 'Failed to load activity log';
      setError(msg);
      handleApiError(err, navigate);
    } finally {
      if (reqId === reqIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [navigate]);

  // ── Reset + fetch whenever filters or debounced search changes ──────────────
  useEffect(() => {
    setPage(1);
    setEntries([]);
    fetchPage({ component: component || undefined, action: action || undefined, search: search || undefined, page: 1, page_size: DEFAULT_PAGE_SIZE }, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [component, action, search]);

  // ── Load more (append next page via scroll) ────────────────────────────────
  const loadMore = useCallback(() => {
    if (loadingMore || loading) return;
    if (page >= pagination.total_pages) return;

    const nextPage = page + 1;
    setPage(nextPage);
    fetchPage({
      component: component || undefined,
      action:    action    || undefined,
      search:    search    || undefined,
      page:      nextPage,
      page_size: DEFAULT_PAGE_SIZE,
    }, true);
  }, [fetchPage, loadingMore, loading, page, pagination.total_pages, component, action, search]);

  // ── Jump to a specific page (replace — used by pagination bar) ─────────────
  const jumpToPage = useCallback((p: number) => {
    setPage(p);
    setEntries([]);
    fetchPage({
      component: component || undefined,
      action:    action    || undefined,
      search:    search    || undefined,
      page:      p,
      page_size: DEFAULT_PAGE_SIZE,
    }, false);
  }, [fetchPage, component, action, search]);

  // ── Change page size (replace, reset to page 1) ────────────────────────────
  const changePageSize = useCallback((size: number) => {
    setPage(1);
    setEntries([]);
    fetchPage({
      component: component || undefined,
      action:    action    || undefined,
      search:    search    || undefined,
      page:      1,
      page_size: size,
    }, false);
  }, [fetchPage, component, action, search]);

  // ── Public filter setters — all reset to page 1 ────────────────────────────
  const setComponent = useCallback((v: string) => {
    setActionState('');   // clear action when component changes
    setComponentState(v);
  }, []);

  const setAction = useCallback((v: string) => setActionState(v), []);
  const setSearch = useCallback((v: string) => setSearchRaw(v),   []);

  const clearFilters = useCallback(() => {
    setComponentState('');
    setActionState('');
    setSearchRaw('');
  }, []);

  const refresh = useCallback(() => {
    setPage(1);
    setEntries([]);
    fetchPage({ component: component || undefined, action: action || undefined, search: search || undefined, page: 1, page_size: DEFAULT_PAGE_SIZE }, false);
  }, [fetchPage, component, action, search]);

  const hasMore = page < pagination.total_pages;

  return {
    entries,
    pagination,
    loading,
    loadingMore,
    hasMore,
    error,
    // filter state (read)
    component,
    action,
    searchRaw,
    // filter setters
    setComponent,
    setAction,
    setSearch,
    clearFilters,
    // scroll pagination
    loadMore,
    // bar pagination
    jumpToPage,
    changePageSize,
    refresh,
  };
};
