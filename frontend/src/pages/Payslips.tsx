import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Download, FileText, Filter, X, TrendingUp, TrendingDown, Calendar, DollarSign, AlertCircle, CheckCircle2, Receipt, Search, FileDown } from "lucide-react";
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

const Payslips = () => {
  const { data: payslipsData, isLoading, error } = usePayslips();
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

 const payslips = useMemo(() => payslipsData?.data || [], [payslipsData]);

  // Get unique years and months from payslips
  const availableYears = useMemo(() => {
    const years = [...new Set(payslips.map(p => p.year))].sort((a, b) => b - a);
    return years;
  }, [payslips]);

  const availableMonths = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => i + 1);
  }, []);

  // Filter payslips based on selected month, year, and search query
  const filteredPayslips = useMemo(() => {
    return payslips.filter(payslip => {
      const matchesMonth = selectedMonth === "all" || payslip.month === parseInt(selectedMonth);
      const matchesYear = selectedYear === "all" || payslip.year === parseInt(selectedYear);
      const matchesSearch = searchQuery === "" || 
        payslip.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getMonthName(payslip.month).toLowerCase().includes(searchQuery.toLowerCase()) ||
        payslip.year.toString().includes(searchQuery);
      return matchesMonth && matchesYear && matchesSearch;
    });
  }, [payslips, selectedMonth, selectedYear, searchQuery]);

  // Calculate totals for filtered payslips
  const filteredTotals = useMemo(() => {
    return {
      grossSalary: filteredPayslips.reduce((sum, p) => sum + (p.basic_salary || 0), 0),
      deductions: filteredPayslips.reduce((sum, p) => sum + (p.deduction_amount || 0), 0),
      netSalary: filteredPayslips.reduce((sum, p) => sum + (p.net_salary || 0), 0),
      paidLeaves: filteredPayslips.reduce((sum, p) => sum + (p.PaidLeaves || 0), 0), // Added
      
      unpaidleaves: filteredPayslips.reduce((sum, p) => sum + (p.unpaid_leaves || 0), 0),
    };
  }, [filteredPayslips]);

  const handleDownload = async (payslipId: string) => {
    try {
      await payrollService.downloadPayslipPdf(payslipId);
      toast.success("Payslip downloaded successfully!");
    } catch (error) {
      toast.error("Failed to download payslip");
    }
  };

  const getMonthName = (month: number) => {
    return new Date(2000, month - 1).toLocaleString('en-US', { month: 'long' });
  };

  const clearFilters = () => {
    setSelectedMonth("all");
    setSelectedYear("all");
    setSearchQuery("");
  };

  const hasActiveFilters = selectedMonth !== "all" || selectedYear !== "all" || searchQuery !== "";

  const handleDownloadAll = async () => {
    if (filteredPayslips.length === 0) {
      toast.error("No payslips to download");
      return;
    }
    
    toast.info(`Downloading ${filteredPayslips.length} payslip(s)...`);
    
    for (const payslip of filteredPayslips) {
      try {
        await payrollService.downloadPayslipPdf(payslip.payslip_id);
      } catch (error) {
        console.error(`Failed to download payslip ${payslip.payslip_id}`);
      }
    }
    
    toast.success("All payslips downloaded!");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Payslips</h1>
          <p className="text-muted-foreground">View and download your salary slips</p>
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
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Payslips
          </h1>
          <p className="text-muted-foreground text-lg">View and download your salary slips</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border-2 border-primary/20">
            <Receipt className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Total Payslips</p>
              <p className="text-lg font-bold">{payslips.length}</p>
            </div>
          </div>
          {filteredPayslips.length > 0 && (
            <Button 
              onClick={handleDownloadAll}
              variant="outline"
              className="gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <FileDown className="h-4 w-4" />
              Download All
            </Button>
          )}
        </div>
      </div>

      {payslips.length > 0 && (
        <>
          {/* Search and Filters */}
          <Card className="border-2">
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-primary" />
                  <CardTitle>Search & Filters</CardTitle>
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-2">
                      {filteredPayslips.length} results
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowFilters(!showFilters)}
                    className="gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    {showFilters ? 'Hide' : 'Show'} Filters
                  </Button>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
                      <X className="h-4 w-4" />
                      Clear All
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, month, or year..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 border-2"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Filter Dropdowns */}
              {showFilters && (
                <div className="grid gap-4 sm:grid-cols-2 animate-in slide-in-from-top-4 duration-300">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      Month
                    </label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="h-11 border-2">
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        {availableMonths.map((month) => (
                          <SelectItem key={month} value={month.toString()}>
                            {getMonthName(month)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      Year
                    </label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="h-11 border-2">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        {availableYears.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Active Filters Display */}
              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg border-2 border-dashed">
                  <span className="text-sm font-semibold text-muted-foreground">Active filters:</span>
                  {searchQuery && (
                    <Badge variant="secondary" className="gap-1">
                      Search: "{searchQuery}"
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-destructive" 
                        onClick={() => setSearchQuery("")}
                      />
                    </Badge>
                  )}
                  {selectedMonth !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      {getMonthName(parseInt(selectedMonth))}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-destructive" 
                        onClick={() => setSelectedMonth("all")}
                      />
                    </Badge>
                  )}
                  {selectedYear !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      {selectedYear}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-destructive" 
                        onClick={() => setSelectedYear("all")}
                      />
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Period Display */}
          {hasActiveFilters && (
            <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-xl">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Viewing Period</p>
                      <p className="text-2xl font-bold">
                        {selectedMonth !== "all" && selectedYear !== "all" 
                          ? `${getMonthName(parseInt(selectedMonth))} ${selectedYear}`
                          : selectedMonth !== "all"
                          ? `${getMonthName(parseInt(selectedMonth))} (All Years)`
                          : selectedYear !== "all"
                          ? `All Months of ${selectedYear}`
                          : "Custom Filter"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Payslips Found</p>
                      <p className="text-3xl font-bold text-primary">{filteredPayslips.length}</p>
                    </div>
                    {filteredPayslips.length > 0 && (
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Avg. Net Salary</p>
                        <p className="text-3xl font-bold text-green-600">
                          ₹{Math.round(filteredTotals.netSalary / filteredPayslips.length).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Enhanced Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-300 hover:scale-105 animate-in slide-in-from-bottom-4" style={{ animationDelay: '100ms' }}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs font-semibold uppercase tracking-wide">
                    {hasActiveFilters ? 'Filtered' : 'Total'} Gross Salary
                  </CardDescription>
                  <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
                    <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                  ₹{filteredTotals.grossSalary.toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3 w-3 text-blue-600" />
                  <p className="text-xs text-muted-foreground font-medium">
                    {selectedMonth !== "all" && selectedYear !== "all"
                      ? `${getMonthName(parseInt(selectedMonth))} ${selectedYear}`
                      : selectedMonth !== "all"
                      ? `${getMonthName(parseInt(selectedMonth))} (All Years)`
                      : selectedYear !== "all"
                      ? `Year ${selectedYear}`
                      : `${filteredPayslips.length} ${filteredPayslips.length === 1 ? 'payslip' : 'payslips'}`}
                  </p>
                </div>
              </CardContent>
            </Card>









            <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-all duration-300 hover:scale-105 animate-in slide-in-from-bottom-4" style={{ animationDelay: '200ms' }}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs font-semibold uppercase tracking-wide">Total Deductions</CardDescription>
                  <div className="p-2 bg-red-100 dark:bg-red-950 rounded-lg">
                    <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <CardTitle className="text-3xl font-bold text-red-600 dark:text-red-400">
                  ₹{filteredTotals.deductions.toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-3 w-3 text-red-600" />
                  <p className="text-xs text-muted-foreground font-medium">
                    {filteredTotals.unpaidleaves} absent {filteredTotals.unpaidleaves === 1 ? 'day' : 'days'} • {filteredPayslips.length} {filteredPayslips.length === 1 ? 'payslip' : 'payslips'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-all duration-300 hover:scale-105 animate-in slide-in-from-bottom-4" style={{ animationDelay: '300ms' }}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs font-semibold uppercase tracking-wide">
                    {hasActiveFilters ? 'Filtered' : 'Total'} Net Salary
                  </CardDescription>
                  <div className="p-2 bg-green-100 dark:bg-green-950 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent">
                  ₹{filteredTotals.netSalary.toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  <p className="text-xs text-muted-foreground font-medium">
                    {selectedMonth !== "all" && selectedYear !== "all"
                      ? `${getMonthName(parseInt(selectedMonth))} ${selectedYear}`
                      : `${filteredPayslips.length} ${filteredPayslips.length === 1 ? 'payslip' : 'payslips'}`}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-all duration-300 hover:scale-105 animate-in slide-in-from-bottom-4" style={{ animationDelay: '400ms' }}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs font-semibold uppercase tracking-wide">
                    Average {hasActiveFilters ? '(Filtered)' : 'Net Salary'}
                  </CardDescription>
                  <div className="p-2 bg-purple-100 dark:bg-purple-950 rounded-lg">
                    <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
                  ₹{filteredPayslips.length > 0 ? Math.round(filteredTotals.netSalary / filteredPayslips.length).toLocaleString() : '0'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3 w-3 text-purple-600" />
                  <p className="text-xs text-muted-foreground font-medium">
                    {hasActiveFilters 
                      ? `Based on ${filteredPayslips.length} ${filteredPayslips.length === 1 ? 'payslip' : 'payslips'}`
                      : 'Per month average'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <div className="grid gap-6">
        {filteredPayslips.map((payslip, index) => (
          <Card 
            key={payslip.payslip_id}
            className="border-2 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] animate-in slide-in-from-bottom-4"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-lg">
                    <FileText className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold">
                      {getMonthName(payslip.month)} {payslip.year}
                    </CardTitle>
                    <CardDescription className="text-base mt-1 flex items-center gap-2">
                      <span className="font-semibold">{payslip.full_name}</span>
                      <Badge variant="outline" className="text-xs">
                        Payslip #{payslip.payslip_id.slice(0, 8)}
                      </Badge>
                    </CardDescription>
                  </div>
                </div>
                <Button 
                  onClick={() => handleDownload(payslip.payslip_id)}
                  size="lg"
                  className="gap-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <Download className="h-5 w-5" />
                  Download PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Basic Salary</p>
                  <p className="text-2xl font-bold">₹{(payslip.basic_salary || 0).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Working Days</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">{payslip.working_days || 0}</p>
                    <Badge className="bg-success text-success-foreground">Days</Badge>
                  </div>
                </div>
                {/* ADDED: Paid Leaves Column */}
  <div className="space-y-1">
    <p className="text-sm text-muted-foreground">Paid Leaves</p>
    <div className="flex items-center gap-2">
      <p className="text-2xl font-bold">{payslip.PaidLeaves || 0}</p>
      <Badge className="bg-green-500/10 text-green-600 border-green-200">Days</Badge>
    </div>
  </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Unpaid Leaves</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">{payslip.unpaid_leaves || 0}</p>
                    {(payslip.unpaid_leaves || 0) > 0 ? (
                      <Badge variant="destructive">Days</Badge>
                    ) : (
                      <Badge className="bg-success text-success-foreground">Days</Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Deductions</p>
                  <p className="text-2xl font-bold text-destructive">
                    -₹{(payslip.deduction_amount || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-6 border-t pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Net Salary</p>
                    <p className="text-3xl font-bold text-success">
                      ₹{(payslip.net_salary || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Calculation</p>
                    <p className="text-sm">{payslip.calculation || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {(payslip.deduction_amount || 0) > 0 && (
                <div className="mt-4 rounded-lg bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">
                    Deduction Formula: Basic Salary ÷ Working Days × Absent Days
                  </p>
                  <p className="text-sm font-medium mt-1">
                    ₹{(payslip.basic_salary || 0).toLocaleString()} ÷ {payslip.working_days || 0} × {payslip.unpaid_leaves || 0} = ₹{(payslip.deduction_amount || 0).toLocaleString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {filteredPayslips.length === 0 && payslips.length > 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No payslips match the filters</p>
              <p className="text-sm text-muted-foreground mb-4">
                Try adjusting your filter criteria
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        )}

        {payslips.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No payslips available</p>
              <p className="text-sm text-muted-foreground">
                Payslips will appear here once payroll is processed
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Payslips;
