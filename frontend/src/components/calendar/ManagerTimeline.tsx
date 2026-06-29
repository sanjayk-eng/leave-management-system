import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { User, Calendar, TrendingUp } from "lucide-react";
import { 
  Leave, 
  Holiday, 
  getLeaveColor, 
  getDateStringIST, 
  isWeekend as checkIsWeekend 
} from "./shared/calendarUtils";
import { calendarAnimations } from "./shared/calendarAnimations";

interface ManagerTimelineProps {
  currentDate: Date;
  leaves: Leave[];
  holidays: Holiday[];
}

export const ManagerTimeline = ({ currentDate, leaves, holidays }: ManagerTimelineProps) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  
  // Group leaves by employee
  const employeeLeaves = useMemo(() => {
    if (!leaves || !Array.isArray(leaves)) return [];
    
    const grouped = new Map<string, Leave[]>();
    
    leaves.forEach(leave => {
      const existing = grouped.get(leave.employee) || [];
      grouped.set(leave.employee, [...existing, leave]);
    });
    
    return Array.from(grouped.entries()).map(([employee, leaves]) => ({
      employee,
      leaves: leaves.sort((a, b) => 
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      )
    }));
  }, [leaves]);

  // Helper to check if date is holiday
  const isHoliday = (date: Date) => {
    const dateStr = getDateStringIST(date);
    return holidays.some(h => h.date.split('T')[0] === dateStr);
  };
  
  // Calculate leave position and width
  const getLeavePosition = (leave: Leave) => {
    // Extract date parts without timezone conversion
    const startDateStr = leave.start_date.split('T')[0];
    const endDateStr = leave.end_date.split('T')[0];
    
    const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
    
    // Check if leave overlaps with current month
    const leaveStartsBeforeOrInMonth = (startYear < year) || (startYear === year && startMonth <= month + 1);
    const leaveEndsAfterOrInMonth = (endYear > year) || (endYear === year && endMonth >= month + 1);
    
    if (leaveStartsBeforeOrInMonth && leaveEndsAfterOrInMonth) {
      // Clamp to current month
      let monthStart = 1;
      let monthEnd = daysInMonth;
      
      // If leave starts in this month, use the actual start day
      if (startYear === year && startMonth === month + 1) {
        monthStart = startDay;
      }
      
      // If leave ends in this month, use the actual end day
      if (endYear === year && endMonth === month + 1) {
        monthEnd = endDay;
      }
      
      const startPos = ((monthStart - 1) / daysInMonth) * 100;
      const width = ((monthEnd - monthStart + 1) / daysInMonth) * 100;
      
      return { startPos, width, visible: true };
    }
    
    return { startPos: 0, width: 0, visible: false };
  };

  if (employeeLeaves.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground font-medium">No team leaves for this period</p>
        <p className="text-sm text-muted-foreground/70 mt-1">Team members haven't requested any leaves this month</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timeline header - Days of month */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-48 flex-shrink-0 text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Team Member
        </div>
        <div className="flex-1 relative">
          <div className="flex rounded-lg overflow-hidden border-2 shadow-sm">
            {Array.from({ length: daysInMonth }, (_, i) => {
              const date = new Date(year, month, i + 1);
              const isHol = isHoliday(date);
              const isWknd = checkIsWeekend(date);
              const isToday = date.toDateString() === new Date().toDateString();
              
              return (
                <div
                  key={i}
                  className={cn(
                    "flex-1 text-center text-xs py-2 font-semibold border-r transition-colors",
                    isWknd && "bg-gray-100 dark:bg-gray-900 text-muted-foreground",
                    isHol && "bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400",
                    isToday && "bg-primary text-primary-foreground ring-2 ring-primary ring-inset",
                    !isWknd && !isHol && !isToday && "hover:bg-muted/50"
                  )}
                  style={{ minWidth: '32px' }}
                  title={isHol ? 'Holiday' : isWknd ? 'Weekend' : ''}
                >
                  {i + 1}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Employee rows */}
      <div className="space-y-4">
        {employeeLeaves.map(({ employee, leaves: empLeaves }, empIdx) => (
          <div 
            key={employee} 
            className="flex items-center gap-3 group"
            style={{
              animationDelay: `${empIdx * 100}ms`,
              animation: 'slideInLeft 0.5s ease-out forwards'
            }}
          >
            {/* Employee name */}
            <div className="w-48 flex-shrink-0 p-3 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg border-2 group-hover:border-primary/50 transition-all duration-300">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm font-bold truncate">{employee}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {empLeaves.length} leave{empLeaves.length !== 1 ? 's' : ''}
              </div>
            </div>
            
            {/* Timeline */}
            <div className="flex-1 relative h-12 border-2 rounded-lg bg-gradient-to-r from-muted/20 to-muted/10 shadow-inner group-hover:shadow-md transition-all duration-300">
              {/* Day dividers */}
              <div className="absolute inset-0 flex rounded-lg overflow-hidden">
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const date = new Date(year, month, i + 1);
                  const isWknd = checkIsWeekend(date);
                  const isHol = isHoliday(date);
                  
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 border-r",
                        isWknd && "bg-gray-200/50 dark:bg-gray-800/50",
                        isHol && "bg-rose-100/50 dark:bg-rose-950/20"
                      )}
                      style={{ minWidth: '32px' }}
                    />
                  );
                })}
              </div>
              
              {/* Leave bars */}
              {empLeaves.map((leave, leaveIdx) => {
                const { startPos, width, visible } = getLeavePosition(leave);
                
                if (!visible) return null;
                
                const colors = getLeaveColor(leave.leave_type, leave.status);
                
                return (
                  <div
                    key={leave.id}
                    className={cn(
                      "absolute top-1.5 h-9 rounded-lg border-2 text-white flex items-center justify-center text-xs font-bold cursor-pointer transition-all duration-300 hover:scale-105 hover:z-10 shadow-lg",
                      colors.color,
                      colors.borderColor,
                      colors.shadow
                    )}
                    style={{
                      left: `${startPos}%`,
                      width: `${width}%`,
                      animationDelay: `${(empIdx * 100) + (leaveIdx * 50)}ms`,
                      animation: 'expandWidth 0.5s ease-out forwards'
                    }}
                    title={`${leave.leave_type} - ${leave.status} (${leave.days} days)`}
                  >
                    <span className="truncate px-2 drop-shadow-sm">
                      {leave.leave_type.substring(0, 3).toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      {/* Summary */}
      <div className="pt-6 border-t-2 flex items-center justify-between bg-muted/30 p-4 rounded-lg">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-5 w-5 text-primary" />
          <div>
            <div className="text-sm font-bold">
              {employeeLeaves.length} Team Member{employeeLeaves.length !== 1 ? 's' : ''}
            </div>
            <div className="text-xs text-muted-foreground">
              with leaves this month
            </div>
          </div>
        </div>
        <Badge variant="secondary" className="text-sm px-4 py-2">
          {employeeLeaves.reduce((sum, emp) => sum + emp.leaves.length, 0)} Total Leaves
        </Badge>
      </div>

      <style>{calendarAnimations}</style>
    </div>
  );
};
