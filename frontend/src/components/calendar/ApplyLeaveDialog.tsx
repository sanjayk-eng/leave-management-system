import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useLeaves, useLeavePolicies } from "@/hooks/useLeaves";
import { toast } from "sonner";

interface Holiday {
  id: string;
  name: string;
  date: string;
  day: string;
  type: string;
  created_at: string;
  updated_at: string;
}

interface ApplyLeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holidays?: Holiday[];
}

export const ApplyLeaveDialog = ({ open, onOpenChange, holidays = [] }: ApplyLeaveDialogProps) => {
  const { policies, isLoading: policiesLoading } = useLeavePolicies();
  const { applyLeave, isApplying } = useLeaves();
  
  const [leaveTypeId, setLeaveTypeId] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [earlyLeaveDate, setEarlyLeaveDate] = useState<Date>(); // For early leave single date
  const [earlyLeaveTime, setEarlyLeaveTime] = useState<string>(""); // For early leave time
  const [reason, setReason] = useState("");

  // Get the selected leave type object
  const selectedLeaveTypeObj = policies?.find(p => p.id.toString() === leaveTypeId);
  const isEarlyLeave = selectedLeaveTypeObj?.is_early || false;

  // Helper to get date string in IST
  const getDateStringIST = (date: Date): string => {
    return date.toLocaleDateString('en-CA', { 
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Helper to check if a date is a holiday
  const isHoliday = (date: Date) => {
    const dateStr = getDateStringIST(date);
    return holidays.some(h => {
      const holidayDateStr = h.date.split('T')[0];
      return holidayDateStr === dateStr;
    });
  };

  // Helper to get holiday name for a date
  const getHolidayName = (date: Date) => {
    const dateStr = getDateStringIST(date);
    const holiday = holidays.find(h => {
      const holidayDateStr = h.date.split('T')[0];
      return holidayDateStr === dateStr;
    });
    return holiday?.name;
  };

  const handleSubmit = () => {
    if (!leaveTypeId) {
      toast.error("Please select a leave type");
      return;
    }
    
    if (isEarlyLeave) {
      // Early leave validation
      if (!earlyLeaveDate) {
        toast.error("Please select a date");
        return;
      }
      
      if (!earlyLeaveTime) {
        toast.error("Please select a time");
        return;
      }

      // Check if the date is a holiday
      if (isHoliday(earlyLeaveDate)) {
        toast.error(`Cannot apply leave on ${getHolidayName(earlyLeaveDate)} (${format(earlyLeaveDate, "PPP")})`);
        return;
      }

      // Convert date to ISO 8601 format with IST timezone
      const dateISO = getDateStringIST(earlyLeaveDate) + 'T00:00:00+05:30';

      applyLeave({
        leave_type_id: parseInt(leaveTypeId),
        start_date: dateISO,
        end_date: dateISO, // Same date for early leave
        reason: reason.trim() || `Early leave at ${earlyLeaveTime}`,
        leave_timing: earlyLeaveTime, // Send the time string for early leave (e.g., "18:45")
      }, {
        onSuccess: () => {
          // Reset form
          setLeaveTypeId("");
          setEarlyLeaveDate(undefined);
          setEarlyLeaveTime("");
          setReason("");
          onOpenChange(false);
        }
      });
    } else {
      // Normal leave validation
      if (!startDate || !endDate) {
        toast.error("Please select start and end dates");
        return;
      }
      
      if (startDate > endDate) {
        toast.error("End date must be after start date");
        return;
      }

      // Check if any date in the range is a holiday
      const dateRange: Date[] = [];
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        dateRange.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const holidayInRange = dateRange.find(date => isHoliday(date));
      if (holidayInRange) {
        toast.error(`Cannot apply leave on ${getHolidayName(holidayInRange)} (${format(holidayInRange, "PPP")})`);
        return;
      }

      // Convert dates to ISO 8601 format with IST timezone
      const startDateISO = getDateStringIST(startDate) + 'T00:00:00+05:30';
      const endDateISO = getDateStringIST(endDate) + 'T00:00:00+05:30';

      applyLeave({
        leave_type_id: parseInt(leaveTypeId),
        start_date: startDateISO,
        end_date: endDateISO,
        reason: reason.trim() || undefined,
      }, {
        onSuccess: () => {
          // Reset form
          setLeaveTypeId("");
          setStartDate(undefined);
          setEndDate(undefined);
          setReason("");
          onOpenChange(false);
        }
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <CalendarIcon className="h-6 w-6" />
              Apply for Leave
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/90 mt-2">
              Submit your leave request. Your manager will be notified for approval.
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <div className="space-y-5 p-6">
          {/* Leave Type */}
          <div className="space-y-2 animate-in fade-in-50 slide-in-from-bottom-4 duration-300">
            <Label htmlFor="leave-type" className="text-sm font-semibold">Leave Type *</Label>
            <Select value={leaveTypeId} onValueChange={setLeaveTypeId} disabled={policiesLoading}>
              <SelectTrigger id="leave-type" className="h-11 border-2 hover:border-primary/50 transition-colors">
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                {policies && Array.isArray(policies) && policies.map(policy => (
                  <SelectItem key={policy.id} value={policy.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{policy.name}</span>
                      <Badge variant={policy.is_paid ? "default" : "secondary"} className="text-xs">
                        {policy.is_paid ? 'Paid' : 'Unpaid'}
                      </Badge>
                      {policy.is_early && (
                        <Badge variant="outline" className="text-xs bg-blue-500 text-white border-blue-600">
                          Early
                        </Badge>
                      )}
                      {policy.is_work_from_home && (
                        <Badge variant="outline" className="text-xs bg-purple-500 text-white border-purple-600">
                          WFH
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Conditional Date/Time Selection based on is_early */}
          {isEarlyLeave ? (
            // Early Leave: Single Date + Time Input
            <>
              <div className="space-y-2 animate-in fade-in-50 slide-in-from-bottom-4 duration-300" style={{ animationDelay: '100ms' }}>
                <Label className="text-sm font-semibold">Select Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-11 border-2 hover:border-primary/50 transition-colors",
                        !earlyLeaveDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {earlyLeaveDate ? format(earlyLeaveDate, "PPP") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={earlyLeaveDate}
                      onSelect={setEarlyLeaveDate}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today || isHoliday(date);
                      }}
                      modifiers={{
                        holiday: (date) => isHoliday(date)
                      }}
                      modifiersClassNames={{
                        holiday: "bg-rose-100 text-rose-900 dark:bg-rose-900/30 dark:text-rose-300 line-through"
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2 animate-in fade-in-50 slide-in-from-bottom-4 duration-300" style={{ animationDelay: '200ms' }}>
                <Label htmlFor="early-leave-time" className="text-sm font-semibold">Select Time *</Label>
                <input
                  id="early-leave-time"
                  type="time"
                  value={earlyLeaveTime}
                  onChange={(e) => setEarlyLeaveTime(e.target.value)}
                  className="flex h-11 w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                />
                <p className="text-xs text-muted-foreground">Select the time you need to leave early (e.g., 5:00 PM)</p>
              </div>
            </>
          ) : (
            // Normal Leave: Start Date + End Date
            <div className="grid grid-cols-2 gap-4">
            {/* Start Date */}
            <div className="space-y-2 animate-in fade-in-50 slide-in-from-bottom-4 duration-300" style={{ animationDelay: '100ms' }}>
              <Label className="text-sm font-semibold">Start Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-11 border-2 hover:border-primary/50 transition-colors",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today || isHoliday(date);
                    }}
                    modifiers={{
                      holiday: (date) => isHoliday(date)
                    }}
                    modifiersClassNames={{
                      holiday: "bg-rose-100 text-rose-900 dark:bg-rose-900/30 dark:text-rose-300 line-through"
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            {/* End Date */}
            <div className="space-y-2 animate-in fade-in-50 slide-in-from-bottom-4 duration-300" style={{ animationDelay: '200ms' }}>
              <Label className="text-sm font-semibold">End Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-11 border-2 hover:border-primary/50 transition-colors",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today || (startDate ? date < startDate : false) || isHoliday(date);
                    }}
                    modifiers={{
                      holiday: (date) => isHoliday(date)
                    }}
                    modifiersClassNames={{
                      holiday: "bg-rose-100 text-rose-900 dark:bg-rose-900/30 dark:text-rose-300 line-through"
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          )}
          
          {/* Duration Display - Only for normal leave */}
          {!isEarlyLeave && startDate && endDate && (
            <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/20 rounded-xl animate-in fade-in-50 zoom-in-95 duration-300">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">Total Duration:</span>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-base px-4 py-1.5 shadow-lg">
                    {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1} day(s)
                  </Badge>
                </div>
              </div>
            </div>
          )}
          
          {/* Reason */}
          <div className="space-y-2 animate-in fade-in-50 slide-in-from-bottom-4 duration-300" style={{ animationDelay: '300ms' }}>
            <Label htmlFor="reason" className="text-sm font-semibold">Reason</Label>
            <textarea
              id="reason"
              placeholder="Enter reason for leave"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="flex min-h-[80px] w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:border-primary/50 transition-colors resize-none"
            />
          </div>
        </div>
        
        <DialogFooter className="p-6 pt-0 gap-3">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={isApplying}
            className="flex-1 h-11 border-2 hover:bg-muted transition-all"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isApplying}
            className="flex-1 h-11 shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            {isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
