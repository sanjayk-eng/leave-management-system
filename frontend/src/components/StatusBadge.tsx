import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { LeaveStatus } from "@/types";
import { CheckCircle2, XCircle } from "lucide-react";

interface StatusBadgeProps {
  status: LeaveStatus | string;
  approvalName?: string;
}

export function StatusBadge({ status, approvalName }: StatusBadgeProps) {
  const normalizedStatus = status.toUpperCase();
  
  const variants: Record<string, string> = {
    PENDING:            "bg-yellow-500 text-white",
    APPROVED:           "bg-success text-success-foreground",
    REJECTED:           "bg-destructive text-destructive-foreground",
    CANCELLED:          "bg-gray-500 text-white",
    WITHDRAWN:          "bg-orange-500 text-white",
    WITHDRAWAL_PENDING: "bg-purple-500 text-white",
  };

  const labels: Record<string, string> = {
    PENDING:            "Pending Approval",
    APPROVED:           "Approved",
    REJECTED:           "Rejected",
    CANCELLED:          "Cancelled",
    WITHDRAWN:          "Withdrawn",
    WITHDRAWAL_PENDING: "Withdrawal Pending",
  };

  const badgeContent = (
    <Badge className={variants[normalizedStatus] || "bg-muted text-muted-foreground"}>
      {labels[normalizedStatus] || status}
    </Badge>
  );

  // Show hover card only for APPROVED / REJECTED with an approver name
  const showHoverCard = approvalName && (
    normalizedStatus === 'APPROVED' ||
    normalizedStatus === 'REJECTED'
  );

  if (!showHoverCard) {
    return badgeContent;
  }

  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <div className="cursor-pointer inline-block">
          {badgeContent}
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-64 p-0 overflow-hidden" side="top" align="center">
        <div className={`p-3 text-white ${
          normalizedStatus === 'APPROVED'
            ? 'bg-gradient-to-r from-green-500 to-green-600'
            : 'bg-gradient-to-r from-red-500 to-red-600'
        }`}>
          <h4 className="text-sm font-bold flex items-center gap-2">
            {normalizedStatus === 'APPROVED' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {normalizedStatus === 'APPROVED' ? 'Approved By' : 'Rejected By'}
          </h4>
        </div>
        <div className={`p-4 ${
          normalizedStatus === 'APPROVED'
            ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40'
            : 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/40 dark:to-rose-950/40'
        }`}>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {approvalName}
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
