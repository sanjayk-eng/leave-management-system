/**
 * dateConstants.ts
 *
 * Single source of truth for month/year data used throughout the app.
 * Import from here — never re-define months or year ranges in individual files.
 */

// ── Months ────────────────────────────────────────────────────────────────────

/** Full month list with numeric value (1-based) and display label. */
export const MONTHS: { value: number; label: string }[] = [
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

/**
 * Zero-indexed month name array (index 0 = empty string, 1 = "January" … 12 = "December").
 * Used by PDF templates where months come from backend as 1-based integers.
 */
export const MONTHS_INDEXED: readonly string[] = [
  '', ...MONTHS.map((m) => m.label),
] as const;

/** Return the display label for a 1-based month number. */
export const getMonthLabel = (month: number): string =>
  MONTHS.find((m) => m.value === month)?.label ?? '';

// ── Years ─────────────────────────────────────────────────────────────────────

export const CURRENT_YEAR  = new Date().getFullYear();
export const CURRENT_MONTH = new Date().getMonth() + 1;

/** All years from 2020 up to and including the current year. */
export const YEARS: number[] = Array.from(
  { length: CURRENT_YEAR - 2019 },
  (_, i) => 2020 + i,
);

/**
 * Extended year range: 2 years before current up to 2 years ahead.
 * Used where future/past flexibility is needed (e.g. MyLeaveHistory).
 */
export const YEARS_EXTENDED: number[] = Array.from(
  { length: 5 },
  (_, i) => CURRENT_YEAR - 2 + i,
);
