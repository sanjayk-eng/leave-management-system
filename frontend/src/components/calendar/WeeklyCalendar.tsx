import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Calendar, User, Clock, Briefcase } from "lucide-react";
import {
  Leave,
  Holiday,
  getLeaveColor,
  getLeavesForDate,
  getHolidayForDate,
  getBirthdaysForDate,
} from "./shared/calendarUtils";
import { LeaveHoverCard } from "./shared/LeaveHoverCard";
import { HolidayHoverCard } from "./shared/HolidayHoverCard";
import { BirthdayHoverCard } from "./shared/BirthdayHoverCard";
import { calendarAnimations } from "./shared/calendarAnimations";
import type { UpcomingBirthdayEmployee } from "@/services/settingsService";

// Compact label for leave timing type
const timingLabel = (type: string) =>
  type === "FIRST_HALF" ? "AM" : type === "SECOND_HALF" ? "PM" : type === "EARLY" ? "EL" : "FD";

interface WeeklyCalendarProps {
  currentDate: Date;
  leaves: Leave[];
  holidays: Holiday[];
  birthdays?: UpcomingBirthdayEmployee[];
}

export const WeeklyCalendar = ({
  currentDate,
  leaves,
  holidays,
  birthdays = [],
}: WeeklyCalendarProps) => {
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2 lg:gap-3">
        {weekDays.map((date, index) => {
          const dayLeaves = getLeavesForDate(date, leaves);
          const holiday = getHolidayForDate(date, holidays);
          const dayBirthdays = getBirthdaysForDate(date, birthdays);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const isToday = date.toDateString() === today.toDateString();

          return (
            <div
              key={index}
              className={cn(
                "border rounded-lg p-3 min-h-48 lg:min-h-64 flex flex-col gap-2",
                "transition-shadow duration-200 hover:shadow-md",
                isWeekend && "bg-muted/20",
                holiday && "bg-rose-50/50 dark:bg-rose-950/15 border-rose-200 dark:border-rose-800",
                isToday &&
                  "outline outline-2 outline-primary outline-offset-[-2px]",
                !isWeekend && !holiday && "bg-background"
              )}
              style={{
                animationDelay: `${index * 40}ms`,
                animation: "slideInUp 0.4s ease-out forwards",
              }}
            >
              {/* Day header */}
              <div className="text-center pb-2 border-b">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {date.toLocaleDateString("en-US", { weekday: "long" })}
                </p>
                <p
                  className={cn(
                    "text-2xl sm:text-3xl font-bold leading-none my-1",
                    isToday && "text-primary",
                    holiday && "text-rose-600 dark:text-rose-400",
                    isWeekend && !isToday && "text-muted-foreground"
                  )}
                >
                  {date.getDate()}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase font-medium">
                  {date.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </p>
                {dayLeaves.length > 0 && (
                  <Badge variant="secondary" className="mt-1.5 text-[10px] h-4">
                    {dayLeaves.length} {dayLeaves.length === 1 ? "leave" : "leaves"}
                  </Badge>
                )}
              </div>

              {/* Holiday */}
              {holiday && (
                <HolidayHoverCard holiday={holiday}>
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-medium cursor-pointer hover:bg-rose-200 dark:hover:bg-rose-900/40 transition-colors">
                    <Calendar className="h-3 w-3 shrink-0" />
                    <span className="truncate">{holiday.name}</span>
                  </div>
                </HolidayHoverCard>
              )}

              {/* Birthdays */}
              {(dayBirthdays as UpcomingBirthdayEmployee[]).map((b) => {
                const isPastB = b.status?.toLowerCase() === "past";
                const isTodayB = b.status?.toLowerCase() === "today";
                return (
                  <BirthdayHoverCard key={b.id} birthday={b}>
                    <div
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded text-white text-xs font-medium cursor-pointer transition-colors",
                        isPastB
                          ? "bg-gray-400 hover:bg-gray-500 opacity-70"
                          : isTodayB
                          ? "bg-pink-500 hover:bg-pink-600"
                          : "bg-pink-400 hover:bg-pink-500"
                      )}
                    >
                      <span>🎂</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{b.name}</p>
                        <p className="text-[10px] opacity-80">
                          {isPastB
                            ? `${b.remaining_days}d ago`
                            : isTodayB
                            ? `${b.remaining_hours}h ${b.remaining_minutes}m left`
                            : `${b.remaining_days}d ${b.remaining_hours}h`}
                        </p>
                      </div>
                    </div>
                  </BirthdayHoverCard>
                );
              })}

              {/* Leaves */}
              {dayLeaves.map((leave, leaveIdx) => {
                const colors = getLeaveColor(leave.leave_type, leave.status);
                return (
                  <LeaveHoverCard key={leave.id} leave={leave}>
                    <div
                      className={cn(
                        "px-2 py-2 rounded text-white text-xs cursor-pointer",
                        "transition-colors duration-150",
                        colors.color,
                        colors.hoverColor
                      )}
                      style={{
                        animationDelay: `${index * 40 + leaveIdx * 60}ms`,
                        animation: "fadeInScale 0.3s ease-out forwards",
                      }}
                    >
                      <div className="flex items-center gap-1.5 font-semibold mb-1">
                        <User className="h-3 w-3 shrink-0" />
                        <span className="truncate">{leave.employee}</span>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-90">
                        <Briefcase className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{leave.leave_type}</span>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-90 mt-0.5">
                        <Clock className="h-2.5 w-2.5 shrink-0" />
                        <span>
                          {leave.days} day{leave.days > 1 ? "s" : ""}
                        </span>
                        {leave.leave_timing_type && (
                          <span className="bg-black/20 px-1 py-0.5 rounded text-[9px] font-medium">
                            {timingLabel(leave.leave_timing_type)}
                          </span>
                        )}
                      </div>
                    </div>
                  </LeaveHoverCard>
                );
              })}

              {/* Empty state */}
              {dayLeaves.length === 0 && !holiday && (
                <p className="text-center text-xs text-muted-foreground py-4 mt-auto">
                  No leaves
                </p>
              )}
            </div>
          );
        })}
      </div>

      <style>{calendarAnimations}</style>
    </div>
  );
};
