import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { useHolidays } from "@/hooks/useHolidays";
import { useLeaveCalendar } from "@/hooks/useLeaves";
import { useCalendarBirthdays } from "@/hooks/useBirthday";
import { MonthlyCalendar, WeeklyCalendar, HolidaysList } from "@/components/calendar";
import { LeaveSummaryCards } from "@/components/leave/LeaveSummaryCards";
import { LEAVE_TYPE_LEGEND } from "@/components/calendar/shared/calendarUtils";

const LeaveCalendar = () => {
  const { holidays, isLoading: holidaysLoading } = useHolidays();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"monthly" | "weekly">("monthly");
  const [showHolidays, setShowHolidays] = useState(true);

  // Use month and year from currentDate for filtering
  const month = currentDate.getMonth() + 1; // 1-12
  const year = currentDate.getFullYear();
  
  const { leaves, summary, isLoading: leavesLoading } = useLeaveCalendar(month, year);
  const { birthdays } = useCalendarBirthdays(month, year);

  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (view === "monthly") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 7);
    }
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (view === "monthly") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatDateRange = () => {
    if (view === "monthly") {
      return currentDate.toLocaleDateString('en-IN', { 
        month: 'long', 
        year: 'numeric',
        timeZone: 'Asia/Kolkata'
      });
    } else {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      const startStr = startOfWeek.toLocaleDateString('en-IN', { 
        month: 'short', 
        day: 'numeric',
        timeZone: 'Asia/Kolkata'
      });
      const endStr = endOfWeek.toLocaleDateString('en-IN', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        timeZone: 'Asia/Kolkata'
      });
      
      return `${startStr} - ${endStr}`;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in-50 duration-500 p-2 sm:p-0">
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="space-y-0.5 sm:space-y-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Leave Calendar</h1>
          <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">View and manage team leaves</p>
        </div>
      </div>

      {/* Summary Stats — reuses the same component as Approvals & MyLeaveHistory */}
      <LeaveSummaryCards summary={summary ?? null} isLoading={leavesLoading} />

      {/* Calendar Controls */}
      <Card className="shadow-lg overflow-hidden">
        <CardHeader className="border-b bg-muted/30 p-3 sm:p-4 lg:p-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Date Navigation */}
            <div className="flex items-center justify-between gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={goToPrevious}
                className="hover:bg-primary hover:text-primary-foreground transition-colors h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10 shrink-0"
              >
                <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>

              {/* Center: current date range + today shortcut */}
              <div className="flex flex-col items-center gap-1 min-w-0">
                <div className="text-sm sm:text-base lg:text-lg font-semibold flex items-center gap-1 sm:gap-2">
                  <CalendarIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-primary shrink-0" />
                  <span className="truncate">{formatDateRange()}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToToday}
                  className="h-6 px-2 text-[10px] sm:text-xs text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  Go to Today
                </Button>
              </div>

              <Button 
                variant="outline" 
                size="icon" 
                onClick={goToNext}
                className="hover:bg-primary hover:text-primary-foreground transition-colors h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10 shrink-0"
              >
                <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </div>
            
            {/* View Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <Button
                variant={showHolidays ? "default" : "outline"}
                size="sm"
                onClick={() => setShowHolidays(!showHolidays)}
                className="gap-2 transition-all duration-300 hover:scale-105 w-full sm:w-auto text-xs sm:text-sm h-8 sm:h-9"
              >
                {showHolidays ? <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                <span>{showHolidays ? "Hide" : "Show"} Holidays</span>
              </Button>
              
              <Tabs value={view} onValueChange={(v) => setView(v as "monthly" | "weekly")} className="w-full sm:w-auto">
                <TabsList className="grid w-full grid-cols-2 h-8 sm:h-9">
                  <TabsTrigger value="monthly" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm">
                    Monthly
                  </TabsTrigger>
                  <TabsTrigger value="weekly" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm">
                    Weekly
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-3 sm:pt-4 lg:pt-6 px-1 sm:px-3 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
          {leavesLoading || holidaysLoading ? (
            <div className="space-y-4">
              {/* Calendar header skeleton */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={`header-${i}`} className="h-8 w-full" />
                ))}
              </div>
              {/* Calendar grid skeleton - 6 weeks for monthly, 1 week for weekly */}
              {Array.from({ length: view === "monthly" ? 6 : 1 }).map((_, weekIndex) => (
                <div key={`week-${weekIndex}`} className="grid grid-cols-7 gap-1 sm:gap-2">
                  {Array.from({ length: 7 }).map((_, dayIndex) => (
                    <Skeleton 
                      key={`day-${weekIndex}-${dayIndex}`} 
                      className={view === "monthly" ? "h-20 sm:h-24 lg:h-28 w-full" : "h-32 w-full"} 
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
              {view === "monthly" ? (
                <MonthlyCalendar 
                  currentDate={currentDate}
                  leaves={leaves}
                  holidays={showHolidays ? holidays : []}
                  birthdays={birthdays}
                />
              ) : (
                <WeeklyCalendar 
                  currentDate={currentDate}
                  leaves={leaves}
                  holidays={showHolidays ? holidays : []}
                  birthdays={birthdays}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>



      {/* Holidays List */}
      {showHolidays && !holidaysLoading && holidays.length > 0 && (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
          <HolidaysList 
            holidays={holidays}
            currentDate={currentDate}
          />
        </div>
      )}

      {/* Legend */}
      <Card className="shadow-md">
        <CardHeader className="p-3 sm:p-4 lg:p-6">
          <CardTitle className="text-sm sm:text-base">Calendar Legend</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Color coding for leaves and holidays</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
          <div className="space-y-3 sm:space-y-4">
            {/* Leave Types Section */}
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-2 sm:mb-3">Leave Types (Approved)</h4>
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {LEAVE_TYPE_LEGEND.filter(t => t.category === "Leave Types").map((type, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-2 p-2 sm:p-2.5 rounded-lg hover:bg-muted/50 transition-colors duration-200 cursor-default border border-muted"
                  >
                    <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded shadow-sm shrink-0 ${type.color}`} />
                    <span className="text-[11px] sm:text-xs font-medium truncate">{type.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Section */}
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-2 sm:mb-3">Leave Status</h4>
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {LEAVE_TYPE_LEGEND.filter(t => t.category === "Status").map((type, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-2 p-2 sm:p-2.5 rounded-lg hover:bg-muted/50 transition-colors duration-200 cursor-default border border-muted"
                  >
                    <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded shadow-sm shrink-0 ${type.color}`} />
                    <span className="text-[11px] sm:text-xs font-medium truncate">{type.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Special Days Section */}
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-2 sm:mb-3">Special Days</h4>
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {LEAVE_TYPE_LEGEND.filter(t => t.category === "Special").map((type, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-2 p-2 sm:p-2.5 rounded-lg hover:bg-muted/50 transition-colors duration-200 cursor-default border border-muted"
                  >
                    <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded shadow-sm shrink-0 ${type.color}`} />
                    <span className="text-[11px] sm:text-xs font-medium truncate">{type.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>


    </div>
  );
};

export default LeaveCalendar;
