import { Clock } from "lucide-react";
import { LeaveTimingDisplay } from "@/components/LeaveTimingDisplay";

interface LeaveTimingSectionProps {
  timingType?: string;
  timing?: string;
}

export const LeaveTimingSection = ({ timingType, timing }: LeaveTimingSectionProps) => {
  if (!timingType || !timing) return null;

  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
      <span className="text-xs text-muted-foreground font-semibold flex items-center gap-2">
        <Clock className="h-3.5 w-3.5" />
        Timing:
      </span>
      <div className="flex items-center gap-1.5">
        <LeaveTimingDisplay
          timingType={timingType}
          timing={timing}
          variant="badge"
          showIcon={false}
        />
        <span className="text-xs font-semibold text-foreground">{timing}</span>
      </div>
    </div>
  );
};
