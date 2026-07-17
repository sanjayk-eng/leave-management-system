/**
 * TodaysLeavesSheet — right-side slide-over showing today's on-leave employees
 * (or the current user's own leave for non-managers).
 *
 * Design matches AssignedAssetsSheet / LeaveBalanceSheet:
 *  - Summary stat tiles in header
 *  - Card-based rows with icon accent
 *  - StatusBadge reused for consistency
 *  - ScrollArea body, fixed header/footer
 */
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator }  from '@/components/ui/separator';
import { Badge }      from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDate }  from '@/lib/dateUtils';
import { CalendarOff, CalendarDays, Clock, Users } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeaveItem {
  id:                 string;
  employee:           string;
  leave_type:         string;
  start_date:         string;
  end_date:           string;
  status:             string;
  approval_name?:     string;
  leave_timing_type?: string;
  leave_timing?:      string;
}

interface TodaysLeavesSheetProps {
  open:             boolean;
  onOpenChange:     (open: boolean) => void;
  leaves:           LeaveItem[];
  isAdminOrManager: boolean;
  date?:            Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIMING_LABEL: Record<string, string> = {
  FIRST_HALF:  'First Half',
  SECOND_HALF: 'Second Half',
  EARLY:       'Early Leave',
  FULL:        'Full Day',
};

function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDisplayDate(d: Date) {
  return d.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ─── Stat tile (reused pattern) ───────────────────────────────────────────────

const StatTile = ({
  label, value, icon: Icon,
}: {
  label: string;
  value: number | string;
  icon:  React.ElementType;
}) => (
  <div className="rounded-lg border bg-background p-3 flex flex-col gap-1">
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      <span className="text-[10px] font-semibold uppercase tracking-widest">{label}</span>
    </div>
    <p className="text-2xl font-bold tabular-nums leading-none">{value}</p>
  </div>
);

// ─── Leave card ───────────────────────────────────────────────────────────────

const LeaveCard = ({
  leave,
  showEmployee,
}: {
  leave:        LeaveItem;
  showEmployee: boolean;
}) => {
  const isMultiDay = leave.start_date !== leave.end_date;
  const timingLabel = leave.leave_timing_type
    ? (TIMING_LABEL[leave.leave_timing_type] ?? leave.leave_timing_type)
    : null;

  return (
    <div className="rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow p-4">
      <div className="flex items-start justify-between gap-3">
        {/* Left: avatar + info */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {showEmployee && (
            <div className="h-9 w-9 rounded-full bg-muted border flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold text-foreground">
                {getInitials(leave.employee)}
              </span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight truncate">
              {showEmployee ? leave.employee : 'You'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
              {leave.leave_type}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
              {/* Date range */}
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <CalendarDays className="h-3 w-3 shrink-0" />
                {isMultiDay
                  ? `${formatDate(leave.start_date)} – ${formatDate(leave.end_date)}`
                  : formatDate(leave.start_date)}
              </span>
              {/* Timing */}
              {timingLabel && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3 shrink-0" />
                  {timingLabel}
                  {leave.leave_timing && ` · ${leave.leave_timing}`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: status badge */}
        <div className="shrink-0 mt-0.5">
          <StatusBadge status={leave.status} approvalName={leave.approval_name} />
        </div>
      </div>
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const TodaysLeavesSheet = ({
  open, onOpenChange, leaves, isAdminOrManager, date = new Date(),
}: TodaysLeavesSheetProps) => {
  // Count unique leave types
  const leaveTypeCount = new Set(leaves.map(l => l.leave_type)).size;

  // Approved vs pending
  const approvedCount = leaves.filter(
    l => l.status.toUpperCase() === 'APPROVED',
  ).length;

  const hasData = leaves.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[460px] p-0 flex flex-col gap-0">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <SheetHeader className="px-6 pt-6 pb-5 shrink-0 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            {/* Calendar icon box */}
            <div className="h-10 w-10 rounded-lg border bg-background shadow-sm flex items-center justify-center shrink-0">
              <CalendarOff className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base font-semibold leading-tight">
                Today's Leaves
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                {formatDisplayDate(date)}
              </SheetDescription>
            </div>

            {/* Count pill */}
            {hasData && (
              <Badge variant="secondary" className="shrink-0 tabular-nums font-semibold">
                {leaves.length} {leaves.length === 1 ? 'person' : 'people'}
              </Badge>
            )}
          </div>

          {/* Summary tiles — only when data available */}
          {hasData && isAdminOrManager && (
            <div className="grid grid-cols-3 gap-3 mt-4">
              <StatTile label="On Leave"    value={leaves.length}   icon={Users} />
              <StatTile label="Approved"    value={approvedCount}   icon={CalendarDays} />
              <StatTile label="Leave Types" value={leaveTypeCount}  icon={CalendarOff} />
            </div>
          )}
        </SheetHeader>

        {/* ── Body ──────────────────────────────────────────────────────── */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-4 space-y-3">

            {/* Empty state (shouldn't normally show — sheet only opens when leaves.length > 0) */}
            {leaves.length === 0 && (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                  <CalendarOff className="h-7 w-7 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="text-sm font-medium">No leaves today</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isAdminOrManager
                      ? 'No team members are on leave today.'
                      : 'You are not on leave today.'}
                  </p>
                </div>
              </div>
            )}

            {/* Leave cards */}
            {leaves.map(leave => (
              <LeaveCard
                key={leave.id}
                leave={leave}
                showEmployee={isAdminOrManager}
              />
            ))}

          </div>
        </ScrollArea>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        {hasData && (
          <>
            <Separator />
            <div className="px-6 py-3.5 shrink-0 flex items-center justify-between bg-muted/20">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{leaves.length}</span>{' '}
                {leaves.length === 1 ? 'person' : 'people'} on leave
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{leaveTypeCount}</span>{' '}
                leave {leaveTypeCount === 1 ? 'type' : 'types'}
              </p>
            </div>
          </>
        )}

      </SheetContent>
    </Sheet>
  );
};
