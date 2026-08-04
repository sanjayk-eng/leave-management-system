import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { Holiday } from "./calendarUtils";

interface HolidayHoverCardProps {
  holiday: Holiday;
  children: React.ReactNode;
  isMobile?: boolean;
  onMobileClick?: () => void;
}

export const HolidayHoverCard = ({
  holiday,
  children,
  isMobile,
  onMobileClick,
}: HolidayHoverCardProps) => (
  <HoverCard openDelay={isMobile ? 0 : 100}>
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
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <span className="w-1 h-8 rounded-full shrink-0 bg-rose-500" />
        <div>
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-rose-500 shrink-0" />
            Public Holiday
          </p>
          <p className="text-[11px] text-muted-foreground">Company-wide observance</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-2 bg-background">
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
          <span className="text-xs text-muted-foreground font-semibold">Name</span>
          <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
            {holiday.name}
          </span>
        </div>
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
          <span className="text-xs text-muted-foreground font-semibold">Date</span>
          <span className="text-sm font-semibold">
            {new Date(holiday.date).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
          <span className="text-xs text-muted-foreground font-semibold">Day</span>
          <span className="text-sm font-semibold">{holiday.day}</span>
        </div>
        {holiday.type === "OPTIONAL" && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-xs text-muted-foreground font-semibold">Type</span>
            <Badge variant="outline" className="text-xs border-orange-400 text-orange-600">
              Optional
            </Badge>
          </div>
        )}
      </div>
    </HoverCardContent>
  </HoverCard>
);
