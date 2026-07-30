// Shared calendar utilities and constants

export interface Leave {
  id: string;
  employee: string;
  leave_type: string;
  leave_timing_type?: string;
  leave_timing?: string;
  start_date: string;
  end_date: string;
  days: number;
  status: string;
  reason?: string;
  approval_name?: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  day: string;
  type: string;
  created_at: string;
  updated_at: string;
}

export interface LeaveColors {
  color: string;
  gradient?: string;
  hoverColor?: string;
  textColor: string;
  borderColor: string;
  shadow?: string;
}

// Dynamic leave type color mapping
const LEAVE_TYPE_MAP = [
  { 
    keywords: ['casual', 'cl'], 
    color: 'bg-blue-500', 
    gradient: 'from-blue-500 to-blue-600',
    hoverColor: 'hover:bg-blue-600',
    textColor: 'text-blue-600', 
    borderColor: 'border-blue-500',
    shadow: 'shadow-blue-500/50'
  },
  { 
    keywords: ['wfh', 'work from home', 'remote'], 
    color: 'bg-purple-500', 
    gradient: 'from-purple-500 to-purple-600',
    hoverColor: 'hover:bg-purple-600',
    textColor: 'text-purple-600', 
    borderColor: 'border-purple-500',
    shadow: 'shadow-purple-500/50'
  },
  { 
    keywords: ['annual', 'vacation'], 
    color: 'bg-indigo-500', 
    gradient: 'from-indigo-500 to-indigo-600',
    hoverColor: 'hover:bg-indigo-600',
    textColor: 'text-indigo-600', 
    borderColor: 'border-indigo-500',
    shadow: 'shadow-indigo-500/50'
  },
  { 
    keywords: ['maternity', 'paternity'], 
    color: 'bg-pink-500', 
    gradient: 'from-pink-500 to-pink-600',
    hoverColor: 'hover:bg-pink-600',
    textColor: 'text-pink-600', 
    borderColor: 'border-pink-500',
    shadow: 'shadow-pink-500/50'
  },
];

export const getLeaveColor = (leaveType: string, status: string): LeaveColors => {
  const statusUpper = status.toUpperCase();
  
  // Status-based colors (take priority)
  if (statusUpper === 'PENDING') return {
    color: 'bg-yellow-500',
    gradient: 'from-yellow-500 to-yellow-600',
    hoverColor: 'hover:bg-yellow-600',
    textColor: 'text-yellow-600',
    borderColor: 'border-yellow-500',
    shadow: 'shadow-yellow-500/50'
  };

  if (statusUpper === 'REJECTED') return {
    color: 'bg-gray-500',
    gradient: 'from-gray-500 to-gray-600',
    hoverColor: 'hover:bg-gray-600',
    textColor: 'text-gray-600',
    borderColor: 'border-gray-500',
    shadow: 'shadow-gray-500/50'
  };
  
  if (statusUpper === 'CANCELLED') return {
    color: 'bg-orange-500',
    gradient: 'from-orange-500 to-orange-600',
    hoverColor: 'hover:bg-orange-600',
    textColor: 'text-orange-600',
    borderColor: 'border-orange-500',
    shadow: 'shadow-orange-500/50'
  };
  
  if (statusUpper === 'WITHDRAWN') return {
    color: 'bg-amber-600',
    gradient: 'from-amber-600 to-amber-700',
    hoverColor: 'hover:bg-amber-700',
    textColor: 'text-amber-600',
    borderColor: 'border-amber-600',
    shadow: 'shadow-amber-600/50'
  };

  if (statusUpper === 'WITHDRAWAL_PENDING') return {
    color: 'bg-purple-500',
    gradient: 'from-purple-500 to-purple-600',
    hoverColor: 'hover:bg-purple-600',
    textColor: 'text-purple-600',
    borderColor: 'border-purple-500',
    shadow: 'shadow-purple-500/50'
  };
  
  // For APPROVED status, use leave type colors
  if (statusUpper === 'APPROVED') {
    const lowerType = leaveType.toLowerCase();
    const matchedType = LEAVE_TYPE_MAP.find(type => 
      type.keywords.some(keyword => lowerType.includes(keyword))
    );
    
    return matchedType || {
      color: 'bg-green-500',
      gradient: 'from-green-500 to-green-600',
      hoverColor: 'hover:bg-green-600',
      textColor: 'text-green-600',
      borderColor: 'border-green-500',
      shadow: 'shadow-green-500/50'
    };
  }
  
  // Default fallback
  return {
    color: 'bg-gray-400',
    gradient: 'from-gray-400 to-gray-500',
    hoverColor: 'hover:bg-gray-500',
    textColor: 'text-gray-600',
    borderColor: 'border-gray-400',
    shadow: 'shadow-gray-500/50'
  };
};

// Helper to get date string in IST
export const getDateStringIST = (date: Date): string => {
  return date.toLocaleDateString('en-CA', { 
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

// Helper to check if date has leave
export const getLeavesForDate = (date: Date | null, leaves: Leave[]): Leave[] => {
  if (!date || !leaves || !Array.isArray(leaves)) return [];
  const dateStr = getDateStringIST(date);
  
  return leaves.filter(leave => {
    const startDateStr = leave.start_date.split('T')[0];
    const endDateStr = leave.end_date.split('T')[0];
    return dateStr >= startDateStr && dateStr <= endDateStr;
  });
};

// Helper to check if date is holiday
export const getHolidayForDate = (date: Date | null, holidays: Holiday[]): Holiday | null => {
  if (!date || !holidays || !Array.isArray(holidays)) return null;
  const dateStr = getDateStringIST(date);
  const holiday = holidays.find(h => {
    const holidayDateStr = h.date.split('T')[0];
    return holidayDateStr === dateStr;
  });
  return holiday;
};

// Helper to check if date is weekend
export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

// Helper to get birthdays for a specific date (match month+day)
export const getBirthdaysForDate = <T extends { id: string; name: string; birth_date?: string }>(
  date: Date | null,
  birthdays: T[]
): T[] => {
  if (!date || !birthdays || !Array.isArray(birthdays)) return [];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return birthdays.filter(b => {
    if (!b.birth_date) return false;
    const bd = new Date(b.birth_date);
    return bd.getMonth() + 1 === month && bd.getDate() === day;
  });
};

// Helper to format date
export const formatDateDisplay = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
};

// Shared status badge class helper (single source of truth)
export const getStatusBadgeClass = (status: string): string => {
  switch (status.toUpperCase()) {
    case 'APPROVED':           return 'bg-green-600 text-white hover:bg-green-700';
    case 'PENDING':            return 'bg-yellow-500 text-white hover:bg-yellow-600';
    case 'REJECTED':           return 'bg-gray-500 text-white hover:bg-gray-600';
    case 'CANCELLED':          return 'bg-orange-500 text-white hover:bg-orange-600';
    case 'WITHDRAWN':          return 'bg-amber-600 text-white hover:bg-amber-700';
    case 'WITHDRAWAL_PENDING': return 'bg-purple-500 text-white hover:bg-purple-600';
    default:                   return 'bg-gray-400 text-white';
  }
};

// Human-readable status labels (single source of truth)
export const STATUS_LABELS: Record<string, string> = {
  WITHDRAWAL_PENDING: 'Withdrawal Pending',
};

// Leave type legend entries for the calendar legend UI
export const LEAVE_TYPE_LEGEND = [
  { name: 'Casual Leave (CL)',     color: 'bg-blue-500',   category: 'Leave Types' },
  { name: 'Work From Home (WFH)',  color: 'bg-purple-500', category: 'Leave Types' },
  { name: 'Other Approved',        color: 'bg-green-500',  category: 'Leave Types' },
  { name: 'Pending',               color: 'bg-yellow-500', category: 'Status'      },
  { name: 'Cancelled',             color: 'bg-orange-500', category: 'Status'      },
  { name: 'Withdrawn',             color: 'bg-amber-600',  category: 'Status'      },
  { name: 'Rejected',              color: 'bg-gray-500',   category: 'Status'      },
  { name: 'Public Holiday',        color: 'bg-rose-600',   category: 'Special'     },
  { name: 'Weekend',               color: 'bg-gray-300',   category: 'Special'     },
] as const;
