import { useState, useCallback, useRef, useEffect } from 'react';
import { useDebounce } from './useDebounce';

export interface ServerSelectOption {
  value: string;
  label: string;
}

interface UseServerSelectOptions<T> {
  fetcher: (search: string, page: number) => Promise<{ items: T[]; totalPages: number }>;
  toOption: (item: T) => ServerSelectOption;
  debounceMs?: number;
}

interface UseServerSelectReturn {
  options: ServerSelectOption[];
  loading: boolean;
  hasMore: boolean;
  search: string;
  onSearch: (q: string) => void;
  loadMore: () => void;
}

export function useServerSelect<T>({
  fetcher,
  toOption,
  debounceMs = 300,
}: UseServerSelectOptions<T>): UseServerSelectReturn {
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<ServerSelectOption[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const debouncedSearch = useDebounce(search, debounceMs);

  // Use a request-id counter instead of AbortController so we never
  // accidentally abort the very first request before it completes.
  const reqIdRef = useRef(0);
  const hasMounted = useRef(false);

  const fetchPage = useCallback(async (q: string, p: number, append: boolean) => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    try {
      const result = await fetcher(q, p);
      // Discard stale responses
      if (reqId !== reqIdRef.current) return;
      const mapped = result.items.map(toOption);
      setOptions(prev => append ? [...prev, ...mapped] : mapped);
      setTotalPages(result.totalPages);
      setPage(p);
    } catch (err: unknown) {
      // Only clear on non-abort errors so stale results don't linger
      if (reqId === reqIdRef.current) {
        setOptions(prev => append ? prev : []);
      }
    } finally {
      if (reqId === reqIdRef.current) {
        setLoading(false);
      }
    }
  }, [fetcher, toOption]);

  // Initial load immediately on mount (no debounce), then debounced on search change
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      fetchPage('', 1, false);
      return;
    }
    fetchPage(debouncedSearch, 1, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const onSearch = useCallback((q: string) => setSearch(q), []);

  const loadMore = useCallback(() => {
    if (!loading && page < totalPages) {
      fetchPage(debouncedSearch, page + 1, true);
    }
  }, [loading, page, totalPages, debouncedSearch, fetchPage]);

  return { options, loading, hasMore: page < totalPages, search, onSearch, loadMore };
}
