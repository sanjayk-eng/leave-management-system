import { Clock, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { LeaveTimingSection } from "./LeaveTimingSection";
import { LeaveReasonSection } from "./LeaveReasonSection";
import { Leave, LeaveColors, formatDateDisplay } from "./calendarUtils";
import type { ReactNode } from "react";

interface LeaveDetailsContentProps {
  leave: Leave;
  colors: LeaveColors;
}

// ── small reusable row ────────────────────────────────────────────────────────
const DetailRow = ({
  label,
  value,
  icon,
  valueClass,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  valueClass?: string;
}) => (
  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
    <span className="text-xs text-muted-foreground font-semibold flex items-center gap-2">
      {icon}
      {label}
    </span>
    <span className={cn("text-sm font-semibold", valueClass)}>{value}</span>
  </div>
);

// ── main component ────────────────────────────────────────────────────────────
export const LeaveDetailsContent = ({ leave, colors }: LeaveDetailsContentProps) => (
  <div className="p-4 space-y-2 bg-background">
    <DetailRow
      label="Type"
      value={leave.leave_type}
      icon={<Briefcase className="h-3.5 w-3.5" />}
      valueClass={colors.textColor}
    />
    <DetailRow
      label="Duration"
      value={`${leave.days} day${leave.days > 1 ? "s" : ""}`}
      icon={<Clock className="h-3.5 w-3.5" />}
    />
    <LeaveTimingSection
      timingType={leave.leave_timing_type}
      timing={leave.leave_timing}
    />
    <DetailRow label="From" value={formatDateDisplay(leave.start_date)} />
    <DetailRow label="To" value={formatDateDisplay(leave.end_date)} />
    <LeaveReasonSection reason={leave.reason} />
  </div>
);
