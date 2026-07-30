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

// ── small chip used for leave events inside a cell ────────────────────────────
const birthdayChipCls = (isPast: boolean, isToday: boolean) =>
  cn(
    "text-[10px] sm:text-xs px-1.5 py-0.5 rounded text-white font-medium",
    "flex items-center gap-1 cursor-pointer truncate",
    "transition-colors duration-150",
    isPast
      ? "bg-gray-400 hover:bg-gray-500 opacity-70"
      : isToday
      ? "bg-pink-500 hover:bg-pink-600"
      : "bg-pink-400 hover:bg-pink-500"
  );

// ── main component ────────────────────────────────────────────────────────────
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

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const startDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = Array.from({ length: 42 }, (_, i) => {
    const dayNumber = i - startDow + 1;
    const valid = dayNumber > 0 && dayNumber <= daysInMonth;
    const date = valid ? new Date(year, month, dayNumber) : null;
    return {
      dayNumber: valid ? dayNumber : null,
      date,
      isWeekend: date ? date.getDay() === 0 || date.getDay() === 6 : false,
    };
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxChips = isMobile ? 2 : 3;

  return (
    <div className="space-y-1 sm:space-y-2">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, idx) => (
          <div
            key={d}
            className={cn(
              "text-center text-[11px] sm:text-xs font-semibold py-2",
              idx === 0 || idx === 6
                ? "text-muted-foreground"
                : "text-foreground"
            )}
          >
            <span className="hidden sm:inline">
              {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][idx]}
            </span>
            <span className="sm:hidden">{d}</span>
          </div>
        ))}
      </div>

      {/* Grid — cells separated by 1px gaps, no box-shadow on the whole grid */}
      <div className="grid grid-cols-7 border border-border rounded-lg overflow-hidden">
        {cells.map((cell, index) => {
          const dayLeaves = getLeavesForDate(cell.date, leaves);
          const holiday = getHolidayForDate(cell.date, holidays);
          const dayBirthdays = getBirthdaysForDate(cell.date, birthdays) as UpcomingBirthdayEmployee[];
          const isToday = cell.date?.toDateString() === today.toDateString();

          return (
            <div
              key={index}
              className={cn(
                // layout
                "min-h-[5.5rem] sm:min-h-[7rem] p-1 sm:p-1.5 flex flex-col gap-0.5",
                // right + bottom borders create the grid lines
                "border-r border-b border-border",
                // remove right border on last column, remove bottom border on last row
                (index + 1) % 7 === 0 && "border-r-0",
                index >= 35 && "border-b-0",
                // fills
                "bg-background",
                !cell.dayNumber && "bg-muted/20",
                cell.isWeekend && cell.dayNumber && "bg-muted/[0.07] shadow-[inset_0_0_0_1px_hsl(var(--muted-foreground)/0.08)]",
                holiday && "bg-rose-50/70 dark:bg-rose-950/20",
                // today — ring inside the cell, no outline trick
                isToday && "bg-primary/[0.04] dark:bg-primary/10"
              )}
              style={{
                animation: cell.dayNumber
                  ? `cellFadeIn 0.25s ease-out ${Math.floor(index / 7) * 40}ms both`
                  : undefined,
              }}
            >
              {cell.dayNumber && (
                <>
                  {/* Day number row */}
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6",
                        "text-xs sm:text-sm font-semibold rounded-full",
                        isToday
                          ? "bg-primary text-primary-foreground"
                          : holiday
                          ? "text-rose-600 dark:text-rose-400"
                          : cell.isWeekend
                          ? "text-muted-foreground"
                          : "text-foreground"
                      )}
                    >
                      {cell.dayNumber}
                    </span>
                    {dayLeaves.length > 0 && (
                      <Badge
                        variant="secondary"
                        className="text-[9px] h-4 px-1 font-medium"
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
                      <div className="text-[9px] sm:text-[10px] font-medium px-1 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 truncate flex items-center gap-1 cursor-pointer hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors">
                        <Calendar className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{holiday.name}</span>
                      </div>
                    </HolidayHoverCard>
                  )}

                  {/* Birthday chips */}
                  {dayBirthdays.map((b) => {
                    const isPastB = b.status?.toLowerCase() === "past";
                    const isTodayB = b.status?.toLowerCase() === "today";
                    return (
                      <BirthdayHoverCard key={b.id} birthday={b} isMobile={isMobile}>
                        <div className={birthdayChipCls(isPastB, isTodayB)}>
                          <span>🎂</span>
                          <span className="truncate">{b.name.split(" ")[0]}</span>
                          {!isPastB && (
                            <span className="text-[9px] opacity-80 shrink-0">
                              {isTodayB ? `${b.remaining_hours}h` : `${b.remaining_days}d`}
                            </span>
                          )}
                        </div>
                      </BirthdayHoverCard>
                    );
                  })}

                  {/* Leave chips */}
                  {dayLeaves.slice(0, maxChips).map((leave) => {
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
                            "text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded text-white",
                            "flex items-center gap-1 cursor-pointer truncate",
                            "transition-colors duration-150",
                            colors.color,
                            colors.hoverColor
                          )}
                        >
                          <User className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">{leave.employee.split(" ")[0]}</span>
                          {leave.leave_timing && (
                            <span className="shrink-0 opacity-80">⏰</span>
                          )}
                        </div>
                      </LeaveHoverCard>
                    );
                  })}

                  {/* Overflow */}
                  {dayLeaves.length > maxChips && (
                    <button
                      className="text-[9px] sm:text-[10px] text-muted-foreground text-center py-0.5 bg-muted/40 rounded hover:bg-muted transition-colors w-full font-medium mt-auto"
                      onClick={() =>
                        cell.date &&
                        setSelectedDateLeaves({ leaves: dayLeaves, date: cell.date })
                      }
                    >
                      +{dayLeaves.length - maxChips} more
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Dialogs ──────────────────────────────────────────────────── */}

      {/* Mobile: single leave */}
      {isMobile && selectedLeave && (
        <Dialog open onOpenChange={() => setSelectedLeave(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                {selectedLeave.employee}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-xs text-muted-foreground font-semibold">Status</span>
                <Badge className={cn("border-0 text-xs", getStatusBadgeClass(selectedLeave.status))}>
                  {STATUS_LABELS[selectedLeave.status.toUpperCase()] ?? selectedLeave.status}
                </Badge>
              </div>
              {selectedLeave.approval_name && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-xs text-muted-foreground font-semibold">Approved by</span>
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

      {/* Mobile: holiday */}
      {isMobile && selectedHoliday && (
        <Dialog open onOpenChange={() => setSelectedHoliday(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-rose-500" />
                Public Holiday
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-xs text-muted-foreground font-semibold">Name</span>
                <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                  {selectedHoliday.name}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-xs text-muted-foreground font-semibold">Date</span>
                <span className="text-sm font-semibold">
                  {new Date(selectedHoliday.date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              {selectedHoliday.type === "OPTIONAL" && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-xs text-muted-foreground font-semibold">Type</span>
                  <Badge variant="outline" className="text-xs border-orange-400 text-orange-600">
                    Optional
                  </Badge>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* All leaves for a date */}
      {selectedDateLeaves && (
        <Dialog open onOpenChange={() => setSelectedDateLeaves(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />
                Leaves —{" "}
                {selectedDateLeaves.date.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-1">
              {selectedDateLeaves.leaves.map((leave) => (
                <div
                  key={leave.id}
                  className="border rounded-lg bg-card overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-semibold">{leave.employee}</span>
                    </div>
                    <Badge className={cn("border-0 text-xs", getStatusBadgeClass(leave.status))}>
                      {STATUS_LABELS[leave.status.toUpperCase()] ?? leave.status}
                    </Badge>
                  </div>
                  <LeaveDetailsContent
                    leave={leave}
                    colors={getLeaveColor(leave.leave_type, leave.status)}
                  />
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <style>{calendarAnimations}</style>
    </div>
  );
};
