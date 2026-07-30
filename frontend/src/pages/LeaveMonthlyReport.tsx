import { useState, useMemo } from 'react';
import { Loader2, Search, Users, TrendingUp, TrendingDown, Clock, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { SortableTableHead, useTableSort } from '@/components/equipment/shared';
import { useLeaveReport } from '@/hooks/useLeaveMonthlyReport';
import { useDebounce } from '@/hooks/useDebounce';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { useAuth } from '@/hooks/useAuth';
import { DownloadReportButton } from '@/pdf/reportPdf/pdfButton';
import {
  MonthYearSelect, StatCard, StatCardsSkeleton, YearSelect,
} from '@/components/reports/ReportShared';
import {
  REPORT_CURRENT_MONTH, REPORT_CURRENT_YEAR, REPORT_ROLES,
  roleBadgeClass, monthLabel, fmtLeaveNum,
} from '@/lib/reportConstants';
import type { LeaveReportRecord, LeaveReportType } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

type SortCol =
  | 'employee_name' | 'email' | 'role'
  | 'accrued_leaves' | 'used_leaves' | 'balance_leaves'
  | 'paid_leaves' | 'unpaid_leaves' | 'early_leaves';

// ── LeaveCell ─────────────────────────────────────────────────────────────────

interface LeaveCellProps { value: number; badgeClass: string }

const LeaveCell = ({ value, badgeClass }: LeaveCellProps) => {
  const label = fmtLeaveNum(value);
  if (!label) return <span className="text-muted-foreground text-sm">—</span>;
  return <Badge className={`${badgeClass} hover:opacity-90`}>{label}</Badge>;
};

// ── ReportRow ─────────────────────────────────────────────────────────────────

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

// ── Page ──────────────────────────────────────────────────────────────────────

const LeaveMonthlyReport = () => {
  const { currentUser } = useAuth();
  const isAdminScope = ['SUPERADMIN', 'ADMIN', 'HR'].includes(currentUser?.role ?? '');
  const isTeamScope  = currentUser?.role === 'MANAGER';

  const [reportType, setReportType] = useState<LeaveReportType>('monthly');
  const [month,      setMonth]      = useState(REPORT_CURRENT_MONTH);
  const [year,       setYear]       = useState(REPORT_CURRENT_YEAR);
  const [yearlyYear, setYearlyYear] = useState(REPORT_CURRENT_YEAR);
  const [fromMonth,  setFromMonth]  = useState(1);
  const [fromYear,   setFromYear]   = useState(REPORT_CURRENT_YEAR);
  const [toMonth,    setToMonth]    = useState(REPORT_CURRENT_MONTH);
  const [toYear,     setToYear]     = useState(REPORT_CURRENT_YEAR);
  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const debouncedSearch = useDebounce(search, 400);
  const { sortBy, sortDir, handleSort } = useTableSort<SortCol>();

  const params = useMemo(() => {
    const base = {
      search:     debouncedSearch || undefined,
      role:       roleFilter      || undefined,
      sort_by:    sortBy          || undefined,
      sort_order: sortBy ? sortDir : undefined,
    } as const;

    if (reportType === 'monthly') return { report_type: 'monthly' as const, month, year, ...base };
    if (reportType === 'yearly')  return { report_type: 'yearly'  as const, year: yearlyYear, ...base };
    return {
      report_type: 'range' as const,
      from_month: fromMonth, from_year: fromYear,
      to_month:   toMonth,   to_year:   toYear,
      ...base,
    };
  }, [reportType, month, year, yearlyYear, fromMonth, fromYear, toMonth, toYear, debouncedSearch, roleFilter, sortBy, sortDir]);

  const { records, report, total, isLoading, error, refetch } = useLeaveReport(params);

  const summary = useMemo(() => ({
    accrued:   records.reduce((s, r) => s + r.accrued_leaves,  0),
    used:      records.reduce((s, r) => s + r.used_leaves,     0),
    paid:      records.reduce((s, r) => s + r.paid_leaves,     0),
    unpaid:    records.reduce((s, r) => s + r.unpaid_leaves,   0),
    available: records.reduce((s, r) => s + r.balance_leaves,  0),
  }), [records]);

  const periodLabel = useMemo(() => {
    if (reportType === 'monthly') return `${monthLabel(month)} ${year}`;
    if (reportType === 'yearly')  return `Year ${yearlyYear}`;
    return `${monthLabel(fromMonth)} ${fromYear} – ${monthLabel(toMonth)} ${toYear}`;
  }, [reportType, month, year, yearlyYear, fromMonth, fromYear, toMonth, toYear]);

  const balanceYear = reportType === 'monthly' ? year : reportType === 'yearly' ? yearlyYear : toYear;
  const sh = { sortBy: sortBy as string, sortDir, onSort: handleSort };

  return (
    <div className="space-y-6">

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-2">
            {(['monthly', 'yearly', 'range'] as LeaveReportType[]).map((t) => (
              <Button key={t} size="sm" variant={reportType === t ? 'default' : 'outline'}
                onClick={() => setReportType(t)} className="capitalize">
                {t}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            {reportType === 'monthly' && (
              <MonthYearSelect month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} />
            )}
            {reportType === 'yearly' && (
              <YearSelect value={yearlyYear} onChange={setYearlyYear} />
            )}
            {reportType === 'range' && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">From</span>
                  <MonthYearSelect month={fromMonth} year={fromYear} onMonthChange={setFromMonth} onYearChange={setFromYear} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">To</span>
                  <MonthYearSelect month={toMonth} year={toYear} onMonthChange={setToMonth} onYearChange={setToYear} />
                </div>
              </>
            )}
          </div>

          {(isAdminScope || isTeamScope) && (
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
              {isAdminScope && (
                <Select value={roleFilter || 'all'} onValueChange={(v) => setRoleFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="All Roles" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {REPORT_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {isLoading ? (
        <StatCardsSkeleton count={5} cols="grid-cols-2 md:grid-cols-5" />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            title={isAdminScope ? 'Total Employees' : isTeamScope ? 'Team Members' : ''}
            value={total} sub={periodLabel}
            icon={<Users className="h-4 w-4" />}
          />
          <StatCard title="Total Accrued" value={summary.accrued.toFixed(1)}
            sub="Leaves earned this period" valueClass="text-blue-600"
            icon={<TrendingUp className="h-4 w-4" />} />
          <StatCard title="Total Used" value={summary.used.toFixed(1)}
            sub="Leaves consumed" valueClass="text-orange-600"
            icon={<TrendingDown className="h-4 w-4" />} />
          <StatCard title={`Available Balance ${balanceYear}`} value={summary.available.toFixed(1)}
            sub={`Remaining balance for ${balanceYear}`} valueClass="text-emerald-600"
            icon={<Wallet className="h-4 w-4" />} />
          <StatCard title="Total Unpaid" value={summary.unpaid.toFixed(1)}
            sub="Unpaid deductions" valueClass="text-red-600"
            icon={<Clock className="h-4 w-4" />} />
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Employee Leave Breakdown — {periodLabel}</CardTitle>
            <CardDescription className="mt-1">
              {isLoading
                ? 'Loading records...'
                : isAdminScope
                  ? `${total} employee(s) with leave data`
                  : isTeamScope
                    ? `${total} team member(s) with leave data`
                    : `Your leave data for ${periodLabel}`}
            </CardDescription>
          </div>
          {report && <DownloadReportButton data={report} />}
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} columns={9} showActions={false} />
          ) : error ? (
            <ErrorDisplay error={error} onRetry={refetch} className="m-4" />
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
                    <SortableTableHead column="employee_name" label="Employee" {...sh} />
                    <SortableTableHead column="email"         label="Email"    {...sh} className="hidden sm:table-cell" />
                    <SortableTableHead column="role"          label="Role"     {...sh} />
                    <SortableTableHead column="accrued_leaves" label="Accrued" {...sh} className="text-center" />
                    <SortableTableHead column="used_leaves"   label="Used"     {...sh} className="text-center" />
                    <SortableTableHead column="balance_leaves" label={`Balance ${balanceYear}`} {...sh} className="text-center" />
                    <SortableTableHead column="paid_leaves"   label="Paid"     {...sh} className="text-center" />
                    <SortableTableHead column="unpaid_leaves" label="Unpaid"   {...sh} className="text-center" />
                    <SortableTableHead column="early_leaves"  label="Early"    {...sh} className="text-center" />
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
