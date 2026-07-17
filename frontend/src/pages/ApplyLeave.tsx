import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLeaves, useLeavePolicies } from "@/hooks/useLeaves";
import { useLeaveBalances } from "@/hooks/useLeaveBalances";
import { useHolidays } from "@/hooks/useHolidays";
import { useAuth } from "@/hooks/useAuth";
import { useLeaveTiming } from "@/hooks/useLeaveTiming";
import { LeaveBalanceSheet } from "@/components/LeaveBalanceSheet";
import { dateInputToISO, formatDate as formatDateUtil } from "@/lib/dateUtils";
import { Calendar, Loader2, Sparkles, CalendarDays, Clock, FileText, TrendingUp, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const ApplyLeave = () => {
  const { currentUser } = useAuth();
  const { applyLeave, isApplying } = useLeaves();
  const { policies: leaveTypes = [], isLoading: isLoadingPolicies } = useLeavePolicies();
  const { balances = [], detailedBalances = [], isLoading: isLoadingBalances } = useLeaveBalances(currentUser?.id || "");
  const { holidays = [], isLoading: isLoadingHolidays } = useHolidays();
  const { leaveTimings, loading: isLoadingTimings, fetchLeaveTimings } = useLeaveTiming(false);
  
  const [selectedLeaveType, setSelectedLeaveType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [earlyLeaveDate, setEarlyLeaveDate] = useState(""); // For early leave single date
  const [earlyLeaveTime, setEarlyLeaveTime] = useState(""); // For early leave time
  const [reason, setReason] = useState("");
  const [selectedLeaveTiming, setSelectedLeaveTiming] = useState("3"); // Default to Full Day timing ID
  const [balanceSheetOpen, setBalanceSheetOpen] = useState(false);

  // Get the selected leave type object
  const selectedLeaveTypeObj = leaveTypes.find(t => t.id.toString() === selectedLeaveType);
  const isEarlyLeave = selectedLeaveTypeObj?.is_early || false;

  // Get upcoming holidays
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const upcomingHolidays = holidays
    .filter(h => {
      const holidayDate = new Date(h.date);
      holidayDate.setHours(0, 0, 0, 0);
      return holidayDate >= today;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  const formatDate = (dateStr: string) => {
    return formatDateUtil(dateStr, { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysUntil = (dateStr: string) => {
    const holidayDate = new Date(dateStr);
    holidayDate.setHours(0, 0, 0, 0);
    const diffTime = holidayDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays < 7) return `In ${diffDays} days`;
    if (diffDays < 30) return `In ${Math.floor(diffDays / 7)} weeks`;
    return `In ${Math.floor(diffDays / 30)} months`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedLeaveType) {
      return;
    }

    // For early leave, use the single date for both start and end
    if (isEarlyLeave) {
      if (!earlyLeaveDate || !earlyLeaveTime) {
        return;
      }

      // Convert date to ISO 8601 format with IST timezone
      const dateISO = dateInputToISO(earlyLeaveDate);

      applyLeave({
        leave_type_id: parseInt(selectedLeaveType),
        start_date: dateISO,
        end_date: dateISO, // Same date for early leave
        reason: reason.trim(),
        leave_timing: earlyLeaveTime, // Send the time string for early leave (e.g., "18:45")
      });
    } else {
      // Normal leave flow
      if (!startDate || !endDate) {
        return;
      }

      // Convert dates to ISO 8601 format with IST timezone
      const startDateISO = dateInputToISO(startDate);
      const endDateISO = dateInputToISO(endDate);

      applyLeave({
        leave_type_id: parseInt(selectedLeaveType),
        start_date: startDateISO,
        end_date: endDateISO,
        reason: reason.trim(),
        leave_timing_id: selectedLeaveTiming ? parseInt(selectedLeaveTiming) : undefined,
      });
    }
    
    // Reset form
    setSelectedLeaveType("");
    setStartDate("");
    setEndDate("");
    setEarlyLeaveDate("");
    setEarlyLeaveTime("");
    setReason("");
    setSelectedLeaveTiming("3"); // Reset to Full Day timing ID
  };

  const selectedBalance = balances && leaveTypes 
    ? balances.find(b => b.leave_type === leaveTypes.find(t => t.id.toString() === selectedLeaveType)?.name)
    : undefined;

  return (
    <div className="space-y-6 pb-8">
      {/* Simple Header */}
      <div className="border-b pb-4">
        <div className="flex items-center gap-3 mb-2">
          <CalendarDays className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold">Apply for Leave</h1>
        </div>
        <p className="text-muted-foreground">Submit your leave request and track your balance</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Application Form */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b">
            <CardTitle className="text-xl flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Leave Application Form
            </CardTitle>
            <CardDescription>Complete the form below to submit your leave request</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Leave Type Selection */}
              <div className="space-y-2">
                <Label htmlFor="leaveType" className="text-sm font-medium">
                  Leave Type *
                </Label>
                <Select value={selectedLeaveType} onValueChange={setSelectedLeaveType} required disabled={isLoadingPolicies}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder={isLoadingPolicies ? "Loading leave types..." : "Select leave type"} />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes && leaveTypes.length > 0 ? (
                      leaveTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          <div className="flex items-center gap-2">
                            <span>{type.name}</span>
                            <Badge variant={type.is_paid ? "default" : "secondary"} className="text-xs">
                              {type.is_paid ? "Paid" : "Unpaid"}
                            </Badge>
                            {type.is_early && (
                              <Badge variant="outline" className="text-xs">
                                Early
                              </Badge>
                            )}
                            {type.is_work_from_home && (
                              <Badge variant="outline" className="text-xs bg-purple-500 text-white border-purple-600">
                                WFH
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>No leave types available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {selectedBalance && (
                  <p className="text-sm text-muted-foreground">
                    Available: <strong>{selectedBalance.available} days</strong> out of {selectedBalance.total}
                  </p>
                )}
              </div>

              {/* Conditional Date Selection based on is_early */}
              {isEarlyLeave ? (
                // Early Leave: Single Date + Time Picker
                <>
                  <div className="space-y-2">
                    <Label htmlFor="earlyLeaveDate" className="text-sm font-medium">
                      Select Date *
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="earlyLeaveDate"
                        type="date"
                        value={earlyLeaveDate}
                        onChange={(e) => setEarlyLeaveDate(e.target.value)}
                        className="h-10 pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="earlyLeaveTime" className="text-sm font-medium">
                      Select Time *
                    </Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="earlyLeaveTime"
                        type="time"
                        value={earlyLeaveTime}
                        onChange={(e) => setEarlyLeaveTime(e.target.value)}
                        className="h-10 pl-10"
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select the time you need to leave early
                    </p>
                  </div>
                </>
              ) : (
                // Normal Leave: Start Date + End Date + Leave Timing
                <>
                  {/* Date Selection */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="startDate" className="text-sm font-medium">
                        Start Date *
                      </Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="startDate"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="h-10 pl-10"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate" className="text-sm font-medium">
                        End Date *
                      </Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="endDate"
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          min={startDate}
                          className="h-10 pl-10"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Leave Timing Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="leaveTiming" className="text-sm font-medium">
                      Leave Timing
                    </Label>
                    <Select 
                      value={selectedLeaveTiming} 
                      onValueChange={setSelectedLeaveTiming} 
                      disabled={isLoadingTimings}
                      onOpenChange={(open) => {
                        if (open && leaveTimings.length === 0) {
                          fetchLeaveTimings();
                        }
                      }}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder={isLoadingTimings ? "Loading timings..." : "Select leave timing"} />
                      </SelectTrigger>
                      <SelectContent>
                        {leaveTimings && leaveTimings.length > 0 ? (
                          leaveTimings.map((timing) => (
                            <SelectItem key={timing.id} value={timing.id.toString()}>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>
                                  {timing.type === 'FIRST_HALF' ? 'First Half' : 
                                   timing.type === 'SECOND_HALF' ? 'Second Half' : 'Full Day'}
                                  {timing.id === 3 && ' (Default)'}
                                </span>
                                <span className="text-muted-foreground text-xs">({timing.timing})</span>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>No timings available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Full Day is selected by default
                    </p>
                  </div>
                </>
              )}

              {/* Reason Field */}
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-sm font-medium">
                  Reason
                </Label>
                <textarea
                  id="reason"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  placeholder="Provide a brief reason for your leave request"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full h-10" 
                disabled={isApplying}
              >
                {isApplying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Calendar className="mr-2 h-4 w-4" />
                    Submit Leave Application
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Leave Balances Card — opens professional sheet */}
          <Card>
            <CardHeader className="border-b pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Leave Balances
                  </CardTitle>
                  <CardDescription>Your available leave days</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 shrink-0"
                  onClick={() => setBalanceSheetOpen(true)}
                  disabled={isLoadingBalances}
                >
                  <Eye className="h-4 w-4" />
                  View
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoadingBalances ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-6 w-12" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Show only the selected leave type balance inline; rest in sheet */}
                  {selectedBalance && (
                    <div className="rounded-lg border border-primary bg-primary/5 px-3 py-2 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-primary">{selectedBalance.leave_type}</p>
                        <p className="text-[11px] text-muted-foreground">{selectedBalance.used} used · {selectedBalance.total} total</p>
                      </div>
                      <span className="text-xl font-bold">{selectedBalance.available}</span>
                    </div>
                  )}
                  {/* Summary row */}
                  <div className="flex items-center justify-between px-1 pt-1">
                    <p className="text-xs text-muted-foreground">
                      {balances.length} leave {balances.length === 1 ? 'type' : 'types'} available
                    </p>
                    <p className="text-xs font-semibold">
                      {balances.reduce((s, b) => s + (b.available ?? 0), 0)} days total
                    </p>
                  </div>
                  {balances.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">No balances found</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Company Holidays Card */}
          <Card>
            <CardHeader className="border-b pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Upcoming Holidays
              </CardTitle>
              <CardDescription>Plan your leaves around company holidays</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 max-h-[300px] overflow-y-auto">
              {isLoadingHolidays ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </div>
              ) : upcomingHolidays.length === 0 ? (
                <div className="text-center py-6">
                  <Calendar className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No upcoming holidays</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingHolidays.map((holiday) => {
                    const daysUntil = getDaysUntil(holiday.date);
                    
                    return (
                      <div
                        key={holiday.id}
                        className="p-3 rounded-lg border"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <h4 className="font-medium text-sm truncate">{holiday.name}</h4>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{formatDate(holiday.date)}</span>
                              <span>•</span>
                              <span>{holiday.day}</span>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs flex-shrink-0">
                            {daysUntil}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Leave Balance Sheet — own balance slide-over */}
      <LeaveBalanceSheet
        open={balanceSheetOpen}
        onOpenChange={setBalanceSheetOpen}
        employeeId={currentUser?.id ?? ''}
        employeeName={currentUser?.email ?? ''}
      />
    </div>
  );
};

export default ApplyLeave;
