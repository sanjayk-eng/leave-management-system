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

export const BirthdayHoverCard = ({ birthday, children, isMobile, onMobileClick }: BirthdayHoverCardProps) => {
  const isToday = birthday.status?.toLowerCase() === "today";
  const isPast = birthday.status?.toLowerCase() === "past";

  const statusBadge = isToday
    ? { label: "Today 🎉", className: "bg-pink-500 hover:bg-pink-600" }
    : isPast
    ? { label: "Passed", className: "bg-muted text-muted-foreground" }
    : { label: `In ${birthday.remaining_days} day${birthday.remaining_days !== 1 ? "s" : ""}`, className: "bg-blue-500 hover:bg-blue-600" };

  const formattedBirthDate = birthday.birth_date
    ? new Date(birthday.birth_date).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <HoverCard openDelay={isMobile ? 0 : 100}>
      <HoverCardTrigger asChild>
        <div onClick={isMobile ? onMobileClick : undefined} className="cursor-pointer">
          {children}
        </div>
      </HoverCardTrigger>
      <HoverCardContent
        className="w-80 p-0 overflow-hidden shadow-2xl border-2 border-pink-200 dark:border-pink-800 z-[9999]"
        side="top"
        align="center"
        sideOffset={8}
        collisionPadding={20}
        avoidCollisions={true}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-pink-400 via-pink-500 to-rose-500 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Cake className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-lg font-bold">{birthday.name}</h4>
              <p className="text-xs text-pink-100">Employee Birthday</p>
            </div>
          </div>
          <Badge className={`text-xs ${statusBadge.className}`}>
            {statusBadge.label}
          </Badge>
        </div>

        {/* Details */}
        <div className="p-4 space-y-3 bg-gradient-to-b from-background to-muted/20">
          {/* Email */}
          <div className="flex items-center justify-between p-3 bg-pink-50 dark:bg-pink-950/30 rounded-xl border border-pink-200 dark:border-pink-800">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Email
            </span>
            <span className="text-sm font-semibold text-pink-700 dark:text-pink-300 truncate max-w-[160px]">
              {birthday.email}
            </span>
          </div>

          {/* Birth date */}
          {formattedBirthDate && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide flex items-center gap-1.5">
                <Cake className="h-3.5 w-3.5" /> Birthday
              </span>
              <span className="text-sm font-bold">{formattedBirthDate}</span>
            </div>
          )}

          {/* Remaining / countdown */}
          {isToday ? (
            <div className="flex items-center justify-between p-3 bg-pink-50 dark:bg-pink-950/30 rounded-xl border border-pink-200 dark:border-pink-800">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Time Left Today
              </span>
              <span className="text-sm font-bold text-pink-600 dark:text-pink-400">
                {birthday.remaining_hours}h {birthday.remaining_minutes}m
              </span>
            </div>
          ) : isPast ? (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Passed
              </span>
              <span className="text-sm font-bold text-muted-foreground">
                {birthday.remaining_days} day{birthday.remaining_days !== 1 ? "s" : ""} ago
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Countdown
              </span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {birthday.remaining_days}d {birthday.remaining_hours}h {birthday.remaining_minutes}m
              </span>
            </div>
          )}

          {/* Today special banner */}
          {isToday && (
            <div className="p-3 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30 border-2 border-pink-300 dark:border-pink-700 rounded-xl text-center">
              <p className="text-sm font-bold text-pink-600 dark:text-pink-400 animate-pulse">
                🎉 Happy Birthday! 🎂
              </p>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};
