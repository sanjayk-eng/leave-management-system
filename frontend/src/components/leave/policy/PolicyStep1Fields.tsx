// Step 1 of the policy form wizard: name, entitlements, paid/early/WFH toggles.
// Preview is fetched by the parent (PolicyFormDialog) and passed in as props.

import { Button } from '@/components/ui/button';
import { Input }  from '@/components/ui/input';
import { Label }  from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge }  from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { PolicyAllocationPreview } from '@/services/leaveService';
import type { PolicyFormValues } from './PolicyFormTypes';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/** Format a prorated value: show one decimal only when it's .5, otherwise whole number */
function fmtDays(val: number): string {
  // val is already rounded to nearest 0.5 by backend
  return val % 1 === 0 ? String(val) : val.toFixed(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// ProrationVisualiser
// ─────────────────────────────────────────────────────────────────────────────
interface VisualiserProps {
  preview:       PolicyAllocationPreview;
  selectedMonth: number;
  currentMonth:  number;
  onMonthChange: (m: number) => void;
}

const ProrationVisualiser = ({
  preview, selectedMonth, currentMonth, onMonthChange,
}: VisualiserProps) => {
  const elapsed   = preview.elapsed_months;   // months before selected month
  const remaining = preview.remaining_months; // months including + after selected month
  const total     = 12;

  const elapsedPct   = (elapsed / total) * 100;
  const remainingPct = (remaining / total) * 100;

  const showIntern =
    preview.prorated_intern    != null &&
    preview.intern_entitlement != null;

  const rows = [
    {
      label:     'Employee',
      annual:    preview.default_entitlement,
      prorated:  preview.prorated_default,
      barColor:  'bg-primary',
      textColor: 'text-primary',
      badgeCls:  'bg-primary/10 text-primary border-primary/20',
    },
    ...(showIntern ? [{
      label:     'Intern',
      annual:    preview.intern_entitlement as number,
      prorated:  preview.prorated_intern    as number,
      barColor:  'bg-violet-500',
      textColor: 'text-violet-500',
      badgeCls:  'bg-violet-500/10 text-violet-600 border-violet-200',
    }] : []),
  ];

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <span className="text-xs font-semibold text-foreground">
          Allocation preview
        </span>
        <div className="flex items-center gap-2">
          {preview.is_current_month && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-green-400 text-green-600">
              Today
            </Badge>
          )}
          {/* Month selector */}
          <Select
            value={String(selectedMonth)}
            onValueChange={v => onMonthChange(Number(v))}
          >
            <SelectTrigger className="h-6 text-[11px] w-28 px-2 py-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((name, i) => {
                const m = i + 1;
                const isCurrent = m === currentMonth;
                return (
                  <SelectItem key={m} value={String(m)} className="text-xs">
                    <span className="flex items-center gap-1.5">
                      {name}
                      {isCurrent && (
                        <span className="text-[9px] text-green-600 font-medium">← now</span>
                      )}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="p-3 space-y-3">

        {/* ── 12-month calendar strip ───────────────────────────────────────── */}
        <div className="space-y-1">
          <div className="flex h-6 w-full rounded-md overflow-hidden gap-[1px] bg-border">
            {MONTH_SHORT.map((m, i) => {
              const monthNum = i + 1;
              const isElapsed  = monthNum < selectedMonth;
              const isSelected = monthNum === selectedMonth;
              const isFuture   = monthNum > selectedMonth;
              const isActualNow = monthNum === currentMonth;
              return (
                <button
                  key={m}
                  type="button"
                  title={MONTH_NAMES[i]}
                  onClick={() => onMonthChange(monthNum)}
                  className={[
                    'flex-1 flex items-center justify-center text-[9px] font-medium transition-colors cursor-pointer',
                    isElapsed  ? 'bg-muted text-muted-foreground/40 hover:bg-muted/80' : '',
                    isSelected ? 'bg-primary text-primary-foreground' : '',
                    isFuture   ? 'bg-primary/10 text-primary/70 hover:bg-primary/20' : '',
                    isActualNow && !isSelected ? 'ring-1 ring-inset ring-green-400' : '',
                  ].join(' ')}
                >
                  {m[0]}
                </button>
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-sm bg-muted border" />
              Elapsed ({elapsed} mo)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-sm bg-primary" />
              Creation month
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-sm bg-primary/10 border border-primary/20" />
              Allocated ({remaining} mo)
            </span>
          </div>
        </div>

        {/* ── Per-role allocation bars ──────────────────────────────────────── */}
        <div className="space-y-3">
          {rows.map(row => {
            const pct = total > 0 ? Math.round((row.prorated / row.annual) * 100) : 0;
            return (
              <div key={row.label} className="space-y-1">
                {/* Label + value */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">{row.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-bold ${row.textColor}`}>
                      {fmtDays(row.prorated)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      / {row.annual} days
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] h-4 px-1 ${row.badgeCls}`}
                    >
                      {pct}%
                    </Badge>
                  </div>
                </div>
                {/* Proportional bar */}
                <div className="relative h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  {/* Elapsed portion (dark) */}
                  <div
                    className="absolute inset-y-0 left-0 bg-muted-foreground/20 rounded-l-full"
                    style={{ width: `${elapsedPct}%` }}
                  />
                  {/* Allocated portion (coloured) */}
                  <div
                    className={`absolute inset-y-0 ${row.barColor} rounded-r-full transition-all duration-500`}
                    style={{ left: `${elapsedPct}%`, width: `${remainingPct}%` }}
                  />
                </div>
                {/* Formula */}
                <p className="text-[10px] text-muted-foreground/60 text-right">
                  {row.annual} × {remaining}/12 = {fmtDays(row.prorated)} days
                </p>
              </div>
            );
          })}
        </div>

        {/* ── Year proportion strip ─────────────────────────────────────────── */}
        <div className="space-y-1 pt-1 border-t border-border/40">
          <p className="text-[10px] font-medium text-muted-foreground">
            Year coverage
          </p>
          <div className="flex h-4 w-full rounded-md overflow-hidden text-[9px] font-semibold">
            <div
              className="bg-muted flex items-center justify-center text-muted-foreground/50 shrink-0"
              style={{ width: `${elapsedPct}%` }}
            >
              {elapsedPct >= 15 ? `${Math.round(elapsedPct)}%` : ''}
            </div>
            <div
              className="bg-primary/20 flex items-center justify-center text-primary shrink-0"
              style={{ width: `${remainingPct}%` }}
            >
              {remainingPct >= 15 ? `${Math.round(remainingPct)}%` : ''}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground/50">
            Employees who joined in a prior year receive the full annual amount.
            New employees are prorated from their own joining month.
          </p>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
interface Props {
  form:          PolicyFormValues;
  isValid:       boolean;
  preview:       PolicyAllocationPreview | null;
  previewLoad:   boolean;
  selectedMonth: number;
  onMonthChange: (m: number) => void;
  onPatch:       (partial: Partial<PolicyFormValues>) => void;
  onNext:        () => void;
  onCancel:      () => void;
}

export const PolicyStep1Fields = ({
  form, isValid, preview, previewLoad, selectedMonth, onMonthChange,
  onPatch, onNext, onCancel,
}: Props) => {
  const suggestedIntern = form.default_entitlement
    ? Math.floor(Number(form.default_entitlement) / 1.5)
    : 0;

  const showPreviewArea = !form.is_early && !!form.default_entitlement;
  const currentMonth    = new Date().getMonth() + 1;

  return (
    <div className="space-y-4 py-4 px-1">

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="pf-name">Policy Name</Label>
        <Input
          id="pf-name"
          placeholder="e.g., Annual Leave"
          value={form.name}
          onChange={e => onPatch({ name: e.target.value })}
          autoFocus
        />
      </div>

      {/* Employee entitlement */}
      <div className="space-y-1.5">
        <Label htmlFor="pf-entitlement">Annual Days — Employee</Label>
        <Input
          id="pf-entitlement"
          type="number"
          min={0}
          placeholder="18"
          value={form.default_entitlement}
          onChange={e => onPatch({ default_entitlement: e.target.value })}
        />
      </div>

      {/* Intern entitlement */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="pf-intern">Annual Days — Intern</Label>
          {form.default_entitlement && (
            <span className="text-xs text-violet-500">
              Suggested: <span className="font-semibold">{suggestedIntern}</span> days
            </span>
          )}
        </div>
        <Input
          id="pf-intern"
          type="number"
          min={0}
          placeholder={form.default_entitlement ? String(suggestedIntern) : '12'}
          value={form.intern_entitlement}
          onChange={e => onPatch({ intern_entitlement: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Optional — leave blank to use suggested value
        </p>
      </div>

      {/* ── Proration visualiser ───────────────────────────────────────────── */}
      {showPreviewArea && (
        <>
          {previewLoad && (
            <div className="rounded-xl border bg-muted/40 p-3 flex items-center gap-2 text-xs text-muted-foreground min-h-[48px]">
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              Calculating allocation…
            </div>
          )}
          {!previewLoad && preview && (
            <ProrationVisualiser
              preview={preview}
              selectedMonth={selectedMonth}
              currentMonth={currentMonth}
              onMonthChange={onMonthChange}
            />
          )}
        </>
      )}

      {/* Early-leave notice */}
      {form.is_early && form.default_entitlement && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
          Early Leave policies skip balance allocation — proration does not apply.
        </div>
      )}

      {/* Toggles */}
      <div className="flex items-center gap-6 flex-wrap pt-1">
        <div className="flex items-center space-x-2">
          <Switch
            id="pf-paid"
            checked={form.is_paid}
            onCheckedChange={checked => onPatch({ is_paid: checked })}
          />
          <Label htmlFor="pf-paid">Paid Leave</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="pf-early"
            checked={form.is_early}
            onCheckedChange={checked =>
              onPatch({ is_early: checked, is_work_from_home: checked ? false : form.is_work_from_home })
            }
          />
          <Label htmlFor="pf-early">Early Leave</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="pf-wfh"
            checked={form.is_work_from_home}
            onCheckedChange={checked =>
              onPatch({ is_work_from_home: checked, is_early: checked ? false : form.is_early })
            }
          />
          <Label htmlFor="pf-wfh">Work From Home</Label>
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="button" className="flex-1" disabled={!isValid} onClick={onNext}>
          Next →
        </Button>
      </div>
    </div>
  );
};
