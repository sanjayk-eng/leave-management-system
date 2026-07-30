import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Cake, Mail, Clock } from "lucide-react";
import type { UpcomingBirthdayEmployee } from "@/services/settingsService";

interface BirthdayHoverCardProps {
  birthday: UpcomingBirthdayEmployee;
  children: React.ReactNode;
  isMobile?: boolean;
  onMobileClick?: () => void;
}

export const BirthdayHoverCard = ({
  birthday,
  children,
  isMobile,
  onMobileClick,
}: BirthdayHoverCardProps) => {
  const isToday = birthday.status?.toLowerCase() === "today";
  const isPast = birthday.status?.toLowerCase() === "past";

  const statusBadge = isToday
    ? { label: "Today 🎉", cls: "bg-pink-500 text-white" }
    : isPast
    ? { label: "Passed", cls: "bg-muted text-muted-foreground" }
    : {
        label: `In ${birthday.remaining_days} day${birthday.remaining_days !== 1 ? "s" : ""}`,
        cls: "bg-blue-500 text-white",
      };

  const formattedDate = birthday.birth_date
    ? new Date(birthday.birth_date).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      })
    : null;

  const countdown = isToday
    ? `${birthday.remaining_hours}h ${birthday.remaining_minutes}m left today`
    : isPast
    ? `${birthday.remaining_days} day${birthday.remaining_days !== 1 ? "s" : ""} ago`
    : `${birthday.remaining_days}d ${birthday.remaining_hours}h ${birthday.remaining_minutes}m`;

  return (
    <HoverCard openDelay={isMobile ? 0 : 100}>
      <HoverCardTrigger asChild>
        <div onClick={isMobile ? onMobileClick : undefined} className="cursor-pointer">
          {children}
        </div>
      </HoverCardTrigger>
      <HoverCardContent
        className="w-72 p-0 overflow-hidden z-[9999]"
        side="top"
        align="center"
        sideOffset={6}
        collisionPadding={16}
        avoidCollisions
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-1 h-8 rounded-full shrink-0 bg-pink-500" />
            <div className="min-w-0">
              <p className="text-sm font-semibold flex items-center gap-1.5 truncate">
                <Cake className="h-3.5 w-3.5 shrink-0 text-pink-500" />
                {birthday.name}
              </p>
              <p className="text-[11px] text-muted-foreground">Employee Birthday</p>
            </div>
          </div>
          <Badge className={`shrink-0 text-xs border-0 ml-2 ${statusBadge.cls}`}>
            {statusBadge.label}
          </Badge>
        </div>

        {/* Body */}
        <div className="p-4 space-y-2 bg-background">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
            <span className="text-xs text-muted-foreground font-semibold flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" />
              Email
            </span>
            <span className="text-xs font-semibold truncate max-w-[160px] text-right">
              {birthday.email}
            </span>
          </div>

          {formattedDate && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
              <span className="text-xs text-muted-foreground font-semibold flex items-center gap-2">
                <Cake className="h-3.5 w-3.5" />
                Birthday
              </span>
              <span className="text-sm font-semibold">{formattedDate}</span>
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
            <span className="text-xs text-muted-foreground font-semibold flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              {isToday ? "Time left" : isPast ? "Passed" : "Countdown"}
            </span>
            <span className="text-sm font-semibold">{countdown}</span>
          </div>

          {isToday && (
            <p className="text-center text-sm font-medium text-pink-600 dark:text-pink-400 py-1">
              🎉 Happy Birthday! 🎂
            </p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};
