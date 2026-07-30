// Shared constants used by all leave report pages.

export const REPORT_MONTHS = [
  { value: 1,  label: 'January'   },
  { value: 2,  label: 'February'  },
  { value: 3,  label: 'March'     },
  { value: 4,  label: 'April'     },
  { value: 5,  label: 'May'       },
  { value: 6,  label: 'June'      },
  { value: 7,  label: 'July'      },
  { value: 8,  label: 'August'    },
  { value: 9,  label: 'September' },
  { value: 10, label: 'October'   },
  { value: 11, label: 'November'  },
  { value: 12, label: 'December'  },
];

export const REPORT_CURRENT_YEAR  = new Date().getFullYear();
export const REPORT_CURRENT_MONTH = new Date().getMonth() + 1;
export const REPORT_YEARS = Array.from(
  { length: REPORT_CURRENT_YEAR - 2019 },
  (_, i) => 2020 + i,
);

export const REPORT_ROLES = ['EMPLOYEE', 'INTERN', 'MANAGER', 'HR', 'ADMIN', 'SUPERADMIN'];

export const ROLE_BADGE_CLASSES: Record<string, string> = {
  SUPERADMIN: 'bg-purple-100 text-purple-700 border-purple-200',
  ADMIN:      'bg-blue-100   text-blue-700   border-blue-200',
  HR:         'bg-indigo-100 text-indigo-700 border-indigo-200',
  MANAGER:    'bg-cyan-100   text-cyan-700   border-cyan-200',
  INTERN:     'bg-orange-100 text-orange-700 border-orange-200',
  EMPLOYEE:   'bg-gray-100   text-gray-700   border-gray-200',
};

export const roleBadgeClass = (role: string): string =>
  ROLE_BADGE_CLASSES[role] ?? 'bg-gray-100 text-gray-700 border-gray-200';

export const monthLabel = (m: number): string =>
  REPORT_MONTHS.find((x) => x.value === m)?.label ?? '';

/** Format a leave/day number: null for 0, integer string, or 1-decimal string. */
export const fmtLeaveNum = (n: number): string | null =>
  n === 0 ? null : n % 1 === 0 ? String(n) : n.toFixed(1);

/** Stable colour palette for per-policy columns (cycles after 8). */
export const POLICY_COLOURS = [
  { used: 'bg-blue-100 text-blue-700',       bal: 'bg-blue-50 text-blue-600'       },
  { used: 'bg-emerald-100 text-emerald-700', bal: 'bg-emerald-50 text-emerald-600' },
  { used: 'bg-violet-100 text-violet-700',   bal: 'bg-violet-50 text-violet-600'   },
  { used: 'bg-amber-100 text-amber-700',     bal: 'bg-amber-50 text-amber-600'     },
  { used: 'bg-rose-100 text-rose-700',       bal: 'bg-rose-50 text-rose-600'       },
  { used: 'bg-teal-100 text-teal-700',       bal: 'bg-teal-50 text-teal-600'       },
  { used: 'bg-pink-100 text-pink-700',       bal: 'bg-pink-50 text-pink-600'       },
  { used: 'bg-cyan-100 text-cyan-700',       bal: 'bg-cyan-50 text-cyan-600'       },
] as const;

/** Returns the Monday–Sunday bounds of the current ISO week as month/year pairs. */
export function currentWeekBounds() {
  const now  = new Date();
  const day  = now.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  const mon  = new Date(now);
  mon.setDate(now.getDate() + diff);
  const sun  = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    fromMonth: mon.getMonth() + 1, fromYear: mon.getFullYear(),
    toMonth:   sun.getMonth() + 1, toYear:   sun.getFullYear(),
  };
}
