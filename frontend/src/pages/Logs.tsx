import { useLogs } from '@/hooks/useLogs';
import { LogsFilter } from '@/components/LogsFilter';
import { LogsTable } from '@/components/LogsTable';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Activity,
  FileText,
  Users,
  Clock,
} from 'lucide-react';

// ─── Stat card skeleton ───────────────────────────────────────────────────────
const StatSkeleton = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-4 rounded" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-16 mb-1" />
      <Skeleton className="h-3 w-32" />
    </CardContent>
  </Card>
);

// ─── Page ─────────────────────────────────────────────────────────────────────
const Logs = () => {
  const {
    entries,
    pagination,
    loading,
    error,
    filter,
    setComponent,
    setAction,
    setPage,
    setPageSize,
    clearFilters,
    refresh,
  } = useLogs();

  // Full-page error (first load, no data yet)
  if (error && entries.length === 0) {
    return (
      <ErrorDisplay
        error={new Error(error)}
        onRetry={refresh}
      />
    );
  }

  const isFirstLoad = loading && entries.length === 0;

  return (
    <div className="space-y-6">

      {/* ── Page header ─────────────────────────────────────────────────── */}
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

      {/* ── Stats row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isFirstLoad ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {pagination.total.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {filter.component || filter.action
                    ? 'matching current filters'
                    : 'across all time'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Page</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {pagination.page}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    / {pagination.total_pages || 1}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {pagination.page_size} entries per page
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Showing</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {entries.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  entries on this page
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <LogsFilter
        filter={filter}
        onComponentChange={setComponent}
        onActionChange={setAction}
        onClear={clearFilters}
        onRefresh={refresh}
        loading={loading}
      />

      {/* Inline error banner (refresh failed but we still have old data) */}
      {error && entries.length > 0 && (
        <ErrorDisplay
          error={new Error(error)}
          onRetry={refresh}
          compact
        />
      )}

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <LogsTable
        entries={entries}
        pagination={pagination}
        loading={loading}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

    </div>
  );
};

export default Logs;
