/**
 * MonthYearSelect.tsx
 *
 * Reusable month / year / combined select primitives.
 * Single source of truth — used by LeaveFilter, Payroll, reports, and anywhere
 * else a month or year dropdown is needed.
 *
 * All data comes from @/lib/dateConstants so options are always consistent.
 */

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MONTHS, YEARS, YEARS_EXTENDED } from "@/lib/dateConstants";

// ── MonthSelect ───────────────────────────────────────────────────────────────

export interface MonthSelectProps {
  /** 1-based month number (1 = January … 12 = December) */
  value: number;
  onChange: (month: number) => void;
  disabled?: boolean;
  /** Tailwind width class, e.g. "w-40". Defaults to "w-40". */
  className?: string;
  placeholder?: string;
}

export const MonthSelect: React.FC<MonthSelectProps> = ({
  value,
  onChange,
  disabled = false,
  className = "w-40",
  placeholder = "Select month",
}) => (
  <Select
    value={String(value)}
    onValueChange={(v) => onChange(Number(v))}
    disabled={disabled}
  >
    <SelectTrigger className={className}>
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent>
      {MONTHS.map((m) => (
        <SelectItem key={m.value} value={String(m.value)}>
          {m.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

// ── YearSelect ────────────────────────────────────────────────────────────────

export interface YearSelectProps {
  /** Full year number, e.g. 2025 */
  value: number;
  onChange: (year: number) => void;
  disabled?: boolean;
  /** "standard" = 2020 → current year (default). "extended" = ±2 years around current. */
  range?: "standard" | "extended";
  /** Tailwind width class. Defaults to "w-28". */
  className?: string;
  placeholder?: string;
}

export const YearSelect: React.FC<YearSelectProps> = ({
  value,
  onChange,
  disabled = false,
  range = "standard",
  className = "w-28",
  placeholder = "Select year",
}) => {
  const years = range === "extended" ? YEARS_EXTENDED : YEARS;
  return (
    <Select
      value={String(value)}
      onValueChange={(v) => onChange(Number(v))}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {years.map((y) => (
          <SelectItem key={y} value={String(y)}>
            {y}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

// ── MonthYearSelect ───────────────────────────────────────────────────────────
// Convenience wrapper that renders both selects side-by-side.

export interface MonthYearSelectProps {
  month: number;
  year: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  disabled?: boolean;
  range?: "standard" | "extended";
  monthClassName?: string;
  yearClassName?: string;
}

export const MonthYearSelect: React.FC<MonthYearSelectProps> = ({
  month,
  year,
  onMonthChange,
  onYearChange,
  disabled = false,
  range = "standard",
  monthClassName,
  yearClassName,
}) => (
  <>
    <MonthSelect
      value={month}
      onChange={onMonthChange}
      disabled={disabled}
      className={monthClassName}
    />
    <YearSelect
      value={year}
      onChange={onYearChange}
      disabled={disabled}
      range={range}
      className={yearClassName}
    />
  </>
);
