import { MessageSquare } from "lucide-react";

interface LeaveReasonSectionProps {
  reason?: string;
}

export const LeaveReasonSection = ({ reason }: LeaveReasonSectionProps) => {
  if (!reason) return null;

  return (
    <div className="p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
      <span className="text-xs text-muted-foreground font-semibold flex items-center gap-2 mb-1.5">
        <MessageSquare className="h-3.5 w-3.5" />
        Reason:
      </span>
      <p className="text-sm text-foreground leading-relaxed break-words pl-5">
        {reason}
      </p>
    </div>
  );
};
