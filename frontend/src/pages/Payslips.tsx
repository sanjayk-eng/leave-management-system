import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Download,
  FileText,
  X,
  Calendar,
  Search,
  FileDown,
  TrendingDown,
  Banknote,
  Users,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { usePayslips } from "@/hooks/usePayslips";
import { payrollService } from "@/services/payrollService";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const getMonthName = (month: number) =>
  new Date(2000, month - 1).toLocaleString("en-US", { month: "long" });

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

// ── Stat pill used in the summary row ─────────────────────────────────────────
function StatPill({
  label,
  value,
  sub,
  color = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  color?: "default" | "red" | "green";
}) {
  const valueColor =
    color === "red"
      ? "text-red-600 dark:text-red-400"
      : color === "green"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-foreground";

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className={`text-xl font-bold tabular-nums ${valueColor}`}>
        {value}
      </span>
      {sub && (
        <span className="text-[11px] text-muted-foreground">{sub}</span>
      )}
    </div>
  );
}

// ── Individual payslip card ────────────────────────────────────────────────────
function PayslipCard({
  payslip,
  onDownload,
}: {
  payslip: any;
  onDownload: (id: string) => void;
}) {
  const hasDeduction = (payslip.deduction_amount || 0) > 0;

  return (
    <Card className="overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-base font-semibold leading-tight">
              {getMonthName(payslip.month)} {payslip.year}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-muted-foreground">
                {payslip.full_name}
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-xs text-muted-foreground font-mono">
                #{payslip.payslip_id.slice(0, 8)}
              </span>
            </div>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDownload(payslip.payslip_id)}
          className="gap-1.5 text-xs font-medium"
        >
          <Download className="h-3.5 w-3.5" />
          Download PDF
        </Button>
      </div>

      {/* ── Stat row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-border">
        {/* Basic Salary */}
        <div className="bg-card px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
            Basic Salary
          </p>
          <p className="text-lg font-bold tabular-nums">
            {fmt(payslip.basic_salary || 0)}
          </p>
        </div>

        {/* Working Days */}
        <div className="bg-card px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
            Working Days
          </p>
          <p className="text-lg font-bold tabular-nums">
            {payslip.working_days || 0}
            <span className="text-xs font-normal text-muted-foreground ml-1">
              days
            </span>
          </p>
        </div>

        {/* Paid Leaves */}
        <div className="bg-card px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
            Paid Leaves
          </p>
          <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {payslip.PaidLeaves || 0}
            <span className="text-xs font-normal text-muted-foreground ml-1">
              days
            </span>
          </p>
        </div>

        {/* Unpaid Leaves */}
        <div className="bg-card px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
            Unpaid Leaves
          </p>
          <p
            className={`text-lg font-bold tabular-nums ${
              (payslip.unpaid_leaves || 0) > 0
                ? "text-red-600 dark:text-red-400"
                : "text-muted-foreground"
            }`}
          >
            {payslip.unpaid_leaves || 0}
            <span className="text-xs font-normal text-muted-foreground ml-1">
              days
            </span>
          </p>
        </div>

        {/* Deductions */}
        <div className="bg-card px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
            Deductions
          </p>
          <p
            className={`text-lg font-bold tabular-nums ${
              hasDeduction
                ? "text-red-600 dark:text-red-400"
                : "text-muted-foreground"
            }`}
          >
            {hasDeduction ? `−${fmt(payslip.deduction_amount)}` : "—"}
          </p>
        </div>
      </div>

      {/* ── Net salary footer ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 bg-muted/20 border-t border-border">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Net Salary
          </span>
          <span className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {fmt(payslip.net_salary || 0)}
          </span>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-muted-foreground mb-0.5">Calculation</p>
          <p className="text-xs text-muted-foreground font-mono">
            {payslip.calculation || `${fmt(payslip.basic_salary || 0)} − ${fmt(payslip.deduction_amount || 0)} = ${fmt(payslip.net_salary || 0)}`}
          </p>
        </div>
      </div>

      {/* ── Deduction breakdown (only when applicable) ─────────────────── */}
      {hasDeduction && (
        <div className="px-5 py-2.5 bg-red-50 dark:bg-red-950/20 border-t border-red-100 dark:border-red-900/30">
          <p className="text-xs text-red-600/80 dark:text-red-400/70">
            <span className="font-medium">Deduction formula:</span>{" "}
            {fmt(payslip.basic_salary || 0)} ÷ {payslip.working_days || 0} days
            × {payslip.unpaid_leaves || 0} absent = {fmt(payslip.deduction_amount)}
          </p>
        </div>
      )}
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
const Payslips = () => {
  const { data: payslipsData, isLoading, error } = usePayslips();
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const payslips = useMemo(() => payslipsData?.data || [], [payslipsData]);

  const availableYears = useMemo(
    () => [...new Set(payslips.map((p) => p.year))].sort((a, b) => b - a),
    [payslips]
  );

  const filteredPayslips = useMemo(
    () =>
      payslips.filter((p) => {
        const matchMonth =
          selectedMonth === "all" || p.month === parseInt(selectedMonth);
        const matchYear =
          selectedYear === "all" || p.year === parseInt(selectedYear);
        const q = searchQuery.toLowerCase();
        const matchSearch =
          !q ||
          p.full_name.toLowerCase().includes(q) ||
          getMonthName(p.month).toLowerCase().includes(q) ||
          p.year.toString().includes(q);
        return matchMonth && matchYear && matchSearch;
      }),
    [payslips, selectedMonth, selectedYear, searchQuery]
  );

  const totals = useMemo(
    () => ({
      net: filteredPayslips.reduce((s, p) => s + (p.net_salary || 0), 0),
      deductions: filteredPayslips.reduce(
        (s, p) => s + (p.deduction_amount || 0),
        0
      ),
    }),
    [filteredPayslips]
  );

  const hasFilters =
    selectedMonth !== "all" || selectedYear !== "all" || searchQuery !== "";

  const clearFilters = () => {
    setSelectedMonth("all");
    setSelectedYear("all");
    setSearchQuery("");
  };

  const handleDownload = async (id: string) => {
    try {
      await payrollService.downloadPayslipPdf(id);
      toast.success("Payslip downloaded");
    } catch {
      toast.error("Failed to download payslip");
    }
  };

  const handleDownloadAll = async () => {
    if (!filteredPayslips.length) return toast.error("No payslips to download");
    toast.info(`Downloading ${filteredPayslips.length} payslip(s)…`);
    for (const p of filteredPayslips) {
      try {
        await payrollService.downloadPayslipPdf(p.payslip_id);
      } catch {
        /* continue */
      }
    }
    toast.success("All payslips downloaded");
  };

  // ── Loading state ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-36 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Payslips</h1>
          <p className="text-muted-foreground text-sm">
            View and download your salary slips
          </p>
        </div>
        <Card>
          <CardContent className="py-12">
            <ErrorDisplay error={error} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payslips</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            View and download your salary slips
          </p>
        </div>
        {filteredPayslips.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadAll}
            className="gap-1.5 self-start sm:self-auto"
          >
            <FileDown className="h-3.5 w-3.5" />
            Download All
          </Button>
        )}
      </div>

      {/* ── Summary bar (only when there's data) ────────────────────────── */}
      {payslips.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              icon: <FileText className="h-4 w-4" />,
              label: "Total payslips",
              value: payslips.length.toString(),
            },
            {
              icon: <Users className="h-4 w-4" />,
              label: "Showing",
              value: `${filteredPayslips.length} of ${payslips.length}`,
            },
            {
              icon: <Banknote className="h-4 w-4" />,
              label: "Total net salary",
              value: fmt(totals.net),
              color: "green" as const,
            },
            {
              icon: <TrendingDown className="h-4 w-4" />,
              label: "Total deductions",
              value: totals.deductions ? fmt(totals.deductions) : "—",
              color: totals.deductions ? ("red" as const) : ("default" as const),
            },
          ].map(({ icon, label, value, color = "default" }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
            >
              <div className="text-muted-foreground">{icon}</div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {label}
                </p>
                <p
                  className={`text-base font-bold tabular-nums ${
                    color === "green"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : color === "red"
                      ? "text-red-600 dark:text-red-400"
                      : "text-foreground"
                  }`}
                >
                  {value}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      {payslips.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name, month, or year…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Month */}
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="h-9 w-full sm:w-36 text-sm">
              <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All months</SelectItem>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <SelectItem key={m} value={m.toString()}>
                  {getMonthName(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year */}
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="h-9 w-full sm:w-28 text-sm">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All years</SelectItem>
              {availableYears.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear */}
          {hasFilters && (
            <Button
              size="sm"
              variant="ghost"
              onClick={clearFilters}
              className="h-9 gap-1.5 text-sm text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>
      )}

      {/* ── Payslip list ────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {filteredPayslips.map((payslip) => (
          <PayslipCard
            key={payslip.payslip_id}
            payslip={payslip}
            onDownload={handleDownload}
          />
        ))}

        {/* No results after filter */}
        {filteredPayslips.length === 0 && payslips.length > 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
              <FileText className="h-10 w-10 text-muted-foreground/40" />
              <div className="text-center">
                <p className="font-medium">No payslips match the filters</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Try adjusting your search or filter criteria
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            </CardContent>
          </Card>
        )}

        {/* No payslips at all */}
        {payslips.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-medium">No payslips yet</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Payslips will appear here once payroll is processed
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Payslips;
