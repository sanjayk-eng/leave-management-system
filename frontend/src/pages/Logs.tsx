import { useLogs }     from '@/hooks/useLogs';
import { useLogsMeta } from '@/hooks/useLogsMeta';
import { LogsFilter }  from '@/components/LogsFilter';
import { LogsTable }   from '@/components/LogsTable';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { Activity } from 'lucide-react';

const Logs = () => {
  const {
    entries, pagination,
    loading, loadingMore, hasMore, error,
    component, action, searchRaw,
    setComponent, setAction, setSearch,
    clearFilters, loadMore, jumpToPage, changePageSize, refresh,
  } = useLogs();

  const { components, actions, loading: metaLoading } = useLogsMeta();

  if (error && entries.length === 0) {
    return <ErrorDisplay error={new Error(error)} onRetry={refresh} />;
  }

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
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

      {/* ── Filters ─────────────────────────────────────────────────────── */}
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
        loading={loading}
      />

      {error && entries.length > 0 && (
        <ErrorDisplay error={new Error(error)} onRetry={refresh} compact />
      )}

      {/* ── Table (infinite scroll + pagination bar) ────────────────────── */}
      <LogsTable
        entries={entries}
        pagination={pagination}
        loading={loading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onPageChange={jumpToPage}
        onPageSizeChange={changePageSize}
      />

    </div>
  );
};

export default Logs;
