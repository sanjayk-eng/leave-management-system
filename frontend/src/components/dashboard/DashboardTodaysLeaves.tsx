import { Skeleton }    from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { formatDate }   from '@/lib/dateUtils';
import { CalendarOff }  from 'lucide-react';

interface LeaveItem {
  id:                string;
  employee:          string;
  leave_type:        string;
  start_date:        string;
  end_date:          string;
  status:            string;
  approval_name?:    string;
  leave_timing_type?: string;
  leave_timing?:     string;
}

const TIMING_LABEL: Record<string, string> = {
  FIRST_HALF:  'First Half',
  SECOND_HALF: 'Second Half',
  EARLY:       'Early Leave',
  FULL:        'Full Day',
};

interface DashboardTodaysLeavesProps {
  leaves:           LeaveItem[];
  isLoading:        boolean;
  error:            Error | null;
  isAdminOrManager: boolean;
  onRetry:          () => void;
}

export const DashboardTodaysLeaves = ({
  leaves, isLoading, error, isAdminOrManager, onRetry,
}: DashboardTodaysLeavesProps) => (
  <div className="rounded-xl border bg-card shadow-sm flex flex-col">
    {/* Header */}
    <div className="px-5 py-4 border-b">
      <p className="text-sm font-semibold">Today's Leaves</p>
      <p className="text-xs text-muted-foreground mt-0.5">
        {isAdminOrManager ? 'Team members on leave today' : 'Your leave status today'}
      </p>
    </div>

    {/* Body */}
    <div className="px-5 py-4 flex-1">
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-44" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorDisplay error={error} onRetry={onRetry} compact />
      ) : leaves.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
          <CalendarOff className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {isAdminOrManager ? 'No one is on leave today' : 'You are not on leave today'}
          </p>
        </div>
      ) : (
        <div className="divide-y">
          {leaves.map((leave) => (
            <div key={leave.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-tight truncate">
                  {isAdminOrManager ? leave.employee : 'You'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {leave.leave_type}
                  {' · '}
                  {formatDate(leave.start_date)}
                  {leave.start_date !== leave.end_date && ` – ${formatDate(leave.end_date)}`}
                </p>
                {leave.leave_timing_type && (
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {TIMING_LABEL[leave.leave_timing_type] ?? leave.leave_timing_type}
                    {leave.leave_timing && ` · ${leave.leave_timing}`}
                  </p>
                )}
              </div>
              <StatusBadge status={leave.status} approvalName={leave.approval_name} />
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);
