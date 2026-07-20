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
import { CalendarIcon, Clock, Loader2, UserCheck } from "lucide-react";
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
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden">
        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-primary to-primary/80 p-5 text-primary-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Apply Leave on Behalf
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/85 mt-1 text-sm">
              You are submitting a leave request on behalf of this employee.
            </DialogDescription>
          </DialogHeader>

          {/* Employee pill */}
          {employee && (
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/15 px-3 py-2.5">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-white/30 text-white text-xs font-bold">
                  {getInitials(employee.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight truncate">{employee.full_name}</p>
                <p className="text-xs text-primary-foreground/75 truncate">{employee.email}</p>
              </div>
              <Badge className="ml-auto shrink-0 bg-white/20 text-white border-white/30 text-xs">
                {employee.role}
              </Badge>
            </div>
          )}
        </div>

        {/* ── Form body ── */}
        <div className="space-y-4 p-5">
          {/* Leave Type */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Leave Type *</Label>
            <Select value={leaveTypeId} onValueChange={setLeaveTypeId} disabled={policiesLoading}>
              <SelectTrigger className="h-10 border-2">
                <SelectValue placeholder="Select leave type…" />
              </SelectTrigger>
              <SelectContent>
                {policies?.map(p => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.name}</span>
                      <Badge variant={p.is_paid ? "default" : "secondary"} className="text-xs">
                        {p.is_paid ? "Paid" : "Unpaid"}
                      </Badge>
                      {p.is_early         && <Badge variant="outline" className="text-xs bg-blue-500 text-white border-blue-600">Early</Badge>}
                      {p.is_work_from_home && <Badge variant="outline" className="text-xs bg-purple-500 text-white border-purple-600">WFH</Badge>}
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
                <Label className="text-sm font-semibold">Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start h-10 border-2 font-normal", !earlyDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {earlyDate ? format(earlyDate, "dd MMM") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={earlyDate} onSelect={setEarlyDate}
                      disabled={(d) => { const t = new Date(); t.setHours(0,0,0,0); return d < t; }}
                      initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              {/* Early time */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Time *</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input type="time" value={earlyTime} onChange={e => setEarlyTime(e.target.value)}
                    className="flex h-10 w-full rounded-md border-2 border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {/* Start */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Start Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start h-10 border-2 font-normal", !startDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "dd MMM") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={startDate} onSelect={setStartDate}
                        disabled={(d) => { const t = new Date(); t.setHours(0,0,0,0); return d < t; }}
                        initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                {/* End */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">End Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start h-10 border-2 font-normal", !endDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "dd MMM") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={endDate} onSelect={setEndDate}
                        disabled={(d) => { const t = new Date(); t.setHours(0,0,0,0); return d < (startDate ?? t); }}
                        initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Duration preview */}
              {startDate && endDate && (
                <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
                  <span className="text-xs text-muted-foreground font-medium">Duration</span>
                  <Badge variant="default" className="text-xs">
                    {Math.ceil((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1} day(s)
                  </Badge>
                </div>
              )}

              {/* Timing */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Leave Timing</Label>
                <Select value={timingId} onValueChange={setTimingId} disabled={timingsLoading}
                  onOpenChange={o => { if (o && leaveTimings.length === 0) fetchLeaveTimings(); }}>
                  <SelectTrigger className="h-10 border-2">
                    <SelectValue placeholder="Select timing…" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTimings.map(t => (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{t.type === "FIRST_HALF" ? "First Half" : t.type === "SECOND_HALF" ? "Second Half" : "Full Day"}</span>
                          <span className="text-muted-foreground text-xs">({t.timing})</span>
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
            <Label className="text-sm font-semibold">Reason</Label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              placeholder="Brief reason for the leave…"
              className="flex min-h-[72px] w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none" />
          </div>
        </div>

        {/* ── Footer ── */}
        <DialogFooter className="px-5 pb-5 gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isApplying} className="flex-1 border-2">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isApplying} className="flex-1">
            {isApplying
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</>
              : <><UserCheck className="mr-2 h-4 w-4" />Apply Leave</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
