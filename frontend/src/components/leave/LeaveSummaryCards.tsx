/**
 * Reusable leave summary stat cards.
 * Consumes the `summary` object returned by GET /api/leaves/all.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LeaveSummary } from '@/services/leaveService';
import { Clock, CheckCircle2, XCircle, Ban, Undo2, ListChecks } from 'lucide-react';

interface LeaveSummaryCardsProps {
  summary: Partial<LeaveSummary> | null;
  isLoading: boolean;
}

interface StatCard {
  label: string;
  key: keyof LeaveSummary;
  icon: React.ElementType;
  colorClass: string;
  borderClass: string;
}

const STAT_CARDS: StatCard[] = [
  { label: 'Total',              key: 'total',              icon: ListChecks,   colorClass: 'text-foreground',    borderClass: 'border-l-gray-400'   },
  { label: 'Pending',            key: 'pending',            icon: Clock,        colorClass: 'text-yellow-600',    borderClass: 'border-l-yellow-500' },
  { label: 'Approved',           key: 'approved',           icon: CheckCircle2, colorClass: 'text-green-600',     borderClass: 'border-l-green-500'  },
  { label: 'Rejected',           key: 'rejected',           icon: XCircle,      colorClass: 'text-red-600',       borderClass: 'border-l-red-500'    },
  { label: 'Cancelled',          key: 'cancelled',          icon: Ban,          colorClass: 'text-gray-500',      borderClass: 'border-l-gray-400'   },
  { label: 'Withdrawn',          key: 'withdrawn',          icon: Undo2,        colorClass: 'text-orange-600',    borderClass: 'border-l-orange-500' },
  { label: 'Withdrawal Pending', key: 'withdrawal_pending', icon: Undo2,        colorClass: 'text-purple-600',    borderClass: 'border-l-purple-500' },
];

export const LeaveSummaryCards = ({ summary, isLoading }: LeaveSummaryCardsProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2"><Skeleton className="h-4 w-20" /></CardHeader>
            <CardContent><Skeleton className="h-8 w-12" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) return null;

  // Only show cards where value > 0 (except Total which always shows), to keep it clean
  const visibleCards = STAT_CARDS.filter(({ key }) => key === 'total' || (summary[key] ?? 0) > 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {visibleCards.map(({ label, key, icon: Icon, colorClass, borderClass }) => (
        <Card key={key} className={`border-l-4 ${borderClass}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
            <Icon className={`h-4 w-4 ${colorClass}`} />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className={`text-2xl font-bold ${colorClass}`}>{summary[key] ?? 0}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
