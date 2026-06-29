import { Clock } from "lucide-react";
import { LeaveTimingDisplay } from "@/components/LeaveTimingDisplay";

interface LeaveTimingSectionProps {
  timingType?: string;
  timing?: string;
}

export const LeaveTimingSection = ({ timingType, timing }: LeaveTimingSectionProps) => {
  if (!timingType || !timing) return null;

  return (
    <div className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 rounded-xl border-2 border-indigo-200 dark:border-indigo-800 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-indigo-700 dark:text-indigo-300 font-bold uppercase tracking-wide flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Leave Timing
        </span>
        <LeaveTimingDisplay 
          timingType={timingType}
          timing={timing}
          variant="badge"
          showIcon={false}
        />
      </div>
      <div className="p-2.5 bg-white/60 dark:bg-black/20 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
        <div className="flex items-center justify-center gap-2">
          <span className="text-xl sm:text-2xl">⏰</span>
          <span className="text-lg sm:text-xl font-bold text-indigo-600 dark:text-indigo-400">{timing}</span>
        </div>
      </div>
    </div>
  );
};
