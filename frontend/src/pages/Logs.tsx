import { useLogs } from '@/hooks/useLogs';
import { LogsFilter } from '@/components/LogsFilter';
import { LogsTable } from '@/components/LogsTable';
import { LoadingState } from '@/components/LoadingState';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Activity } from 'lucide-react';

const Logs = () => {
  const {
    logs,
    loading,
    error,
    totalCount,
    daysFilter,
    setDaysFilter,
    dateFrom,
    fetchLogs,
    refreshLogs,
  } = useLogs();

  if (loading && logs.length === 0) {
    return <LoadingState message="Loading system logs..." />;
  }

  if (error && logs.length === 0) {
    return (
      <ErrorDisplay
        error={new Error(error)}
        onRetry={() => setDaysFilter(daysFilter)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">System Logs</h1>
            <p className="text-muted-foreground">
              Monitor and track all system activities and user actions
            </p>
          </div>
        </div>
      </div>

      {/* Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">
              Last {daysFilter} {daysFilter === 1 ? 'day' : 'days'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Date Range</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{daysFilter}</div>
            <p className="text-xs text-muted-foreground">
              {daysFilter === 1 ? 'Day' : 'Days'} filter active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">From Date</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {dateFrom ? new Date(dateFrom).toLocaleDateString() : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Starting date
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Controls */}
      <LogsFilter
        currentDays={daysFilter}
        onFilterChange={setDaysFilter}
        onRefresh={refreshLogs}
        loading={loading}
      />

      {/* Error Display (if error occurs during refresh) */}
      {error && logs.length > 0 && (
        <ErrorDisplay
          error={new Error(error)}
          onRetry={() => setDaysFilter(daysFilter)}
          compact
        />
      )}

      {/* Logs Table */}
      <LogsTable
        logs={logs}
        totalCount={totalCount}
        daysFilter={daysFilter}
        dateFrom={dateFrom}
        loading={loading}
      />
    </div>
  );
};

export default Logs;