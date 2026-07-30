import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { MonthSelect, YearSelect } from '@/components/ui/MonthYearSelect';
import { RefreshCw, Calendar } from 'lucide-react';
import { getMonthLabel } from '@/lib/dateConstants';

interface LeaveFilterProps {
  currentMonth: number;
  currentYear: number;
  onFilterChange: (month: number, year: number) => void;
  onRefresh: () => void;
  loading: boolean;
  totalCount: number;
}


export const LeaveFilter = ({ 
  currentMonth, 
  currentYear, 
  onFilterChange, 
  onRefresh, 
  loading,
  totalCount 
}: LeaveFilterProps) => {
  const goToCurrentMonth = () => {
    const now = new Date();
    onFilterChange(now.getMonth() + 1, now.getFullYear());
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          {/* Month Filter */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Filter by Month
            </Label>
            <MonthSelect
              value={currentMonth}
              onChange={(m) => onFilterChange(m, currentYear)}
              disabled={loading}
            />
          </div>

          {/* Year Filter */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Filter by Year</Label>
            <YearSelect
              value={currentYear}
              onChange={(y) => onFilterChange(currentMonth, y)}
              disabled={loading}
            />
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Quick Actions</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={goToCurrentMonth}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Current Month
            </Button>
          </div>

          {/* Actions and Summary */}
          <div className="flex flex-col gap-2 lg:ml-auto">
            <Label className="text-sm font-medium">Summary</Label>
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">
                {totalCount} {totalCount === 1 ? 'leave' : 'leaves'} • 
                {getMonthLabel(currentMonth)} {currentYear}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};