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

interface WeeklyCalendarProps {
  currentDate: Date;
  leaves: Leave[];
  holidays: Holiday[];
  birthdays?: UpcomingBirthdayEmployee[];
}

export const WeeklyCalendar = ({ currentDate, leaves, holidays, birthdays = [] }: WeeklyCalendarProps) => {
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return date;
  });
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-2 sm:space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2 sm:gap-3 lg:gap-4">
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
                "border-2 rounded-xl sm:rounded-2xl p-3 sm:p-4 min-h-48 sm:min-h-64 lg:min-h-80 transition-all duration-300 hover:shadow-2xl",
                isWeekend && "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border-gray-200",
                holiday && "bg-gradient-to-br from-rose-50 via-rose-100 to-rose-50 dark:from-rose-950/40 dark:via-rose-900/30 dark:to-rose-950/40 border-rose-400 dark:border-rose-600 shadow-rose-200/50 dark:shadow-rose-900/50 shadow-xl",
                isToday && "ring-2 sm:ring-4 ring-primary ring-offset-1 sm:ring-offset-2 shadow-2xl sm:scale-105",
                !isWeekend && !holiday && "bg-gradient-to-br from-background to-muted/10 hover:border-primary/50"
              )}
              style={{
                animationDelay: `${index * 50}ms`,
                animation: 'slideInUp 0.5s ease-out forwards'
              }}
            >
              {/* Day header */}
              <div className="text-center mb-3 sm:mb-4 pb-2 sm:pb-3 border-b-2">
                <div className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5 sm:mb-1">
                  {date.toLocaleDateString('en-US', { weekday: 'long' })}
                </div>
                <div className={cn(
                  "text-2xl sm:text-3xl lg:text-4xl font-bold mb-0.5 sm:mb-1 transition-colors",
                  isWeekend && "text-muted-foreground",
                  holiday && "text-rose-600 dark:text-rose-400",
                  isToday && "text-primary"
                )}>
                  {date.getDate()}
                </div>
                <div className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase">
                  {date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
                {dayLeaves.length > 0 && (
                  <Badge variant="secondary" className="mt-1 sm:mt-2 text-[10px] sm:text-xs h-4 sm:h-5">
                    {dayLeaves.length} {dayLeaves.length === 1 ? 'Leave' : 'Leaves'}
                  </Badge>
                )}
              </div>
              
              {/* Holiday indicator */}
              {holiday && (
                <HolidayHoverCard holiday={holiday}>
                  <div className="mb-2 sm:mb-3 lg:mb-4 p-2 sm:p-3 lg:p-4 bg-gradient-to-r from-rose-500 via-rose-600 to-rose-700 rounded-xl sm:rounded-2xl text-xs sm:text-sm text-white font-bold text-center shadow-xl flex items-center justify-center gap-1.5 sm:gap-2.5 animate-pulse cursor-pointer hover:from-rose-600 hover:via-rose-700 hover:to-rose-800 hover:shadow-2xl transition-all duration-300 hover:scale-105 border-2 border-rose-400">
                    <div className="p-1 sm:p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                      <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                    </div>
                    <span className="tracking-wide truncate">{holiday.name}</span>
                  </div>
                </HolidayHoverCard>
              )}
              
              {/* Leaves */}
              <div className="space-y-1.5 sm:space-y-2 lg:space-y-2.5">
                {/* Birthday chips */}
                {dayBirthdays.map((b) => {
                  const isPastB = b.status?.toLowerCase() === 'past';
                  const isTodayB = b.status?.toLowerCase() === 'today';
                  return (
                    <BirthdayHoverCard key={b.id} birthday={b as UpcomingBirthdayEmployee}>
                      <div
                        className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl text-white font-medium shadow-md flex items-center gap-2 cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95 ${
                          isPastB
                            ? 'bg-gradient-to-r from-gray-400 to-gray-500 opacity-70'
                            : isTodayB
                            ? 'bg-gradient-to-r from-pink-500 to-rose-500'
                            : 'bg-gradient-to-r from-pink-400 to-pink-500 hover:from-pink-500 hover:to-rose-500'
                        }`}
                        title={`${b.name}'s Birthday`}
                      >
                        <span className="text-base">🎂</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-bold truncate">{b.name}</div>
                          <div className="text-[10px] opacity-90">
                            {isPastB
                              ? `${b.remaining_days}d ago`
                              : isTodayB
                              ? `${b.remaining_hours}h ${b.remaining_minutes}m left`
                              : `${b.remaining_days}d ${b.remaining_hours}h ${b.remaining_minutes}m`}
                          </div>
                        </div>
                      </div>
                    </BirthdayHoverCard>
                  );
                })}
                {dayLeaves.map((leave, leaveIdx) => {
                  const colors = getLeaveColor(leave.leave_type, leave.status);
                  return (
                    <LeaveHoverCard key={leave.id} leave={leave}>
                      <div
                        className={cn(
                          "p-2 sm:p-2.5 lg:p-3 rounded-lg sm:rounded-xl text-white cursor-pointer transition-all duration-300 shadow-md hover:shadow-xl hover:scale-105 bg-gradient-to-br",
                          colors.gradient
                        )}
                        style={{
                          animationDelay: `${(index * 50) + (leaveIdx * 100)}ms`,
                          animation: 'fadeInScale 0.4s ease-out forwards'
                        }}
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-1.5">
                          <User className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4 flex-shrink-0" />
                          <div className="text-xs sm:text-sm font-bold truncate">
                            {leave.employee}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs opacity-95">
                          <Briefcase className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                          <span className="truncate">{leave.leave_type}</span>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs opacity-90 mt-0.5 sm:mt-1">
                          <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                          <span>{leave.days} day{leave.days > 1 ? 's' : ''}</span>
                          {leave.leave_timing_type && (
                            <span className="text-[9px] sm:text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-medium">
                              {leave.leave_timing_type === 'FIRST_HALF' ? 'AM' : 
                               leave.leave_timing_type === 'SECOND_HALF' ? 'PM' : 
                               leave.leave_timing_type === 'EARLY' ? 'EL' : 'FD'}
                            </span>
                          )}
                        </div>
                        {leave.leave_timing && (
                          <div className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] opacity-85 mt-0.5">
                            <span className="bg-white/15 px-1.5 py-0.5 rounded font-medium truncate">⏰ {leave.leave_timing}</span>
                          </div>
                        )}
                      </div>
                    </LeaveHoverCard>
                  );
                })}
                {dayLeaves.length === 0 && !holiday && (
                  <div className="text-center py-4 sm:py-6 lg:py-8 text-muted-foreground text-xs sm:text-sm">
                    No leaves
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style>{calendarAnimations}</style>
    </div>
  );
};
