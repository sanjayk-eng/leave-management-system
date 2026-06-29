import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Leave, getLeaveColor } from "./calendarUtils";
import { LeaveDetailsContent } from "./LeaveDetailsContent";

interface LeaveHoverCardProps {
  leave: Leave;
  children: React.ReactNode;
  isMobile?: boolean;
  onMobileClick?: () => void;
  openDelay?: number;
}

// Map status → badge style
const getStatusBadgeClass = (status: string): string => {
  switch (status.toUpperCase()) {
    case 'APPROVED':           return 'bg-green-600 text-white hover:bg-green-700';
    case 'PENDING':            return 'bg-yellow-500 text-white hover:bg-yellow-600';
    case 'REJECTED':           return 'bg-gray-500 text-white hover:bg-gray-600';
    case 'CANCELLED':          return 'bg-orange-500 text-white hover:bg-orange-600';
    case 'WITHDRAWN':          return 'bg-amber-600 text-white hover:bg-amber-700';
    case 'WITHDRAWAL_PENDING': return 'bg-purple-500 text-white hover:bg-purple-600';
    default:                   return 'bg-gray-400 text-white';
  }
};

// Human-readable status labels
const STATUS_LABELS: Record<string, string> = {
  WITHDRAWAL_PENDING: 'Withdrawal Pending',
};

export const LeaveHoverCard = ({ 
  leave, 
  children, 
  isMobile, 
  onMobileClick,
  openDelay = 200 
}: LeaveHoverCardProps) => {
  const colors = getLeaveColor(leave.leave_type, leave.status);
  const statusUpper = leave.status.toUpperCase();
  const statusLabel = STATUS_LABELS[statusUpper] ?? leave.status;

  return (
    <HoverCard openDelay={isMobile ? 0 : openDelay}>
      <HoverCardTrigger asChild>
        <div onClick={isMobile ? onMobileClick : undefined}>
          {children}
        </div>
      </HoverCardTrigger>
      <HoverCardContent 
        className="w-80 p-0 overflow-hidden z-[9999]"
        side="top"
        align="center"
        sideOffset={8}
        collisionPadding={20}
        avoidCollisions={true}
      >
        <div className={cn("p-4 text-white bg-gradient-to-br", colors.gradient)}>
          <div className="flex items-center justify-between">
            <h4 className="text-base font-bold flex items-center gap-2">
              <User className="h-5 w-5" />
              {leave.employee}
            </h4>
            <Badge className={cn("shadow-md border-0", getStatusBadgeClass(leave.status))}>
              {statusLabel}
            </Badge>
          </div>
          {leave.approval_name && (
            <p className="text-xs mt-1 opacity-80">
              by {leave.approval_name}
            </p>
          )}
        </div>
        <LeaveDetailsContent leave={leave} colors={colors} />
      </HoverCardContent>
    </HoverCard>
  );
};
