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

export const HolidayHoverCard = ({ holiday, children, isMobile, onMobileClick }: HolidayHoverCardProps) => {
  return (
    <HoverCard openDelay={isMobile ? 0 : 100}>
      <HoverCardTrigger asChild>
        <div onClick={isMobile ? onMobileClick : undefined}>
          {children}
        </div>
      </HoverCardTrigger>
      <HoverCardContent 
        className="w-80 p-0 overflow-hidden shadow-2xl border-2 border-rose-200 dark:border-rose-800 z-[9999]"
        side="top"
        align="center"
        sideOffset={8}
        collisionPadding={20}
        avoidCollisions={true}
      >
        <div className="p-4 bg-gradient-to-r from-rose-500 via-rose-600 to-rose-700 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-lg font-bold">Public Holiday</h4>
              <p className="text-xs text-rose-100">Company-wide observance</p>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-3 bg-gradient-to-b from-background to-muted/20">
          <div className="flex items-center justify-between p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-800 hover:shadow-md transition-shadow">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Holiday Name</span>
            <span className="text-base font-bold text-rose-600 dark:text-rose-400">{holiday.name}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Date</span>
            <span className="text-sm font-bold">
              {new Date(holiday.date).toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'long', 
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Day of Week</span>
            <span className="text-sm font-bold">{holiday.day}</span>
          </div>
          {holiday.type === 'OPTIONAL' && (
            <div className="p-3 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-xl">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-orange-500 hover:bg-orange-600">
                  Optional Holiday
                </Badge>
                <span className="text-xs text-orange-700 dark:text-orange-300">Employee choice</span>
              </div>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};
