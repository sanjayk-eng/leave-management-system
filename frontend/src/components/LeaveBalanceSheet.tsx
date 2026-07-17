/**
 * LeaveBalanceSheet — professional right-side panel showing an employee's
 * current-year leave balances.
 *
 * Design principles:
 *  - Neutral palette — no green/amber/red accent colours on avatar or badges
 *  - Data-dense but uncluttered — numbers are the hero, labels are small
 *  - Enterprise typography — tight tracking, uppercase microlabels
 *  - Status shown as a subtle text label, not a coloured pill
 */
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button }     from '@/components/ui/button';
import { Skeleton }   from '@/components/ui/skeleton';
import { Progress }   from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator }  from '@/components/ui/separator';
import { useLeaveBalances } from '@/hooks/useLeaveBalances';
import { AlertCircle, RefreshCw, CalendarOff, ChevronRight } from 'lucide-react';

// ─── Props ────────────────────────────────────────────────────────────────────

interface LeaveBalanceSheetProps {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  employeeId:   string;
  employeeName: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

/** Status text + colour class — no background pills, just inline text */
function statusLabel(available: number, total: number): { text: string; cls: string } {
  if (total === 0)               return { text: 'No balance',  cls: 'text-muted-foreground' };
  const r = available / total;
  if (r > 0.5)                   return { text: 'Sufficient',  cls: 'text-emerald-600 dark:text-emerald-400' };
  if (r > 0.2)                   return { text: 'Low',         cls: 'text-amber-600 dark:text-amber-400' };
  return                                { text: 'Critical',    cls: 'text-red-600 dark:text-red-400' };
}

/** Progress bar colour — single consistent hue range, no neon */
function barClass(pct: number): string {
  if (pct >= 90) return '[&>div]:bg-red-500';
  if (pct >= 60) return '[&>div]:bg-amber-500';
  return '[&>div]:bg-slate-500 dark:[&>div]:bg-slate-400';
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

const SkeletonCard = () => (
  <div className="border-b py-5 space-y-3">
    <div className="flex items-center justify-between">
      <Skeleton className="h-3.5 w-28" />
      <Skeleton className="h-3 w-16" />
    </div>
    <Skeleton className="h-1.5 w-full rounded-full" />
    <div className="grid grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-2.5 w-12 mx-auto" />
          <Skeleton className="h-5 w-8 mx-auto" />
        </div>
      ))}
    </div>
  </div>
);

// ─── Micro label ─────────────────────────────────────────────────────────────

const MicroLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
    {children}
  </p>
);

// ─── Component ────────────────────────────────────────────────────────────────

export const LeaveBalanceSheet = ({
  open, onOpenChange, employeeId, employeeName,
}: LeaveBalanceSheetProps) => {
  const { balances, isLoading, error, refetch } = useLeaveBalances(
    open ? employeeId : '',
  );

  const year = new Date().getFullYear();

  const totalEntitlement = balances.reduce((s, b) => s + (b.total    ?? 0), 0);
  const totalUsed        = balances.reduce((s, b) => s + (b.used     ?? 0), 0);
  const totalAvailable   = balances.reduce((s, b) => s + (b.available ?? 0), 0);
  const overallPct       = totalEntitlement > 0
    ? Math.round((totalUsed / totalEntitlement) * 100)
    : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[440px] p-0 flex flex-col">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <SheetHeader className="px-6 pt-6 pb-4 shrink-0 border-b">

          {/* Employee identity row */}
          <div className="flex items-center gap-3">
            {/* Monogram — neutral, no colour */}
            <div className="h-9 w-9 rounded-md border bg-muted flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-foreground tracking-tight">
                {getInitials(employeeName || 'NA')}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base font-semibold leading-tight truncate">
                {employeeName || '—'}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Leave balances · {year}
              </SheetDescription>
            </div>
          </div>

          {/* ── Summary row — only when data loaded ── */}
          {!isLoading && !error && balances.length > 0 && (
            <div className="mt-4 space-y-3">
              {/* 3-column numbers */}
              <div className="grid grid-cols-3 divide-x rounded-lg border bg-muted/30">
                {[
                  { label: 'Entitlement', value: totalEntitlement, cls: 'text-foreground'   },
                  { label: 'Used',        value: totalUsed,        cls: 'text-foreground/80' },
                  { label: 'Available',   value: totalAvailable,   cls: 'text-foreground'   },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="flex flex-col items-center py-3 gap-0.5">
                    <MicroLabel>{label}</MicroLabel>
                    <span className={`text-xl font-bold tabular-nums ${cls}`}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Overall usage bar */}
              <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <MicroLabel>Overall usage</MicroLabel>
                  <span className="text-xs tabular-nums text-muted-foreground">{overallPct}%</span>
                </div>
                <Progress
                  value={overallPct}
                  className={`h-1.5 bg-muted ${barClass(overallPct)}`}
                />
              </div>
            </div>
          )}
        </SheetHeader>

        {/* ── Body ──────────────────────────────────────────────────────── */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-2">

            {/* Loading */}
            {isLoading && Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}

            {/* Error */}
            {!isLoading && error && (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground/40" />
                <div>
                  <p className="text-sm font-medium">Could not load balances</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                    {(error as Error)?.message ?? 'An unexpected error occurred'}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 h-8">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry
                </Button>
              </div>
            )}

            {/* Empty */}
            {!isLoading && !error && balances.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <CalendarOff className="h-8 w-8 text-muted-foreground/30" />
                <div>
                  <p className="text-sm font-medium">No leave balances</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                    Balances appear once leaves are applied or manually adjusted.
                  </p>
                </div>
              </div>
            )}

            {/* Balance rows */}
            {!isLoading && !error && balances.map((b, i) => {
              const total     = b.total     ?? 0;
              const used      = b.used      ?? 0;
              const available = b.available ?? 0;
              const opening   = b.opening   ?? 0;
              const accrued   = b.accrued   ?? 0;
              const adjusted  = b.adjusted  ?? 0;
              const pct       = total > 0 ? Math.min(Math.round((used / total) * 100), 100) : 0;
              const st        = statusLabel(available, total);

              return (
                <div key={i} className="border-b last:border-0 py-5">

                  {/* Row 1: name + status text */}
                  <div className="flex items-baseline justify-between gap-3 mb-3">
                    <p className="text-sm font-semibold leading-tight">{b.leave_type}</p>
                    <span className={`text-xs font-medium shrink-0 ${st.cls}`}>
                      {st.text}
                    </span>
                  </div>

                  {/* Row 2: progress + labels */}
                  <div className="space-y-1 mb-3">
                    <Progress value={pct} className={`h-1.5 bg-muted ${barClass(pct)}`} />
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>{used} used</span>
                      <span className="font-medium text-foreground">{available} remaining</span>
                    </div>
                  </div>

                  {/* Row 3: breakdown — inline label + value pairs */}
                  <div className="grid grid-cols-4 border rounded-md divide-x overflow-hidden bg-muted/20">
                    {[
                      { label: 'Opening',  value: opening  },
                      { label: 'Accrued',  value: accrued  },
                      { label: 'Adjusted', value: adjusted },
                      { label: 'Used',     value: used     },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex flex-col items-center py-2 gap-0.5">
                        <MicroLabel>{label}</MicroLabel>
                        <span className="text-sm font-semibold tabular-nums">{value}</span>
                      </div>
                    ))}
                  </div>

                </div>
              );
            })}

          </div>
        </ScrollArea>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        {!isLoading && !error && balances.length > 0 && (
          <>
            <Separator />
            <div className="px-6 py-3 shrink-0 flex items-center justify-between bg-muted/20">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{balances.length}</span>{' '}
                leave {balances.length === 1 ? 'type' : 'types'} · {year}
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{totalAvailable}</span> days available
              </p>
            </div>
          </>
        )}

      </SheetContent>
    </Sheet>
  );
};
