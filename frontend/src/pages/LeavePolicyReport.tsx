import { useState, useMemo } from 'react';
import { Loader2, Search, Users, TrendingDown, Wallet, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { SortableTableHead, useTableSort } from '@/components/equipment/shared';
import { MonthYearSelect, StatCard, StatCardsSkeleton, YearSelect } from '@/components/reports/ReportShared';
import { useDebounce } from '@/hooks/useDebounce';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { useAuth } from '@/hooks/useAuth';
import { useLeavePolicyReport } from '@/hooks/useLeavePolicyReport';
import { DownloadPolicyReportButton } from '@/pdf/reportPdf/PolicyReportPdfButton';
import {
  REPORT_CURRENT_MONTH, REPORT_CURRENT_YEAR, REPORT_ROLES,
  roleBadgeClass, monthLabel, fmtLeaveNum, currentWeekBounds,
} from '@/lib/reportConstants';
import type {
  LeavePolicyReportType, LeavePolicyReportParams,
  LeavePolicyReportRecord, LeavePolicyEntry,
} from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

type SortCol = 'employee_name' | 'email' | 'role' | 'total_used' | 'total_balance';

// ── Policy type helpers ───────────────────────────────────────────────────────

function policyTypeBadge(p: LeavePolicyEntry) {
  if (p.is_early)
    return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">Early</Badge>;
  if (p.is_paid)
    return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Paid</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">Unpaid</Badge>;
}

// Usage bar: filled portion = used / (used + balance), capped at 100%
function UsageBar({ used, balance }: { used: number; balance: number }) {
  const total = used + balance;
  const pct   = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const color  = pct >= 90 ? 'bg-red-500' : pct >= 60 ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
    </div>
  );
}

// ── Expanded policy detail panel ──────────────────────────────────────────────

const MONTH_SHORT_RPT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function PolicyDetailPanel({ policies }: { policies: LeavePolicyEntry[] }) {
  const sorted = [...policies].sort((a, b) => a.policy_id - b.policy_id);

  return (
    <div className="bg-muted/30 border-t px-4 py-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        Leave Policy Breakdown
      </p>
      <div className="rounded-md border bg-background overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs w-[200px]">Policy</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs w-[70px]">Type</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground text-xs w-[70px]">Annual</th>
              <th className="text-center px-3 py-2 font-medium text-muted-foreground text-xs w-[70px]">Basis</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground text-xs w-[60px]">Used</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground text-xs w-[70px]">Balance</th>
              <th className="px-3 py-2 font-medium text-muted-foreground text-xs">Usage</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, idx) => {
              const usedFmt = fmtLeaveNum(p.used_days);
              const balFmt  = fmtLeaveNum(p.balance);
              const isLast  = idx === sorted.length - 1;
              return (
                <tr
                  key={p.policy_id}
                  className={`${!isLast ? 'border-b' : ''} hover:bg-muted/20 transition-colors`}
                >
                  {/* Policy name */}
                  <td className="px-3 py-2.5">
                    <span className="font-medium text-sm">{p.policy_name}</span>
                  </td>

                  {/* Type badge */}
                  <td className="px-3 py-2.5">{policyTypeBadge(p)}</td>

                  {/* Annual entitlement */}
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-xs font-semibold text-foreground tabular-nums">
                      {p.default_entitlement}d
                    </span>
                  </td>

                  {/* Associate month — proration basis */}
                  <td className="px-3 py-2.5 text-center">
                    {p.associate_month != null ? (
                      <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        {MONTH_SHORT_RPT[p.associate_month - 1]}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>

                  {/* Used */}
                  <td className="px-3 py-2.5 text-right">
                    {usedFmt
                      ? <span className="font-semibold text-orange-600">{usedFmt}</span>
                      : <span className="text-muted-foreground">—</span>}
                  </td>

                  {/* Balance */}
                  <td className="px-3 py-2.5 text-right">
                    {balFmt
                      ? <span className="font-semibold text-emerald-600">{balFmt}</span>
                      : <span className="text-muted-foreground">—</span>}
                  </td>

                  {/* Usage bar */}
                  <td className="px-3 py-2.5">
                    <UsageBar used={p.used_days} balance={p.balance} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Employee row (collapsed + expanded) ──────────────────────────────────────

interface EmployeeRowProps {
  record: LeavePolicyReportRecord;
  isExpanded: boolean;
  onToggle: () => void;
  colSpan: number;
}

function EmployeeRow({ record, isExpanded, onToggle, colSpan }: EmployeeRowProps) {
  const usedFmt    = fmtLeaveNum(record.total_used);
  const balanceFmt = fmtLeaveNum(record.total_balance);

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/40 transition-colors"
        onClick={onToggle}
      >
        {/* Expand toggle */}
        <TableCell className="w-8 pr-0">
          {isExpanded
            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
            : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </TableCell>

        {/* Employee name */}
        <TableCell className="font-medium">{record.employee_name}</TableCell>

        {/* Email */}
        <TableCell className="text-muted-foreground hidden sm:table-cell text-sm">
          {record.email}
        </TableCell>

        {/* Role */}
        <TableCell>
          <Badge variant="outline" className={roleBadgeClass(record.role)}>
            {record.role}
          </Badge>
        </TableCell>

        {/* Policy count */}
        <TableCell className="text-center">
          <Badge variant="secondary" className="text-xs">
            {record.policies.length}
          </Badge>
        </TableCell>

        {/* Total used */}
        <TableCell className="text-center">
          {usedFmt
            ? <Badge className="bg-orange-100 text-orange-700 border-orange-200">{usedFmt}</Badge>
            : <span className="text-muted-foreground text-sm">—</span>}
        </TableCell>

        {/* Total balance */}
        <TableCell className="text-center">
          {balanceFmt
            ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">{balanceFmt}</Badge>
            : <span className="text-muted-foreground text-sm">—</span>}
        </TableCell>
      </TableRow>

      {/* Expanded detail */}
      {isExpanded && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={colSpan} className="p-0">
            <PolicyDetailPanel policies={record.policies} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────

const weekDefaults = currentWeekBounds();
const COL_SPAN     = 7; // toggle + name + email + role + policies + used + balance

// ── Page ──────────────────────────────────────────────────────────────────────

const LeavePolicyReport = () => {
  const { currentUser } = useAuth();
  const isAdminScope = ['SUPERADMIN', 'ADMIN', 'HR'].includes(currentUser?.role ?? '');
  const isTeamScope  = currentUser?.role === 'MANAGER';

  const [reportType, setReportType] = useState<LeavePolicyReportType>('monthly');

  const [month,        setMonth]        = useState(REPORT_CURRENT_MONTH);
  const [year,         setYear]         = useState(REPORT_CURRENT_YEAR);
  const [yearlyYear,   setYearlyYear]   = useState(REPORT_CURRENT_YEAR);
  const [weekFromMonth,setWeekFromMonth]= useState(weekDefaults.fromMonth);
  const [weekFromYear, setWeekFromYear] = useState(weekDefaults.fromYear);
  const [weekToMonth,  setWeekToMonth]  = useState(weekDefaults.toMonth);
  const [weekToYear,   setWeekToYear]   = useState(weekDefaults.toYear);
  const [fromMonth,    setFromMonth]    = useState(1);
  const [fromYear,     setFromYear]     = useState(REPORT_CURRENT_YEAR);
  const [toMonth,      setToMonth]      = useState(REPORT_CURRENT_MONTH);
  const [toYear,       setToYear]       = useState(REPORT_CURRENT_YEAR);
  const [search,       setSearch]       = useState('');
  const [roleFilter,   setRoleFilter]   = useState('');
  const [expandedIDs,  setExpandedIDs]  = useState<Set<string>>(new Set());

  const debouncedSearch = useDebounce(search, 400);
  const { sortBy, sortDir, handleSort } = useTableSort<SortCol>();

  // Toggle a single row
  const toggleRow = (id: string) =>
    setExpandedIDs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Expand / collapse all
  const allExpanded = expandedIDs.size > 0;
  const toggleAll   = (records: LeavePolicyReportRecord[]) =>
    setExpandedIDs(allExpanded ? new Set() : new Set(records.map((r) => r.employee_id)));

  const params = useMemo<LeavePolicyReportParams>(() => {
    const base = {
      search:     debouncedSearch || undefined,
      role:       roleFilter      || undefined,
      sort_by:    sortBy          || undefined,
      sort_order: sortBy ? sortDir : undefined,
    } as const;

    if (reportType === 'monthly')
      return { report_type: 'monthly', month, year, ...base };
    if (reportType === 'yearly')
      return { report_type: 'yearly', year: yearlyYear, ...base };
    if (reportType === 'weekly')
      return {
        report_type: 'weekly',
        from_month: weekFromMonth, from_year: weekFromYear,
        to_month:   weekToMonth,   to_year:   weekToYear,
        ...base,
      };
    return {
      report_type: 'range',
      from_month: fromMonth, from_year: fromYear,
      to_month:   toMonth,   to_year:   toYear,
      ...base,
    };
  }, [
    reportType, month, year, yearlyYear,
    weekFromMonth, weekFromYear, weekToMonth, weekToYear,
    fromMonth, fromYear, toMonth, toYear,
    debouncedSearch, roleFilter, sortBy, sortDir,
  ]);

  const { records, report, total, isLoading, error, refetch } = useLeavePolicyReport(params);

  const summary = useMemo(() => ({
    totalUsed:    records.reduce((s, r) => s + r.total_used,    0),
    totalBalance: records.reduce((s, r) => s + r.total_balance, 0),
  }), [records]);

  const periodLabel = useMemo(() => {
    if (reportType === 'monthly') return `${monthLabel(month)} ${year}`;
    if (reportType === 'yearly')  return `Year ${yearlyYear}`;
    if (reportType === 'weekly') {
      return weekFromMonth === weekToMonth && weekFromYear === weekToYear
        ? `Week of ${monthLabel(weekFromMonth)} ${weekFromYear}`
        : `${monthLabel(weekFromMonth)} ${weekFromYear} – ${monthLabel(weekToMonth)} ${weekToYear}`;
    }
    return `${monthLabel(fromMonth)} ${fromYear} – ${monthLabel(toMonth)} ${toYear}`;
  }, [reportType, month, year, yearlyYear, weekFromMonth, weekFromYear, weekToMonth, weekToYear, fromMonth, fromYear, toMonth, toYear]);

  const sh = { sortBy: sortBy as string, sortDir, onSort: handleSort };

  return (
    <div className="space-y-6">

      {/* ── Filters ── */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-2 flex-wrap">
            {(['monthly', 'weekly', 'yearly', 'range'] as LeavePolicyReportType[]).map((t) => (
              <Button key={t} size="sm"
                variant={reportType === t ? 'default' : 'outline'}
                onClick={() => setReportType(t)} className="capitalize">
                {t}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {reportType === 'monthly' && (
              <MonthYearSelect month={month} year={year}
                onMonthChange={setMonth} onYearChange={setYear} />
            )}
            {reportType === 'yearly' && (
              <YearSelect value={yearlyYear} onChange={setYearlyYear} />
            )}
            {reportType === 'weekly' && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Week start</span>
                  <MonthYearSelect month={weekFromMonth} year={weekFromYear}
                    onMonthChange={setWeekFromMonth} onYearChange={setWeekFromYear} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Week end</span>
                  <MonthYearSelect month={weekToMonth} year={weekToYear}
                    onMonthChange={setWeekToMonth} onYearChange={setWeekToYear} />
                </div>
              </>
            )}
            {reportType === 'range' && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">From</span>
                  <MonthYearSelect month={fromMonth} year={fromYear}
                    onMonthChange={setFromMonth} onYearChange={setFromYear} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">To</span>
                  <MonthYearSelect month={toMonth} year={toYear}
                    onMonthChange={setToMonth} onYearChange={setToYear} />
                </div>
              </>
            )}
          </div>

          {(isAdminScope || isTeamScope) && (
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name or email…" className="pl-9 pr-9"
                  value={search} onChange={(e) => setSearch(e.target.value)} />
                {search !== debouncedSearch && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {isAdminScope && (
                <Select value={roleFilter || 'all'}
                  onValueChange={(v) => setRoleFilter(v === 'all' ? '' : v)}>
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

      {/* ── Summary stats ── */}
      {isLoading ? (
        <StatCardsSkeleton count={3} cols="grid-cols-2 md:grid-cols-3" />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            title={isAdminScope ? 'Total Employees' : isTeamScope ? 'Team Members' : 'Employees'}
            value={total} sub={periodLabel}
            icon={<Users className="h-4 w-4" />}
          />
          <StatCard title="Total Used" value={summary.totalUsed.toFixed(1)}
            sub="Across all policies" valueClass="text-orange-600"
            icon={<TrendingDown className="h-4 w-4" />} />
          <StatCard title="Total Balance" value={summary.totalBalance.toFixed(1)}
            sub="Remaining across all policies" valueClass="text-emerald-600"
            icon={<Wallet className="h-4 w-4" />} />
        </div>
      )}

      {/* ── Table ── */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <div>
            <CardTitle>Policy Breakdown — {periodLabel}</CardTitle>
            <CardDescription className="mt-1">
              {isLoading
                ? 'Loading…'
                : `${total} employee(s) · click any row to expand policy details`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {report && <DownloadPolicyReportButton data={report} />}
            {!isLoading && records.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => toggleAll(records)}
                className="text-xs text-muted-foreground">
                {allExpanded ? 'Collapse all' : 'Expand all'}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <TableSkeleton rows={5} columns={6} showActions={false} />
            </div>
          ) : error ? (
            <div className="p-6">
              <ErrorDisplay error={error} onRetry={refetch} />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <p className="text-muted-foreground">No leave records found for {periodLabel}.</p>
              <p className="text-sm text-muted-foreground">Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="border-t">
              <Table>
                <TableHeader>
                  <TableRow>
                    {/* Spacer for the chevron column */}
                    <TableHead className="w-8" />
                    <SortableTableHead column="employee_name" label="Employee"      {...sh} />
                    <SortableTableHead column="email"         label="Email"         {...sh} className="hidden sm:table-cell" />
                    <SortableTableHead column="role"          label="Role"          {...sh} />
                    <TableHead className="text-center text-xs text-muted-foreground">Policies</TableHead>
                    <SortableTableHead column="total_used"    label="Total Used"    {...sh} className="text-center" />
                    <SortableTableHead column="total_balance" label="Total Balance" {...sh} className="text-center" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <EmployeeRow
                      key={r.employee_id}
                      record={r}
                      isExpanded={expandedIDs.has(r.employee_id)}
                      onToggle={() => toggleRow(r.employee_id)}
                      colSpan={COL_SPAN}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeavePolicyReport;
