import { Skeleton }      from '@/components/ui/skeleton';
import { ErrorDisplay }  from '@/components/ErrorDisplay';
import { Calendar, Clock, Users, ListTree, TrendingUp, ArrowRight } from 'lucide-react';

interface DashboardStatsStripProps {
  totalBalance:        number;
  myLeavesCount:       number;
  myLeavesLoading:     boolean;
  myLeavesError:       Error | null;
  refetchMyLeaves:     () => void;
  pendingCount:        number;
  leaveTypesCount:     number;
  isAdminOrManager:    boolean;
  isLoadingLeaves:     boolean;
  isLoadingBalances:   boolean;
  leavesError:         Error | null;
  balancesError:       Error | null;
  refetchLeaves:       () => void;
  refetchBalances:     () => void;
}

interface StatCardProps {
  icon:       React.ReactNode;
  label:      string;
  value:      React.ReactNode;
  sub:        string;
  accent?:    string;  // tailwind text colour class
  loading?:   boolean;
  error?:     Error | null;
  onRetry?:   () => void;
}

const StatCard = ({ icon, label, value, sub, accent, loading, error, onRetry }: StatCardProps) => (
  <div className="rounded-xl border bg-card shadow-sm px-5 py-4 flex items-start gap-4 hover:shadow-md transition-shadow">
    <div className="mt-0.5 p-2.5 rounded-lg bg-muted/60 shrink-0 text-muted-foreground">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      {loading ? (
        <div className="space-y-1.5 mt-1">
          <Skeleton className="h-7 w-14" />
          <Skeleton className="h-3 w-20" />
        </div>
      ) : error ? (
        <ErrorDisplay error={error} onRetry={onRetry} compact />
      ) : (
        <>
          <p className={`text-2xl font-bold tabular-nums leading-none ${accent ?? ''}`}>{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{sub}</p>
        </>
      )}
    </div>
    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0 mt-1.5" />
  </div>
);

export const DashboardStatsStrip = ({
  totalBalance, myLeavesCount, myLeavesLoading, myLeavesError, refetchMyLeaves,
  pendingCount, leaveTypesCount,
  isAdminOrManager,
  isLoadingLeaves, isLoadingBalances,
  leavesError, balancesError,
  refetchLeaves, refetchBalances,
}: DashboardStatsStripProps) => (
  <div className={`grid grid-cols-1 gap-4 ${isAdminOrManager ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>

    <StatCard
      icon={<Calendar className="h-4 w-4" />}
      label="Leave Balance"
      value={`${totalBalance}`}
      sub="days available this year"
    />

    <StatCard
      icon={<Clock className="h-4 w-4" />}
      label="My Applications"
      value={myLeavesCount}
      sub="leave applications this month"
      loading={myLeavesLoading}
      error={myLeavesError}
      onRetry={refetchMyLeaves}
    />

    {isAdminOrManager && (
      <StatCard
        icon={<Users className="h-4 w-4" />}
        label="Pending Approvals"
        value={pendingCount}
        sub="awaiting your action"
        accent={pendingCount > 0 ? 'text-amber-600 dark:text-amber-400' : undefined}
      />
    )}

    <StatCard
      icon={<ListTree className="h-4 w-4" />}
      label="Leave Types"
      value={leaveTypesCount}
      sub="policy types available"
      loading={isLoadingBalances}
      error={balancesError}
      onRetry={refetchBalances}
    />

  </div>
);
