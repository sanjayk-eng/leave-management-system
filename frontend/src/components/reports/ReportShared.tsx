/**
 * Shared UI primitives reused by all leave report pages.
 * Keeping them here prevents copy-paste drift between LeaveMonthlyReport
 * and LeavePolicyReport (and any future report pages).
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// MonthYearSelect / YearSelect / MonthSelect live in the canonical location.
// Re-export from here so existing report imports don't need to change.
export {
  MonthYearSelect,
  YearSelect,
  MonthSelect,
} from '@/components/ui/MonthYearSelect';
export type {
  MonthYearSelectProps,
  YearSelectProps,
  MonthSelectProps,
} from '@/components/ui/MonthYearSelect';

// ── StatCard ──────────────────────────────────────────────────────────────────

export interface StatCardProps {
  title: string;
  value: string | number;
  sub: string;
  valueClass?: string;
  icon: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  title, value, sub, valueClass = '', icon,
}) => (
  <Card>
    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className="text-muted-foreground">{icon}</div>
    </CardHeader>
    <CardContent>
      <div className={`text-2xl font-bold ${valueClass}`}>{value}</div>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </CardContent>
  </Card>
);

// ── StatCardsSkeleton ─────────────────────────────────────────────────────────

interface StatCardsSkeletonProps {
  count: number;
  cols?: string; // tailwind grid-cols class, e.g. "grid-cols-2 md:grid-cols-5"
}

export const StatCardsSkeleton: React.FC<StatCardsSkeletonProps> = ({
  count, cols = 'grid-cols-2 md:grid-cols-3',
}) => (
  <div className={`grid ${cols} gap-4`}>
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i}>
        <CardHeader className="pb-2">
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-8 w-16 bg-muted rounded animate-pulse mb-1" />
          <div className="h-3 w-24 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    ))}
  </div>
);


