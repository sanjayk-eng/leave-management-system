import { useState, useMemo, useCallback } from 'react';
import { useLogs }     from '@/hooks/useLogs';
import { useLogsMeta } from '@/hooks/useLogsMeta';
import { LogsFilter }  from '@/components/LogsFilter';
import { LogsTable } from '@/components/LogsTable';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { ApiError } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import { Activity } from 'lucide-react';

const DEFAULT_PAGE_SIZE = 20;

// 403 → authenticated but no log:read permission
function isAccessDenied(err: Error | null): boolean {
  return err instanceof ApiError && err.status === 403;
}

const Logs = () => {
  // ── Filter / pagination state (owned here, like EquipmentCategories) ────────
  const [currentPage, setCurrentPage]   = useState(1);
  const [pageSize, setPageSize]         = useState(DEFAULT_PAGE_SIZE);
  const [searchRaw, setSearchRaw]       = useState('');
  const [component, setComponentState]  = useState('');
  const [action, setActionState]        = useState('');

  // Debounce search 350 ms — same as useLogs previously did internally
  const search = useDebounce(searchRaw, 350);

  // Combine into params object — useLogs useEffect watches each field
  const params = useMemo(() => ({
    page:      currentPage,
    page_size: pageSize,
    search:    search    || undefined,
    component: component || undefined,
    action:    action    || undefined,
  }), [currentPage, pageSize, search, component, action]);

  // ── Data ─────────────────────────────────────────────────────────────────────
  const { entries, pagination, initialLoading, fetching, error, fetchLogs } = useLogs(params);
  const { components, actions, loading: metaLoading } = useLogsMeta();

  // ── Filter setters — all reset to page 1 ────────────────────────────────────
  const setSearch = useCallback((v: string) => {
    setSearchRaw(v);
    setCurrentPage(1);
  }, []);

  const setComponent = useCallback((v: string) => {
    setActionState('');   // clear action when component changes
    setComponentState(v);
    setCurrentPage(1);
  }, []);

  const setAction = useCallback((v: string) => {
    setActionState(v);
    setCurrentPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchRaw('');
    setComponentState('');
    setActionState('');
    setCurrentPage(1);
  }, []);

  const refresh = useCallback(() => {
    fetchLogs(params);
  }, [fetchLogs, params]);

  // ── Pagination handlers (same shape as onPageChange/onPageSizeChange in asset) ──
  const onPageChange = useCallback((page: number) => setCurrentPage(page), []);
  const onPageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  // ── Access denied — show amber lock box, keep the header ────────────────────
  if (isAccessDenied(error)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Activity Log</h1>
            <p className="text-sm text-muted-foreground">
              Audit trail — every state-changing action, who did it, and what changed.
            </p>
          </div>
        </div>
        <ErrorDisplay error={error} />
      </div>
    );
  }

  // ── Other error on empty page (network, 500, etc.) ───────────────────────────
  if (error && entries.length === 0) {
    return <ErrorDisplay error={error} onRetry={refresh} />;
  }

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Activity className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activity Log</h1>
          <p className="text-sm text-muted-foreground">
            Audit trail — every state-changing action, who did it, and what changed.
          </p>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <LogsFilter
        searchRaw={searchRaw}
        component={component}
        action={action}
        components={components}
        actions={actions}
        metaLoading={metaLoading}
        onSearch={setSearch}
        onComponentChange={setComponent}
        onActionChange={setAction}
        onClear={clearFilters}
        onRefresh={refresh}
        loading={initialLoading || fetching}
      />

      {/* Non-fatal inline error (e.g. refetch failed but we have stale data) */}
      {error && entries.length > 0 && (
        <ErrorDisplay error={error} onRetry={refresh} compact />
      )}

      {/* ── Table + ServerPagination ─────────────────────────────────────────── */}
      <LogsTable
        entries={entries}
        pagination={pagination}
        loading={initialLoading}
        fetching={fetching}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />

    </div>
  );
};

export default Logs;
