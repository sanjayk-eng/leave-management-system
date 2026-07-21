import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, Clock, Loader2, UserRound } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useLeaves, useLeavePolicies } from "@/hooks/useLeaves";
import { useLeaveTiming } from "@/hooks/useLeaveTiming";
import type { Employee } from "@/services/employeeService";
import { toast } from "sonner";

interface ApplyOnBehalfDialogProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export const ApplyOnBehalfDialog = ({ employee, open, onOpenChange }: ApplyOnBehalfDialogProps) => {
  const { applyLeave, isApplying } = useLeaves();
  const { policies, isLoading: policiesLoading } = useLeavePolicies();
  const { leaveTimings, loading: timingsLoading, fetchLeaveTimings } = useLeaveTiming(false);

  const [leaveTypeId, setLeaveTypeId]       = useState("");
  const [startDate,   setStartDate]         = useState<Date>();
  const [endDate,     setEndDate]           = useState<Date>();
  const [earlyDate,   setEarlyDate]         = useState<Date>();
  const [earlyTime,   setEarlyTime]         = useState("");
  const [timingId,    setTimingId]          = useState("3");
  const [reason,      setReason]            = useState("");

  const selectedPolicy  = policies?.find(p => p.id.toString() === leaveTypeId);
  const isEarlyLeave    = selectedPolicy?.is_early ?? false;

  const getISODate = (date: Date) =>
    date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) + "T00:00:00+05:30";

  const resetForm = () => {
    setLeaveTypeId(""); setStartDate(undefined); setEndDate(undefined);
    setEarlyDate(undefined); setEarlyTime(""); setTimingId("3"); setReason("");
  };

  const handleClose = () => { resetForm(); onOpenChange(false); };

  const handleSubmit = () => {
    if (!employee) return;
    if (!leaveTypeId) { toast.error("Please select a leave type"); return; }

    if (isEarlyLeave) {
      if (!earlyDate)  { toast.error("Please select a date");     return; }
      if (!earlyTime)  { toast.error("Please select a time");     return; }
      applyLeave({
        employee_id:   employee.id,
        leave_type_id: parseInt(leaveTypeId),
        start_date:    getISODate(earlyDate),
        end_date:      getISODate(earlyDate),
        reason:        reason.trim() || `Early leave at ${earlyTime}`,
        leave_timing:  earlyTime,
      }, { onSuccess: () => handleClose() });
    } else {
      if (!startDate || !endDate) { toast.error("Please select start and end dates"); return; }
      if (startDate > endDate)    { toast.error("End date must be after start date");  return; }
      applyLeave({
        employee_id:      employee.id,
        leave_type_id:    parseInt(leaveTypeId),
        start_date:       getISODate(startDate),
        end_date:         getISODate(endDate),
        reason:           reason.trim() || undefined,
        leave_timing_id:  timingId ? parseInt(timingId) : undefined,
      }, { onSuccess: () => handleClose() });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden">
        {/* ── Header ── */}
        <div className="px-6 pt-6 pb-5">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight">
              Apply leave on behalf
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Submit a leave request for this employee's approval.
            </DialogDescription>
          </DialogHeader>

          {/* Employee identity */}
          {employee && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2.5">
              <Avatar className="h-9 w-9 shrink-0 border">
                <AvatarFallback className="bg-background text-xs font-medium text-foreground">
                  {getInitials(employee.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-tight">{employee.full_name}</p>
                <p className="truncate text-xs text-muted-foreground">{employee.email}</p>
              </div>
              <Badge variant="secondary" className="shrink-0 font-normal">
                {employee.role}
              </Badge>
            </div>
          )}
        </div>

        <Separator />

        {/* ── Form body ── */}
        <div className="space-y-5 px-6 py-5">
          {/* Leave Type */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Leave type</Label>
            <Select value={leaveTypeId} onValueChange={setLeaveTypeId} disabled={policiesLoading}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                {policies?.map(p => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span>{p.name}</span>
                      <span className="flex items-center gap-1">
                        <Badge variant={p.is_paid ? "default" : "secondary"} className="text-[10px] font-normal">
                          {p.is_paid ? "Paid" : "Unpaid"}
                        </Badge>
                        {p.is_early && (
                          <Badge variant="outline" className="text-[10px] font-normal">Early</Badge>
                        )}
                        {p.is_work_from_home && (
                          <Badge variant="outline" className="text-[10px] font-normal">WFH</Badge>
                        )}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dates */}
          {isEarlyLeave ? (
            <div className="grid grid-cols-2 gap-3">
              {/* Early date */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("h-9 w-full justify-start font-normal", !earlyDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {earlyDate ? format(earlyDate, "dd MMM") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={earlyDate} onSelect={setEarlyDate}
                      initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              {/* Early time */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Time</Label>
                <div className="relative">
                  <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="time"
                    value={earlyTime}
                    onChange={e => setEarlyTime(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {/* Start */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Start date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("h-9 w-full justify-start font-normal", !startDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "dd MMM") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={startDate} onSelect={setStartDate}
                        initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                {/* End */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">End date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("h-9 w-full justify-start font-normal", !endDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "dd MMM") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={endDate} onSelect={setEndDate}
                        initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Timing */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Leave timing</Label>
                <Select value={timingId} onValueChange={setTimingId} disabled={timingsLoading}
                  onOpenChange={o => { if (o && leaveTimings.length === 0) fetchLeaveTimings(); }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select timing" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTimings.map(t => (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span>{t.type === "FIRST_HALF" ? "First half" : t.type === "SECOND_HALF" ? "Second half" : "Full day"}</span>
                          <span className="text-xs text-muted-foreground">({t.timing})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Reason */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Reason <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="Add a brief note for this request"
              className="flex min-h-[72px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
        </div>

        <Separator />

        {/* ── Footer ── */}
        <DialogFooter className="gap-2 px-6 py-4">
          <Button variant="outline" onClick={handleClose} disabled={isApplying} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isApplying} className="flex-1">
            {isApplying
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting</>
              : <><UserRound className="mr-2 h-4 w-4" />Apply leave</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};