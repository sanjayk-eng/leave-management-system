import React from 'react';
import { Clock } from 'lucide-react';
import { Badge } from './ui/badge';

interface LeaveTimingDisplayProps {
  timingType?: string;
  timing?: string;
  variant?: 'default' | 'compact' | 'badge';
  showIcon?: boolean;
}

export const LeaveTimingDisplay: React.FC<LeaveTimingDisplayProps> = ({
  timingType,
  timing,
  variant = 'default',
  showIcon = true
}) => {
  const getTimingLabel = (type: string) => {
    switch (type) {
      case 'FIRST_HALF':
        return 'First Half';
      case 'SECOND_HALF':
        return 'Second Half';
      case 'FULL':
        return 'Full Day';
      case 'EARLY':
        return 'Early Leave';
      default:
        return type;
    }
  };

  const getTimingColor = (type: string) => {
    switch (type) {
      case 'FIRST_HALF':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'SECOND_HALF':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'FULL':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'EARLY':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  // If no timing data, show default
  if (!timingType || !timing) {
    if (variant === 'badge') {
      return (
        <Badge variant="secondary" className="text-xs">
          {showIcon && <Clock className="h-3 w-3 mr-1" />}
          Full Day
        </Badge>
      );
    }
    
    if (variant === 'compact') {
      return (
        <span className="text-muted-foreground text-sm flex items-center gap-1">
          {showIcon && <Clock className="h-3 w-3" />}
          Full Day
        </span>
      );
    }
    
    return (
      <div className="flex items-center gap-2">
        {showIcon && <Clock className="h-4 w-4 text-muted-foreground" />}
        <span className="text-muted-foreground text-sm">Full Day</span>
      </div>
    );
  }

  // Render based on variant
  if (variant === 'badge') {
    return (
      <Badge className={`text-xs ${getTimingColor(timingType)}`}>
        {showIcon && <Clock className="h-3 w-3 mr-1" />}
        {getTimingLabel(timingType)}
      </Badge>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1">
        {showIcon && <Clock className="h-3 w-3 text-indigo-600" />}
        <div className="flex flex-col">
          <span className="font-medium text-xs">{getTimingLabel(timingType)}</span>
          <span className="text-xs text-muted-foreground">{timing}</span>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className="flex items-center gap-2">
      {showIcon && <Clock className="h-4 w-4 text-indigo-600" />}
      <div className="flex flex-col">
        <span className="font-medium text-sm">{getTimingLabel(timingType)}</span>
        <span className="text-xs text-muted-foreground">{timing}</span>
      </div>
    </div>
  );
};