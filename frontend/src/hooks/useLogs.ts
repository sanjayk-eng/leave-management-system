import { useState, useEffect, useCallback, useRef } from 'react';
import { logsService } from '@/services/logsService';
import { ActivityEntry, ActivityFeedFilter } from '@/types';
import { ApiError, handleApiError } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import { useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LogsParams {
  page:      number;
  page_size: number;
  search?:   string;
  component?: string;
  action?:   string;
}

export interface LogsPagination {
  page:        number;
  page_size:   number;
  total:       number;
  total_pages: number;
}

const DEFAULT_PAGE      = 1;
const DEFAULT_PAGE_SIZE = 20;

const EMPTY_PAGINATION: LogsPagination = {
  page:        DEFAULT_PAGE,
  page_size:   DEFAULT_PAGE_SIZE,
  total:       0,
  total_pages: 0,
};

// Normalise any caught value to an Error preserving ApiError status
function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useLogs — server-side paginated activity feed.
 *
 * Follows the same pattern as useEquipmentCategories / useEquipment:
 *  - Consumer owns page, pageSize, search, component, action state.
 *  - Pass params down; useEffect watches them and re-fetches.
 *  - initialLoading → skeleton on first load.
 *  - fetching       → opacity overlay on subsequent fetches (same as asset side).
 *  - No infinite scroll — pure server pagination via ServerPagination bar.
 */
export const useLogs = (params: LogsParams) => {
  const navigate = useNavigate();

  const [entries, setEntries]         = useState<ActivityEntry[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching]       = useState(false);
  const [error, setError]             = useState<Error | null>(null);
  const [pagination, setPagination]   = useState<LogsPagination>(EMPTY_PAGINATION);

  // Track first-fetch so we know which loading flag to set
  const hasFetchedOnce = useRef(false);
  // Keep latest params available to fetchLogs without it being a dep
  const paramsRef = useRef(params);
  paramsRef.current = params;

  // Prevent stale responses overwriting newer ones
  const reqIdRef = useRef(0);

  const fetchLogs = useCallback(async (fetchParams?: LogsParams) => {
    const p = fetchParams ?? paramsRef.current;
    const reqId = ++reqIdRef.current;

    const isFirst = !hasFetchedOnce.current;
    if (isFirst) setInitialLoading(true);
    else         setFetching(true);

    setError(null);

    const filter: ActivityFeedFilter = {
      page:      p.page,
      page_size: p.page_size,
      search:    p.search    || undefined,
      component: p.component || undefined,
      action:    p.action    || undefined,
    };

    try {
      const res = await logsService.getActivity(filter);
      if (reqId !== reqIdRef.current) return; // stale — discard

      setEntries(res.data ?? []);
      setPagination(res.pagination ?? EMPTY_PAGINATION);
    } catch (err: unknown) {
      if (reqId !== reqIdRef.current) return;
      const errObj = toError(err);
      setError(errObj);
      setEntries([]);
      // 403 = render inline Access Denied box — skip toast
      if (!(err instanceof ApiError && err.status === 403)) {
        handleApiError(err, navigate);
      }
    } finally {
      if (reqId === reqIdRef.current) {
        hasFetchedOnce.current = true;
        setInitialLoading(false);
        setFetching(false);
      }
    }
  }, [navigate]);

  // Re-fetch whenever any param changes — mirrors asset pattern exactly
  useEffect(() => {
    fetchLogs(paramsRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.page, params.page_size, params.search, params.component, params.action]);

  return {
    entries,
    pagination,
    initialLoading,   // true only on very first load → show skeletons
    fetching,         // true on subsequent fetches → show opacity overlay
    error,
    fetchLogs,        // exposed for manual refresh
  };
};
