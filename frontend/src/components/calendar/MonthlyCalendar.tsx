import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Calendar, User } from "lucide-react";
import {
  Leave,
  Holiday,
  getLeaveColor,
  getLeavesForDate,
  getHolidayForDate,
  getBirthdaysForDate,
  getStatusBadgeClass,
  STATUS_LABELS,
} from "./shared/calendarUtils";
import { LeaveHoverCard } from "./shared/LeaveHoverCard";
import { HolidayHoverCard } from "./shared/HolidayHoverCard";
import { BirthdayHoverCard } from "./shared/BirthdayHoverCard";
import { LeaveDetailsContent } from "./shared/LeaveDetailsContent";
import { calendarAnimations } from "./shared/calendarAnimations";
import type { UpcomingBirthdayEmployee } from "@/services/settingsService";

interface MonthlyCalendarProps {
  currentDate: Date;
  leaves: Leave[];
  holidays: Holiday[];
  birthdays?: UpcomingBirthdayEmployee[];
}

export const MonthlyCalendar = ({
  currentDate,
  leaves,
  holidays,
  birthdays = [],
}: MonthlyCalendarProps) => {
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [selectedDateLeaves, setSelectedDateLeaves] = useState<{
    leaves: Leave[];
    date: Date;
  } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile — must be useEffect, not useState callback
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days = [];
  const totalCells = 42;

  for (let i = 0; i < totalCells; i++) {
    const dayNumber = i - startingDayOfWeek + 1;
    const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth;
    const date = isValidDay ? new Date(year, month, dayNumber) : null;

    days.push({
      dayNumber: isValidDay ? dayNumber : null,
      date,
      isWeekend: date ? date.getDay() === 0 || date.getDay() === 6 : false,
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxLeaves = isMobile ? 2 : 3;

  return (
    <div className="space-y-4">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(
          (day, idx) => (
            <div
              key={day}
              className={cn(
                "text-center text-xs sm:text-sm font-semibold py-2 sm:py-3 rounded-t-lg",
                idx === 0 || idx === 6
                  ? "text-muted-foreground bg-muted/30"
                  : "text-foreground bg-muted/10"
              )}
            >
              <span className="hidden md:inline">{day}</span>
              <span className="md:hidden">{day.slice(0, 1)}</span>
            </div>
          )
        )}
      </div>

      {/* Calendar grid — fixed 6 rows */}
      <div className="grid grid-cols-7 grid-rows-6 gap-1 sm:gap-2">
        {days.map((day, index) => {
          const dayLeaves = getLeavesForDate(day.date, leaves);
          const holiday = getHolidayForDate(day.date, holidays);
          const dayBirthdays = getBirthdaysForDate(
            day.date,
            birthdays
          ) as UpcomingBirthdayEmployee[];
          const isToday = day.date?.toDateString() === today.toDateString();

          return (
            <div
              key={index}
              className={cn(
                "h-24 sm:h-32 border rounded-lg sm:rounded-xl p-1.5 sm:p-3 transition-all duration-300 hover:shadow-lg overflow-y-auto",
                !day.dayNumber && "bg-muted/20 border-muted",
                day.isWeekend &&
                  day.dayNumber &&
                  "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border-gray-200 dark:border-gray-700",
                holiday &&
                  "bg-gradient-to-br from-rose-50 via-rose-100 to-rose-50 dark:from-rose-950/40 dark:via-rose-900/30 dark:to-rose-950/40 border-rose-400 dark:border-rose-600 shadow-rose-200/50 dark:shadow-rose-900/50 shadow-lg",
                isToday && "ring-2 sm:ring-4 ring-primary ring-offset-1 sm:ring-offset-2 shadow-xl",
                day.dayNumber &&
                  !day.isWeekend &&
                  !holiday &&
                  "bg-gradient-to-br from-background to-muted/20 hover:border-primary/50"
              )}
              style={{
                animationDelay: `${index * 20}ms`,
                animation: "fadeIn 0.5s ease-out forwards",
              }}
            >
              {day.dayNumber && (
                <>
                  {/* Day number row */}
                  <div
                    className={cn(
                      "text-xs sm:text-sm font-bold mb-1 sm:mb-2 flex items-center justify-between",
                      day.isWeekend && "text-muted-foreground",
                      holiday && "text-rose-600 dark:text-rose-400",
                      isToday && "text-primary"
                    )}
                  >
                    <span
                      className={cn(
                        "flex items-center justify-center w-5 h-5 sm:w-7 sm:h-7 rounded-full transition-all text-xs sm:text-sm",
                        isToday && "bg-primary text-primary-foreground shadow-lg"
                      )}
                    >
                      {day.dayNumber}
                    </span>
                    {dayLeaves.length > 0 && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] sm:text-xs h-4 sm:h-5 px-1 sm:px-1.5"
                      >
                        {dayLeaves.length}
                      </Badge>
                    )}
                  </div>

                  {/* Holiday chip */}
                  {holiday && (
                    <HolidayHoverCard
                      holiday={holiday}
                      isMobile={isMobile}
                      onMobileClick={() => setSelectedHoliday(holiday)}
                    >
                      <div className="text-[10px] sm:text-xs text-white font-bold mb-1 sm:mb-2 p-1 sm:p-2 bg-gradient-to-r from-rose-500 to-rose-600 rounded-md sm:rounded-lg shadow-md truncate flex items-center gap-1 sm:gap-1.5 cursor-pointer hover:from-rose-600 hover:to-rose-700 hover:shadow-lg transition-all duration-200 active:scale-95 sm:hover:scale-105">
                        <Calendar className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 flex-shrink-0 animate-pulse" />
                        <span className="truncate">{holiday.name}</span>
                      </div>
                    </HolidayHoverCard>
                  )}

                  <div className="space-y-1 sm:space-y-1.5">
                    {/* Birthday chips */}
                    {dayBirthdays.map((b) => {
                      const isPastB = b.status?.toLowerCase() === "past";
                      const isTodayB = b.status?.toLowerCase() === "today";
                      return (
                        <BirthdayHoverCard key={b.id} birthday={b} isMobile={isMobile}>
                          <div
                            className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded-md text-white font-medium flex items-center gap-1 shadow-sm transition-all duration-200 active:scale-95 sm:hover:scale-105 hover:shadow-md cursor-pointer ${
                              isPastB
                                ? "bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 opacity-70"
                                : isTodayB
                                ? "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 animate-pulse"
                                : "bg-gradient-to-r from-pink-400 to-pink-500 hover:from-pink-500 hover:to-rose-500"
                            }`}
                            title={`🎂 ${b.name}'s Birthday`}
                          >
                            <span>🎂</span>
                            <span className="truncate">{b.name.split(" ")[0]}</span>
                            {!isPastB && (
                              <span className="text-[9px] opacity-90 shrink-0">
                                {isTodayB ? `${b.remaining_hours}h` : `${b.remaining_days}d`}
                              </span>
                            )}
                          </div>
                        </BirthdayHoverCard>
                      );
                    })}

                    {/* Leave chips */}
                    {dayLeaves.slice(0, maxLeaves).map((leave, leaveIdx) => {
                      const colors = getLeaveColor(leave.leave_type, leave.status);
                      return (
                        <LeaveHoverCard
                          key={leave.id}
                          leave={leave}
                          isMobile={isMobile}
                          onMobileClick={() => setSelectedLeave(leave)}
                        >
                          <div
                            className={cn(
                              "text-[10px] sm:text-xs px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-white cursor-pointer truncate transition-all duration-200 shadow-sm",
                              colors.color,
                              colors.hoverColor,
                              "active:scale-95 sm:hover:scale-105 hover:shadow-md"
                            )}
                            style={{
                              animationDelay: `${index * 20 + leaveIdx * 50}ms`,
                              animation: "slideIn 0.3s ease-out forwards",
                            }}
                          >
                            <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5">
                              <User className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                              <span className="truncate font-medium">
                                {leave.employee.split(" ")[0]}
                              </span>
                            </div>
                            {leave.leave_timing && (
                              <div className="flex items-center gap-1 text-[9px] sm:text-[10px] opacity-90">
                                <span className="bg-white/20 px-1 py-0.5 rounded text-[8px] sm:text-[9px] truncate">
                                  ⏰ {leave.leave_timing}
                                </span>
                              </div>
                            )}
                          </div>
                        </LeaveHoverCard>
                      );
                    })}

                    {/* Overflow pill */}
                    {dayLeaves.length > maxLeaves && (
                      <div
                        className="text-[10px] sm:text-xs text-muted-foreground text-center py-0.5 sm:py-1 bg-muted/30 rounded-md font-medium hover:bg-muted/50 transition-colors cursor-pointer active:scale-95"
                        onClick={() =>
                          day.date &&
                          setSelectedDateLeaves({ leaves: dayLeaves, date: day.date })
                        }
                      >
                        +{dayLeaves.length - maxLeaves} more
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────── */}

      {/* Mobile: single leave detail */}
      {isMobile && selectedLeave && (
        <Dialog open onOpenChange={() => setSelectedLeave(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {selectedLeave.employee}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground font-medium">Status:</span>
                <Badge
                  className={cn("border-0", getStatusBadgeClass(selectedLeave.status))}
                >
                  {STATUS_LABELS[selectedLeave.status.toUpperCase()] ?? selectedLeave.status}
                </Badge>
              </div>
              {selectedLeave.approval_name && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground font-medium">Approved by:</span>
                  <span className="text-sm font-semibold">{selectedLeave.approval_name}</span>
                </div>
              )}
              <LeaveDetailsContent
                leave={selectedLeave}
                colors={getLeaveColor(selectedLeave.leave_type, selectedLeave.status)}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Mobile: holiday detail */}
      {isMobile && selectedHoliday && (
        <Dialog open onOpenChange={() => setSelectedHoliday(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-rose-600" />
                Public Holiday
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-rose-50 dark:bg-rose-950/30 rounded-lg border border-rose-200 dark:border-rose-800">
                <span className="text-sm text-muted-foreground font-medium">Holiday Name:</span>
                <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                  {selectedHoliday.name}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground font-medium">Date:</span>
                <span className="text-sm font-semibold">
                  {new Date(selectedHoliday.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground font-medium">Day of Week:</span>
                <span className="text-sm font-semibold">{selectedHoliday.day}</span>
              </div>
              {selectedHoliday.type === "OPTIONAL" && (
                <div className="p-3 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 border border-orange-300 dark:border-orange-700 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-orange-500">
                      Optional Holiday
                    </Badge>
                    <span className="text-xs text-orange-700 dark:text-orange-300">
                      Employee choice
                    </span>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* All leaves on a date */}
      {selectedDateLeaves && (
        <Dialog open onOpenChange={() => setSelectedDateLeaves(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                All Leaves on{" "}
                {selectedDateLeaves.date.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {selectedDateLeaves.leaves.map((leave) => {
                const colors = getLeaveColor(leave.leave_type, leave.status);
                return (
                  <div
                    key={leave.id}
                    className="border rounded-lg hover:shadow-md transition-shadow bg-card overflow-hidden"
                  >
                    {/* Card header row */}
                    <div className="flex items-center justify-between px-4 pt-4 pb-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="font-semibold">{leave.employee}</span>
                      </div>
                      <Badge className={cn("border-0", getStatusBadgeClass(leave.status))}>
                        {STATUS_LABELS[leave.status.toUpperCase()] ?? leave.status}
                      </Badge>
                    </div>
                    {/* Reuse shared detail rows */}
                    <LeaveDetailsContent leave={leave} colors={colors} />
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <style>{calendarAnimations}</style>
    </div>
  );
};
