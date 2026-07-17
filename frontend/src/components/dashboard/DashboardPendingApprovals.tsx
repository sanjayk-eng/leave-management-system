import { Badge }      from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDate }  from '@/lib/dateUtils';
import { Clock }       from 'lucide-react';

interface LeaveItem {
  id:             string;
  employee:       string;
  leave_type:     string;
  start_date:     string;
  end_date:       string;
  days:           number;
  status:         string;
  approval_name?: string;
  applied_at?:    string;
  applying_date?: string;
  created_at?:    string;
}

interface DashboardPendingApprovalsProps {
  leaves: LeaveItem[];
}

export const DashboardPendingApprovals = ({ leaves }: DashboardPendingApprovalsProps) => {
  if (leaves.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Pending Approvals</p>
          <p className="text-xs text-muted-foreground mt-0.5">Leave requests awaiting your review</p>
        </div>
        <Badge variant="secondary" className="tabular-nums">
          {leaves.length}
        </Badge>
      </div>

      {/* Table-like list */}
      <div className="divide-y overflow-x-auto">
        {leaves.map((leave) => (
          <div key={leave.id} className="px-5 py-3.5 flex flex-wrap sm:flex-nowrap items-start sm:items-center gap-x-4 gap-y-1">
            {/* Employee */}
            <div className="w-full sm:w-36 sm:shrink-0 min-w-0">
              <p className="text-sm font-medium truncate">{leave.employee}</p>
            </div>

            {/* Leave type + dates */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate">{leave.leave_type}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDate(leave.start_date)} – {formatDate(leave.end_date)}
                {' · '}{leave.days} {leave.days === 1 ? 'day' : 'days'}
              </p>
            </div>

            {/* Applied */}
            <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
              <Clock className="h-3 w-3" />
              {formatDate(leave.applied_at ?? leave.applying_date ?? leave.created_at ?? leave.start_date)}
            </div>

            {/* Status */}
            <div className="shrink-0">
              <StatusBadge status={leave.status} approvalName={leave.approval_name} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
