/**
 * LeaveBalanceSheet — improved right-side panel showing leave balances.
 *
 * Improvements over v1:
 *  - Gradient header with bold summary numbers
 *  - Each leave type is a self-contained card (not a flat divider row)
 *  - SVG circular usage indicator per card
 *  - Status rendered as a coloured pill badge
 *  - Breakdown grid with accent colour per stat
 *  - Smooth overall usage bar with gradient fill
 */
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button }        from '@/components/ui/button';
import { Skeleton }      from '@/components/ui/skeleton';
import { ScrollArea }    from '@/components/ui/scroll-area';
import { Separator }     from '@/components/ui/separator';
import { ErrorDisplay }  from '@/components/ErrorDisplay';
import { useLeaveBalances } from '@/hooks/useLeaveBalances';
import { CalendarOff } from 'lucide-react';

// ─── Props ───────────────────────────────────────────────────────────────────

interface LeaveBalanceSheetProps {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  employeeId:   string;
  employeeName: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

interface StatusConfig {
  label: string;
  bg:    string;
  text:  string;
  ring:  string; // SVG stroke colour (tailwind arbitrary)
}

function statusConfig(available: number, total: number): StatusConfig {
  if (total === 0)               return { label: 'No Balance', bg: 'bg-slate-100 dark:bg-slate-800',   text: 'text-slate-500',                        ring: '#94a3b8' };
  const r = available / total;
  if (r > 0.5)                   return { label: 'Sufficient', bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400', ring: '#10b981' };
  if (r > 0.2)                   return { label: 'Low',        bg: 'bg-amber-50  dark:bg-amber-950/40',   text: 'text-amber-700  dark:text-amber-400',   ring: '#f59e0b' };
  return                                { label: 'Critical',   bg: 'bg-red-50    dark:bg-red-950/40',     text: 'text-red-700    dark:text-red-400',     ring: '#ef4444' };
}

// ─── Circular usage ring ──────────────────────────────────────────────────────

const UsageRing = ({ pct, colour }: { pct: number; colour: string }) => {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - pct / 100);
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" className="shrink-0 -rotate-90">
      {/* Track */}
      <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor"
        strokeWidth="4" className="text-muted/60" />
      {/* Fill */}
      <circle cx="24" cy="24" r={r} fill="none" stroke={colour}
        strokeWidth="4" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={dash}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      {/* Percentage text — counter-rotate so it reads correctly */}
      <text x="24" y="24" textAnchor="middle" dominantBaseline="central"
        className="rotate-90 origin-center fill-foreground"
        style={{ transform: 'rotate(90deg)', transformOrigin: '24px 24px', fontSize: 9, fontWeight: 700 }}>
        {pct}%
      </text>
    </svg>
  );
};

// ─── Skeleton card ────────────────────────────────────────────────────────────

const SkeletonCard = () => (
  <div className="rounded-xl border bg-card p-4 space-y-3">
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-12 w-12 rounded-full shrink-0" />
    </div>
    <Skeleton className="h-1.5 w-full rounded-full" />
    <div className="grid grid-cols-4 gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-1 text-center">
          <Skeleton className="h-2.5 w-10 mx-auto" />
          <Skeleton className="h-5 w-6 mx-auto" />
        </div>
      ))}
    </div>
  </div>
);

// ─── Mini stat chip ───────────────────────────────────────────────────────────

const StatChip = ({
  label, value, valueClass,
}: {
  label:      string;
  value:      number;
  valueClass?: string;
}) => (
  <div className="flex flex-col items-center gap-0.5 rounded-lg bg-muted/40 py-2.5 px-1">
    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 leading-none">
      {label}
    </span>
    <span className={`text-base font-bold tabular-nums leading-none mt-0.5 ${valueClass ?? 'text-foreground'}`}>
      {value}
    </span>
  </div>
);

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Leave balance card ───────────────────────────────────────────────────────

const BalanceCard = ({ b }: { b: {
  leave_type: string;
  total?:          number;
  used?:           number;
  available?:      number;
  opening?:        number;
  accrued?:        number;
  adjusted?:       number;
  associate_month?: number;
}}) => {
  const total     = b.total     ?? 0;
  const used      = b.used      ?? 0;
  const available = b.available ?? 0;
  const opening   = b.opening   ?? 0;
  const accrued   = b.accrued   ?? 0;
  const adjusted  = b.adjusted  ?? 0;
  const pct       = total > 0 ? Math.min(Math.round((used / total) * 100), 100) : 0;
  const st        = statusConfig(available, total);

  return (
    <div className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden">

      {/* Card top: name + ring */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-tight truncate capitalize">{b.leave_type}</p>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {/* Status pill */}
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.bg} ${st.text}`}>
              {st.label}
            </span>
            {/* Associate month badge */}
            {b.associate_month != null && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary">
                📅 from {MONTH_SHORT[b.associate_month - 1]}
              </span>
            )}
          </div>

          {/* Used / Remaining inline */}
          <p className="text-xs text-muted-foreground mt-2">
            <span className="font-semibold text-foreground">{used}</span> used
            <span className="mx-1.5 opacity-30">·</span>
            <span className="font-semibold text-foreground">{available}</span> remaining
          </p>
        </div>

        {/* Ring */}
        <UsageRing pct={pct} colour={st.ring} />
      </div>

      {/* Thin progress bar */}
      <div className="h-1 w-full bg-muted overflow-hidden">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: st.ring }}
        />
      </div>

      {/* Breakdown chips */}
      <div className="grid grid-cols-4 gap-1.5 px-4 py-3">
        <StatChip label="Opening"  value={opening}  />
        <StatChip label="Accrued"  value={accrued}  />
        <StatChip label="Adjusted" value={adjusted} />
        <StatChip label="Used"     value={used}     valueClass={used > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'} />
      </div>

    </div>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────

export const LeaveBalanceSheet = ({
  open, onOpenChange, employeeId, employeeName,
}: LeaveBalanceSheetProps) => {
  const { balances, isLoading, error, refetch } = useLeaveBalances(
    open ? employeeId : '',
  );

  const year             = new Date().getFullYear();
  const totalEntitlement = balances.reduce((s, b) => s + (b.total     ?? 0), 0);
  const totalUsed        = balances.reduce((s, b) => s + (b.used      ?? 0), 0);
  const totalAvailable   = balances.reduce((s, b) => s + (b.available ?? 0), 0);
  const overallPct       = totalEntitlement > 0
    ? Math.min(Math.round((totalUsed / totalEntitlement) * 100), 100)
    : 0;

  const hasData = !isLoading && !error && balances.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[460px] p-0 flex flex-col gap-0">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <SheetHeader className="px-6 pt-6 pb-5 shrink-0 border-b bg-muted/30">

          {/* Identity row */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg border bg-background shadow-sm flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-foreground tracking-tight">
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

          {/* Summary tiles */}
          {hasData && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-3 rounded-xl border overflow-hidden divide-x bg-background shadow-sm">
                {[
                  { label: 'Entitlement', value: totalEntitlement, cls: '' },
                  { label: 'Used',        value: totalUsed,        cls: totalUsed > 0 ? 'text-amber-600 dark:text-amber-400' : '' },
                  { label: 'Available',   value: totalAvailable,   cls: 'text-emerald-600 dark:text-emerald-400' },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="flex flex-col items-center py-3.5 gap-1">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                      {label}
                    </span>
                    <span className={`text-2xl font-bold tabular-nums leading-none ${cls}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Overall usage bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Overall usage
                  </span>
                  <span className="text-xs tabular-nums font-semibold text-muted-foreground">
                    {overallPct}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${overallPct}%`,
                      background: overallPct >= 90
                        ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                        : overallPct >= 60
                        ? 'linear-gradient(90deg, #10b981, #f59e0b)'
                        : 'linear-gradient(90deg, #6366f1, #10b981)',
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </SheetHeader>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-4 py-4 space-y-3">

            {/* Loading */}
            {isLoading && Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}

            {/* Error */}
            {!isLoading && error && (
              <div className="py-6 px-2">
                <ErrorDisplay
                  error={error}
                  onRetry={() => refetch()}
                />
              </div>
            )}

            {/* Empty */}
            {!isLoading && !error && balances.length === 0 && (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                  <CalendarOff className="h-7 w-7 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="text-sm font-medium">No leave balances</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                    Balances appear once leaves are applied or manually adjusted.
                  </p>
                </div>
              </div>
            )}

            {/* Balance cards */}
            {hasData && balances.map((b, i) => (
              <BalanceCard key={i} b={b} />
            ))}

          </div>
        </ScrollArea>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        {hasData && (
          <>
            <Separator />
            <div className="px-6 py-3.5 shrink-0 flex items-center justify-between bg-muted/20">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{balances.length}</span>{' '}
                leave {balances.length === 1 ? 'type' : 'types'} · {year}
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{totalAvailable}</span>{' '}
                days available
              </p>
            </div>
          </>
        )}

      </SheetContent>
    </Sheet>
  );
};
