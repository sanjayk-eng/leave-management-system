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
  /** Set to false to defer the initial fetch until you're ready (e.g. dialog open) */
  enabled?: boolean;
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
  enabled = true,
}: UseServerSelectOptions<T>): UseServerSelectReturn {
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<ServerSelectOption[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const debouncedSearch = useDebounce(search, debounceMs);

  const reqIdRef = useRef(0);
  const hasFetched = useRef(false);

  const fetchPage = useCallback(async (q: string, p: number, append: boolean) => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    try {
      const result = await fetcher(q, p);
      if (reqId !== reqIdRef.current) return;
      const mapped = result.items.map(toOption);
      setOptions(prev => append ? [...prev, ...mapped] : mapped);
      setTotalPages(result.totalPages);
      setPage(p);
    } catch (err: unknown) {
      if (reqId === reqIdRef.current) {
        setOptions(prev => append ? prev : []);
      }
    } finally {
      if (reqId === reqIdRef.current) {
        setLoading(false);
      }
    }
  }, [fetcher, toOption]);

  // Initial load fires only when enabled=true (first time it becomes true)
  // Subsequent calls fire on debounced search change (also guarded by enabled)
  useEffect(() => {
    if (!enabled) return;
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchPage('', 1, false);
      return;
    }
    fetchPage(debouncedSearch, 1, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, debouncedSearch]);

  const onSearch = useCallback((q: string) => setSearch(q), []);

  const loadMore = useCallback(() => {
    if (!loading && page < totalPages) {
      fetchPage(debouncedSearch, page + 1, true);
    }
  }, [loading, page, totalPages, debouncedSearch, fetchPage]);

  return { options, loading, hasMore: page < totalPages, search, onSearch, loadMore };
}
