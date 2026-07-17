import { Button }      from '@/components/ui/button';
import { Skeleton }    from '@/components/ui/skeleton';
import { Progress }    from '@/components/ui/progress';
import { Separator }   from '@/components/ui/separator';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { Eye }         from 'lucide-react';

interface LeaveBalanceItem {
  leave_type: string;
  available:  number;
  total?:     number;
  used?:      number;
}

interface DashboardLeaveBalanceCardProps {
  balances:       LeaveBalanceItem[];
  totalBalance:   number;
  isLoading:      boolean;
  error:          Error | null;
  onRetry:        () => void;
  onViewBalances: () => void;
}

const MicroLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
    {children}
  </p>
);

function barClass(pct: number): string {
  if (pct >= 90) return '[&>div]:bg-red-500';
  if (pct >= 60) return '[&>div]:bg-amber-500';
  return '[&>div]:bg-slate-500 dark:[&>div]:bg-slate-400';
}

export const DashboardLeaveBalanceCard = ({
  balances, totalBalance, isLoading, error, onRetry, onViewBalances,
}: DashboardLeaveBalanceCardProps) => {
  const totalEntitlement = balances.reduce((s, b) => s + (b.total ?? 0), 0);
  const totalUsed        = balances.reduce((s, b) => s + (b.used  ?? 0), 0);
  const overallPct       = totalEntitlement > 0
    ? Math.round((totalUsed / totalEntitlement) * 100)
    : 0;

  return (
    <div className="rounded-xl border bg-card shadow-sm flex flex-col">

      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Leave Balances</p>
          <p className="text-xs text-muted-foreground mt-0.5">Your available days this year</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 h-8 text-xs text-muted-foreground hover:text-foreground"
          onClick={onViewBalances}
          disabled={isLoading}
        >
          <Eye className="h-3.5 w-3.5" />
          Details
        </Button>
      </div>

      {/* Body */}
      <div className="px-5 py-4 flex-1">
        {isLoading ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-2.5 w-14 mx-auto" />
                  <Skeleton className="h-7 w-10 mx-auto" />
                </div>
              ))}
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        ) : error ? (
          <ErrorDisplay error={error} onRetry={onRetry} compact />
        ) : (
          <>
            {/* Entitlement / Used / Available */}
            <div className="grid grid-cols-3 divide-x text-center mb-4">
              <div className="pr-3">
                <MicroLabel>Entitlement</MicroLabel>
                <p className="text-2xl font-bold tabular-nums mt-1">{totalEntitlement}</p>
              </div>
              <div className="px-3">
                <MicroLabel>Used</MicroLabel>
                <p className="text-2xl font-bold tabular-nums mt-1">{totalUsed}</p>
              </div>
              <div className="pl-3">
                <MicroLabel>Available</MicroLabel>
                <p className="text-2xl font-bold tabular-nums mt-1">{totalBalance}</p>
              </div>
            </div>

            {/* Overall bar */}
            <div className="space-y-1.5 mb-4">
              <Progress value={overallPct} className={`h-1.5 bg-muted ${barClass(overallPct)}`} />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{overallPct}% used</span>
                <span>{balances.length} leave {balances.length === 1 ? 'type' : 'types'}</span>
              </div>
            </div>

            {/* Per-type mini rows */}
            {balances.length > 0 && (
              <>
                <Separator className="mb-3" />
                <div className="space-y-2.5">
                  {balances.slice(0, 3).map((b, i) => {
                    const pct = (b.total ?? 0) > 0
                      ? Math.round(((b.used ?? 0) / (b.total ?? 1)) * 100)
                      : 0;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <p className="text-xs text-muted-foreground truncate w-24 shrink-0 leading-none">
                          {b.leave_type}
                        </p>
                        <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pct >= 90 ? 'bg-red-500' : pct >= 60 ? 'bg-amber-500' : 'bg-slate-400 dark:bg-slate-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs tabular-nums text-muted-foreground shrink-0 w-12 text-right">
                          {b.available} left
                        </p>
                      </div>
                    );
                  })}
                  {balances.length > 3 && (
                    <p className="text-[11px] text-muted-foreground text-right">
                      +{balances.length - 3} more · click Details
                    </p>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
