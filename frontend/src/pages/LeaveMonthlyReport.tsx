import { useState, useMemo } from 'react';
import { BarChart3, RefreshCw, Loader2, Search, Users, TrendingUp, TrendingDown, Clock, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHeader, TableRow,
} from '@/components/ui/table';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { SortableTableHead, useTableSort } from '@/components/equipment/shared';
import { useLeaveReport } from '@/hooks/useLeaveMonthlyReport';
import { useDebounce } from '@/hooks/useDebounce';
import type { LeaveReportRecord, LeaveReportType } from '@/types';
import { DownloadReportButton } from '@/pdf/reportPdf/pdfButton';

// ── constants ──────────────────────────────────────────────────────────────────

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;
const YEARS = Array.from({ length: CURRENT_YEAR - 2019 }, (_, i) => 2020 + i);
const ROLES = ['EMPLOYEE', 'INTERN', 'MANAGER', 'HR', 'ADMIN', 'SUPERADMIN'];

type SortCol =
  | 'employee_name' | 'email' | 'role'
  | 'accrued_leaves' | 'used_leaves' | 'balance_leaves'
  | 'paid_leaves' | 'unpaid_leaves' | 'early_leaves';

// ── helpers ────────────────────────────────────────────────────────────────────

const monthLabel = (m: number) => MONTHS.find((x) => x.value === m)?.label ?? '';

const ROLE_BADGE: Record<string, string> = {
  SUPERADMIN: 'bg-purple-100 text-purple-700 border-purple-200',
  ADMIN: 'bg-blue-100 text-blue-700 border-blue-200',
  HR: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  MANAGER: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  INTERN: 'bg-orange-100 text-orange-700 border-orange-200',
  EMPLOYEE: 'bg-gray-100 text-gray-700 border-gray-200',
};

const roleBadgeClass = (role: string) =>
  ROLE_BADGE[role] ?? 'bg-gray-100 text-gray-700 border-gray-200';

const fmtLeave = (n: number) =>
  n === 0 ? null : (n % 1 === 0 ? String(n) : n.toFixed(1));

// ── sub-components ─────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  sub: string;
  valueClass?: string;
  icon: React.ReactNode;
}

const StatCard = ({ title, value, sub, valueClass = '', icon }: StatCardProps) => (
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

const StatCardsSkeleton = () => (
  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
    {Array.from({ length: 5 }).map((_, i) => (
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

// ── MonthYearSelect ────────────────────────────────────────────────────────────

interface MonthYearSelectProps {
  month: number;
  year: number;
  onMonthChange: (v: number) => void;
  onYearChange: (v: number) => void;
}

const MonthYearSelect = ({ month, year, onMonthChange, onYearChange }: MonthYearSelectProps) => (
  <>
    <Select value={String(month)} onValueChange={(v) => onMonthChange(Number(v))}>
      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
      <SelectContent>
        {MONTHS.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
      </SelectContent>
    </Select>
    <Select value={String(year)} onValueChange={(v) => onYearChange(Number(v))}>
      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
      <SelectContent>
        {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
      </SelectContent>
    </Select>
  </>
);

// ── LeaveCell ──────────────────────────────────────────────────────────────────

interface LeaveCellProps {
  value: number;
  badgeClass: string;
}

const LeaveCell = ({ value, badgeClass }: LeaveCellProps) => {
  const label = fmtLeave(value);
  if (!label) return <span className="text-muted-foreground text-sm">—</span>;
  return <Badge className={`${badgeClass} hover:opacity-90`}>{label}</Badge>;
};

// ── ReportRow ──────────────────────────────────────────────────────────────────

const ReportRow = ({ r }: { r: LeaveReportRecord }) => (
  <TableRow>
    <TableCell className="font-medium">{r.employee_name}</TableCell>
    <TableCell className="text-muted-foreground hidden sm:table-cell text-sm">{r.email}</TableCell>
    <TableCell>
      <Badge variant="outline" className={roleBadgeClass(r.role)}>{r.role}</Badge>
    </TableCell>
    <TableCell className="text-center">
      <LeaveCell value={r.accrued_leaves} badgeClass="bg-blue-100 text-blue-700 border-blue-200" />
    </TableCell>
    <TableCell className="text-center">
      <LeaveCell value={r.used_leaves} badgeClass="bg-orange-100 text-orange-700 border-orange-200" />
    </TableCell>
    <TableCell className="text-center">
      <LeaveCell value={r.balance_leaves} badgeClass="bg-emerald-100 text-emerald-700 border-emerald-200" />
    </TableCell>
    <TableCell className="text-center">
      <LeaveCell value={r.paid_leaves} badgeClass="bg-green-100 text-green-700 border-green-200" />
    </TableCell>
    <TableCell className="text-center">
      <LeaveCell value={r.unpaid_leaves} badgeClass="bg-red-100 text-red-700 border-red-200" />
    </TableCell>
    <TableCell className="text-center">
      <LeaveCell value={r.early_leaves} badgeClass="bg-yellow-100 text-yellow-700 border-yellow-200" />
    </TableCell>
  </TableRow>
);

// ── page ───────────────────────────────────────────────────────────────────────

const LeaveMonthlyReport = () => {
  const [reportType, setReportType] = useState<LeaveReportType>('monthly');

  // monthly
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [year, setYear] = useState(CURRENT_YEAR);

  // yearly
  const [yearlyYear, setYearlyYear] = useState(CURRENT_YEAR);

  // range
  const [fromMonth, setFromMonth] = useState(1);
  const [fromYear, setFromYear] = useState(CURRENT_YEAR);
  const [toMonth, setToMonth] = useState(CURRENT_MONTH);
  const [toYear, setToYear] = useState(CURRENT_YEAR);

  // filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  // sorting — reuse shared hook
  const { sortBy, sortDir, handleSort } = useTableSort<SortCol>();

  // build params
  const params = useMemo(() => {
    const base = {
      search: debouncedSearch || undefined,
      role: roleFilter || undefined,
      sort_by: sortBy || undefined,
      sort_order: sortBy ? sortDir : undefined,
    } as const;

    if (reportType === 'monthly')
      return { report_type: 'monthly' as const, month, year, ...base };
    if (reportType === 'yearly')
      return { report_type: 'yearly' as const, year: yearlyYear, ...base };
    return {
      report_type: 'range' as const,
      from_month: fromMonth, from_year: fromYear,
      to_month: toMonth, to_year: toYear,
      ...base,
    };
  }, [reportType, month, year, yearlyYear, fromMonth, fromYear, toMonth, toYear, debouncedSearch, roleFilter, sortBy, sortDir]);

  const { records, report, total, isLoading, error, refetch } = useLeaveReport(params);

  // aggregate summary from all records in current page
  const summary = useMemo(() => ({
    accrued: records.reduce((s, r) => s + r.accrued_leaves, 0),
    used: records.reduce((s, r) => s + r.used_leaves, 0),
    paid: records.reduce((s, r) => s + r.paid_leaves, 0),
    unpaid: records.reduce((s, r) => s + r.unpaid_leaves, 0),
    available: records.reduce((s, r) => s + r.balance_leaves, 0),
  }), [records]);

  const periodLabel = useMemo(() => {
    if (reportType === 'monthly') return `${monthLabel(month)} ${year}`;
    if (reportType === 'yearly') return `Year ${yearlyYear}`;
    return `${monthLabel(fromMonth)} ${fromYear} – ${monthLabel(toMonth)} ${toYear}`;
  }, [reportType, month, year, yearlyYear, fromMonth, fromYear, toMonth, toYear]);

  // Derive the "balance year" from the active filter
  const balanceYear = useMemo(() => {
    if (reportType === 'monthly') return year;
    if (reportType === 'yearly') return yearlyYear;
    return toYear; // for range, use the end year
  }, [reportType, year, yearlyYear, toYear]);

  const sh = { sortBy: sortBy as string, sortDir, onSort: handleSort };
  const balanceLabel = `Balance ${balanceYear}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Leave Report</h1>
            <p className="text-muted-foreground text-sm">Leave summary per employee — {periodLabel}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Report type */}
          <div className="flex gap-2">
            {(['monthly', 'yearly', 'range'] as LeaveReportType[]).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={reportType === t ? 'default' : 'outline'}
                onClick={() => setReportType(t)}
                className="capitalize"
              >
                {t}
              </Button>
            ))}
          </div>

          {/* Date selectors */}
          <div className="flex flex-wrap gap-3">
            {reportType === 'monthly' && (
              <MonthYearSelect
                month={month} year={year}
                onMonthChange={setMonth} onYearChange={setYear}
              />
            )}

            {reportType === 'yearly' && (
              <Select value={String(yearlyYear)} onValueChange={(v) => setYearlyYear(Number(v))}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            {reportType === 'range' && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">From</span>
                  <MonthYearSelect
                    month={fromMonth} year={fromYear}
                    onMonthChange={setFromMonth} onYearChange={setFromYear}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">To</span>
                  <MonthYearSelect
                    month={toMonth} year={toYear}
                    onMonthChange={setToMonth} onYearChange={setToYear}
                  />
                </div>
              </>
            )}
          </div>

          {/* Search + role */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                className="pl-9 pr-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search !== debouncedSearch && (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <Select value={roleFilter || 'all'} onValueChange={(v) => setRoleFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Roles" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {isLoading ? (
        <StatCardsSkeleton />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            title="Total Employees"
            value={total}
            sub={periodLabel}
            icon={<Users className="h-4 w-4" />}
          />
          <StatCard
            title="Total Accrued"
            value={summary.accrued.toFixed(1)}
            sub="Leaves earned this period"
            valueClass="text-blue-600"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <StatCard
            title="Total Used"
            value={summary.used.toFixed(1)}
            sub="Leaves consumed"
            valueClass="text-orange-600"
            icon={<TrendingDown className="h-4 w-4" />}
          />
          <StatCard
            title={`Available Balance ${balanceYear}`}
            value={summary.available.toFixed(1)}
            sub={`Remaining balance for ${balanceYear}`}
            valueClass="text-emerald-600"
            icon={<Wallet className="h-4 w-4" />}
          />
          <StatCard
            title="Total Unpaid"
            value={summary.unpaid.toFixed(1)}
            sub="Unpaid deductions"
            valueClass="text-red-600"
            icon={<Clock className="h-4 w-4" />}
          />
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">

          {/* Left Side */}
          <div>
            <CardTitle>
              Employee Leave Breakdown — {periodLabel}
            </CardTitle>

            <CardDescription className="mt-1">
              {isLoading
                ? "Loading records..."
                : `${total} employee(s) with leave data`}
            </CardDescription>
          </div>

          {/* Right Side */}
          {report && (
            <DownloadReportButton data={report} />
          )}

        </CardHeader>

        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} columns={9} showActions={false} />

          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="text-center">
                <p className="text-lg font-semibold text-destructive">Failed to load report</p>
                <p className="text-sm text-muted-foreground mt-2">{(error as Error).message}</p>
              </div>
              <Button onClick={() => refetch()} variant="outline">
                <Loader2 className="mr-2 h-4 w-4" />Retry
              </Button>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <p className="text-muted-foreground">No leave records found for {periodLabel}.</p>
              <p className="text-sm text-muted-foreground">Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead column="employee_name" label="Employee"  {...sh} />
                    <SortableTableHead column="email" label="Email"     {...sh} className="hidden sm:table-cell" />
                    <SortableTableHead column="role" label="Role"      {...sh} />
                    <SortableTableHead column="accrued_leaves" label="Accrued" {...sh} className="text-center" />
                    <SortableTableHead column="used_leaves" label="Used"     {...sh} className="text-center" />
                    <SortableTableHead column="balance_leaves" label={balanceLabel} {...sh} className="text-center" />
                    <SortableTableHead column="paid_leaves" label="Paid"     {...sh} className="text-center" />
                    <SortableTableHead column="unpaid_leaves" label="Unpaid"   {...sh} className="text-center" />
                    <SortableTableHead column="early_leaves" label="Early"    {...sh} className="text-center" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => <ReportRow key={r.employee_id} r={r} />)}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaveMonthlyReport;
