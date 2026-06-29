import { Clock, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { LeaveTimingSection } from "./LeaveTimingSection";
import { LeaveReasonSection } from "./LeaveReasonSection";
import { Leave, LeaveColors, formatDateDisplay } from "./calendarUtils";

interface LeaveDetailsContentProps {
  leave: Leave;
  colors: LeaveColors;
}

export const LeaveDetailsContent = ({ leave, colors }: LeaveDetailsContentProps) => {
  return (
    <div className="p-4 space-y-3 bg-background">
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
        <span className="text-xs text-muted-foreground font-semibold flex items-center gap-2">
          <Briefcase className="h-3.5 w-3.5" />
          Type:
        </span>
        <span className={cn("text-sm font-bold", colors.textColor)}>{leave.leave_type}</span>
      </div>
      
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
        <span className="text-xs text-muted-foreground font-semibold flex items-center gap-2">
          <Clock className="h-3.5 w-3.5" />
          Duration:
        </span>
        <span className="text-sm font-bold">{leave.days} day{leave.days > 1 ? 's' : ''}</span>
      </div>
      
      <LeaveTimingSection 
        timingType={leave.leave_timing_type}
        timing={leave.leave_timing}
      />
      
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
        <span className="text-xs text-muted-foreground font-semibold">From:</span>
        <span className="text-sm font-bold">{formatDateDisplay(leave.start_date)}</span>
      </div>
      
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
        <span className="text-xs text-muted-foreground font-semibold">To:</span>
        <span className="text-sm font-bold">{formatDateDisplay(leave.end_date)}</span>
      </div>
      
      <LeaveReasonSection reason={leave.reason} />
    </div>
  );
};
