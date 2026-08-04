import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Leave, getLeaveColor, getStatusBadgeClass, STATUS_LABELS } from "./calendarUtils";
import { LeaveDetailsContent } from "./LeaveDetailsContent";

interface LeaveHoverCardProps {
  leave: Leave;
  children: React.ReactNode;
  isMobile?: boolean;
  onMobileClick?: () => void;
  openDelay?: number;
}

export const LeaveHoverCard = ({
  leave,
  children,
  isMobile,
  onMobileClick,
  openDelay = 200,
}: LeaveHoverCardProps) => {
  const colors = getLeaveColor(leave.leave_type, leave.status);
  const statusUpper = leave.status.toUpperCase();
  const statusLabel = STATUS_LABELS[statusUpper] ?? leave.status;

  return (
    <HoverCard openDelay={isMobile ? 0 : openDelay}>
      <HoverCardTrigger asChild>
        <div onClick={isMobile ? onMobileClick : undefined}>{children}</div>
      </HoverCardTrigger>
      <HoverCardContent
        className="w-72 p-0 overflow-hidden z-[9999]"
        side="top"
        align="center"
        sideOffset={6}
        collisionPadding={16}
        avoidCollisions
      >
        {/* Header strip — left accent bar using the leave color */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn("w-1 h-8 rounded-full shrink-0", colors.color)} />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {leave.employee}
              </p>
              {leave.approval_name && (
                <p className="text-[11px] text-muted-foreground truncate">
                  Approved by {leave.approval_name}
                </p>
              )}
            </div>
          </div>
          <Badge className={cn("shrink-0 border-0 text-xs ml-2", getStatusBadgeClass(leave.status))}>
            {statusLabel}
          </Badge>
        </div>
        <LeaveDetailsContent leave={leave} colors={colors} />
      </HoverCardContent>
    </HoverCard>
  );
};
