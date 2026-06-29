import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Holiday {
  id: string;
  name: string;
  date: string;
  day: string;
  type: string;
  created_at: string;
  updated_at: string;
}

interface HolidaysListProps {
  holidays: Holiday[];
  currentDate: Date;
}

export const HolidaysList = ({ holidays, currentDate }: HolidaysListProps) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  
  // Get available years from holidays
  const availableYears = Array.from(
    new Set((holidays || []).map(h => new Date(h.date).getFullYear()))
  ).sort((a, b) => a - b);
  
  // Filter holidays by selected year
  const yearHolidays = holidays.filter(h => 
    new Date(h.date).getFullYear() === selectedYear
  );

  // Get upcoming holidays (including today and future) - always from all holidays
  const upcomingHolidays = holidays
    .filter(h => {
      const holidayDate = new Date(h.date);
      holidayDate.setHours(0, 0, 0, 0);
      return holidayDate >= today;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5); // Show only next 5 holidays

  // Get holidays for selected year
  const yearFilteredHolidays = yearHolidays
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysUntil = (dateStr: string) => {
    const holidayDate = new Date(dateStr);
    holidayDate.setHours(0, 0, 0, 0);
    const diffTime = holidayDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays < 7) return `In ${diffDays} days`;
    if (diffDays < 30) return `In ${Math.floor(diffDays / 7)} weeks`;
    return `In ${Math.floor(diffDays / 30)} months`;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Upcoming Holidays */}
      <Card className="shadow-lg border-2 hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="bg-gradient-to-r from-rose-500/10 to-rose-600/10 border-b-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-rose-600" />
            Upcoming Holidays
          </CardTitle>
          <CardDescription>Next public holidays</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {upcomingHolidays.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No upcoming holidays</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingHolidays.map((holiday, index) => {
                const isToday = getDaysUntil(holiday.date) === "Today";
                const isTomorrow = getDaysUntil(holiday.date) === "Tomorrow";
                
                return (
                  <div
                    key={holiday.id}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all duration-300 hover:shadow-md hover:scale-102",
                      isToday && "bg-gradient-to-r from-rose-50 to-rose-100 dark:from-rose-950/30 dark:to-rose-900/20 border-rose-400 ring-2 ring-rose-400",
                      isTomorrow && "bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-400",
                      !isToday && !isTomorrow && "bg-gradient-to-r from-muted/30 to-muted/10 hover:border-primary/50"
                    )}
                    style={{
                      animationDelay: `${index * 100}ms`,
                      animation: 'slideInRight 0.5s ease-out forwards'
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className={cn(
                            "h-4 w-4 flex-shrink-0",
                            isToday ? "text-rose-600" : isTomorrow ? "text-orange-600" : "text-primary"
                          )} />
                          <h4 className="font-bold text-sm truncate">{holiday.name}</h4>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium">{formatDate(holiday.date)}</span>
                          <span>•</span>
                          <span>{holiday.day}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge 
                          variant={isToday ? "default" : "secondary"}
                          className={cn(
                            "text-xs font-bold",
                            isToday && "bg-rose-600 hover:bg-rose-700",
                            isTomorrow && "bg-orange-500 hover:bg-orange-600 text-white"
                          )}
                        >
                          {getDaysUntil(holiday.date)}
                        </Badge>
                        {holiday.type === 'OPTIONAL' && (
                          <Badge variant="outline" className="text-xs">
                            Optional
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Year Holidays */}
      <Card className="shadow-lg border-2 hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-primary" />
                All Holidays
              </CardTitle>
              <CardDescription>
                Browse holidays by year
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const currentIndex = availableYears.indexOf(selectedYear);
                  if (currentIndex > 0) {
                    setSelectedYear(availableYears[currentIndex - 1]);
                  }
                }}
                disabled={availableYears.indexOf(selectedYear) === 0}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Badge variant="default" className="text-sm px-3 py-1">
                {selectedYear}
              </Badge>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const currentIndex = availableYears.indexOf(selectedYear);
                  if (currentIndex < availableYears.length - 1) {
                    setSelectedYear(availableYears[currentIndex + 1]);
                  }
                }}
                disabled={availableYears.indexOf(selectedYear) === availableYears.length - 1}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {yearFilteredHolidays.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No holidays in {selectedYear}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {yearFilteredHolidays.map((holiday, index) => {
                const holidayDate = new Date(holiday.date);
                const isPast = holidayDate < today;
                const isUpcoming = !isPast && holidayDate.getTime() - today.getTime() < 30 * 24 * 60 * 60 * 1000; // Within 30 days
                
                return (
                  <div
                    key={holiday.id}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all duration-300 hover:shadow-md",
                      isPast && "opacity-60 bg-muted/20",
                      !isPast && isUpcoming && "bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-300",
                      !isPast && !isUpcoming && "bg-gradient-to-r from-primary/5 to-primary/10 hover:border-primary/50"
                    )}
                    style={{
                      animationDelay: `${index * 50}ms`,
                      animation: 'slideInLeft 0.5s ease-out forwards'
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="h-4 w-4 flex-shrink-0 text-primary" />
                          <h4 className="font-bold text-sm truncate">{holiday.name}</h4>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium">{formatDate(holiday.date)}</span>
                          <span>•</span>
                          <span>{holiday.day}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {isPast && (
                          <Badge variant="secondary" className="text-xs">
                            Past
                          </Badge>
                        )}
                        {isUpcoming && (
                          <Badge variant="default" className="text-xs bg-orange-500">
                            Soon
                          </Badge>
                        )}
                        {holiday.type === 'OPTIONAL' && (
                          <Badge variant="outline" className="text-xs">
                            Optional
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};
