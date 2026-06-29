import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';

interface LogsFilterProps {
  currentDays: number;
  onFilterChange: (days: number) => void;
  onRefresh: () => void;
  loading: boolean;
}

const PRESET_DAYS = [1, 7, 30, 90];

export const LogsFilter = ({ currentDays, onFilterChange, onRefresh, loading }: LogsFilterProps) => {
  const [customDays, setCustomDays] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handlePresetClick = (days: number) => {
    setShowCustomInput(false);
    setCustomDays('');
    onFilterChange(days);
  };

  const handleCustomSubmit = () => {
    const days = parseInt(customDays);
    if (days > 0) {
      onFilterChange(days);
      setShowCustomInput(false);
      setCustomDays('');
    }
  };

  const handleCustomInputChange = (value: string) => {
    // Only allow positive integers
    if (value === '' || (/^\d+$/.test(value) && parseInt(value) > 0)) {
      setCustomDays(value);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Filter by Days</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_DAYS.map((days) => (
                <Button
                  key={days}
                  variant={currentDays === days ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePresetClick(days)}
                  disabled={loading}
                >
                  {days} {days === 1 ? 'Day' : 'Days'}
                </Button>
              ))}
              <Button
                variant={showCustomInput ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowCustomInput(!showCustomInput)}
                disabled={loading}
              >
                Custom
              </Button>
            </div>
          </div>

          {showCustomInput && (
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">Custom Days</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter days"
                  value={customDays}
                  onChange={(e) => handleCustomInputChange(e.target.value)}
                  className="w-24"
                  disabled={loading}
                />
                <Button
                  size="sm"
                  onClick={handleCustomSubmit}
                  disabled={!customDays || loading}
                >
                  Apply
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:ml-auto">
            <Label className="text-sm font-medium">Actions</Label>
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
      </CardContent>
    </Card>
  );
};