/**
 * Shared AG-Grid cell renderers for leave tables.
 * Used by Approvals, MyLeaveHistory, and any future leave grids.
 */
import { ICellRendererParams } from 'ag-grid-community';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { StatusBadge } from '@/components/StatusBadge';
import { Eye, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const ReasonCellRenderer = (params: ICellRendererParams) => {
  const reason = params.value;
  if (!reason) {
    return <span className="text-muted-foreground italic text-xs">No reason</span>;
  }
  return (
    <HoverCard openDelay={100}>
      <HoverCardTrigger asChild>
        <span className="text-blue-600 dark:text-blue-400 font-medium cursor-pointer hover:underline inline-flex items-center gap-1">
          📝 View
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-96 p-0 overflow-hidden z-[9999]" side="top" align="center">
        <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <h4 className="text-sm font-bold flex items-center gap-2">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Leave Reason
          </h4>
        </div>
        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40">
          <div className="p-3 bg-white/80 dark:bg-black/20 rounded-lg border border-blue-100 dark:border-blue-900/50">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words whitespace-pre-wrap">
              {reason}
            </p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export const TimingCellRenderer = (params: ICellRendererParams) => {
  const { leave_timing_type, leave_timing } = params.data;

  const getTimingLabel = (type?: string) => {
    switch (type) {
      case 'FIRST_HALF':  return 'First Half';
      case 'SECOND_HALF': return 'Second Half';
      case 'FULL':        return 'Full Day';
      case 'EARLY':       return 'Early Leave';
      default:            return 'Full Day';
    }
  };

  return (
    <div className="flex flex-col justify-center gap-0.5 leading-tight py-1">
      <span className="font-medium text-sm whitespace-nowrap">
        {getTimingLabel(leave_timing_type)}
      </span>
      {leave_timing && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">{leave_timing}</span>
      )}
    </div>
  );
};

export const StatusCellRenderer = (params: ICellRendererParams) => (
  <StatusBadge status={params.data.status} approvalName={params.data.approval_name} />
);

/**
 * EmployeeCellRenderer
 * Shows employee name with an "Applied by X" sub-line when someone applied on their behalf.
 * Use this on the Employee column in admin/manager leave grids.
 */
export const EmployeeCellRenderer = (params: ICellRendererParams) => {
  const name: string        = params.value ?? params.data?.employee ?? '—';
  const appliedByName: string | undefined = params.data?.applied_by_name;

  return (
    <div className="flex flex-col justify-center gap-0.5 py-1 leading-tight">
      <span className="font-medium text-sm">{name}</span>
      {appliedByName && (
        <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
          <UserCheck className="h-3 w-3 shrink-0" />
          via {appliedByName}
        </span>
      )}
    </div>
  );
};

/**
 * AppliedByCellRenderer
 * Standalone cell for the "Applied By" column — shows a badge when it was on-behalf,
 * or a muted "Self" label otherwise.
 */
export const AppliedByCellRenderer = (params: ICellRendererParams) => {
  const appliedByName: string | undefined = params.data?.applied_by_name;

  if (!appliedByName) {
    return <span className="text-xs text-muted-foreground italic">Self</span>;
  }

  return (
    <Badge
      variant="outline"
      className="gap-1 border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300 text-xs font-medium"
    >
      <UserCheck className="h-3 w-3 shrink-0" />
      {appliedByName}
    </Badge>
  );
};

/**
 * ApprovalLogCellRenderer
 * Renders an eye icon button that calls params.context.onViewApprovalLog(leave).
 * The page must pass `context: { onViewApprovalLog: (leave) => void }` to the grid.
 * Shows "—" when there is no approval_log on the row.
 */
export const ApprovalLogCellRenderer = (params: ICellRendererParams) => {
  const log = params.data?.approval_log;
  const hasLog = Array.isArray(log) && log.length > 0;

  if (!hasLog) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0 hover:bg-muted"
      onClick={() => params.context?.onViewApprovalLog?.(params.data)}
      title="View approval flow"
    >
      <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
    </Button>
  );
};
