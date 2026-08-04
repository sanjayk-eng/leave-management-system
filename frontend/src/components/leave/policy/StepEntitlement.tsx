// Step 3 — Entitlements + proration preview
// Only shown when is_early = false.

import { useState }   from 'react';
import { Button }     from '@/components/ui/button';
import { Input }      from '@/components/ui/input';
import { Label }      from '@/components/ui/label';
import { Badge }      from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, CalendarCheck, Info, AlertTriangle } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { PolicyAllocationPreview } from '@/services/leaveService';
import type { PolicyFormValues }        from './PolicyFormTypes';

// ─────────────────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const fmtDays = (v: number) => v % 1 === 0 ? String(v) : v.toFixed(1);

// ─────────────────────────────────────────────────────────────────────────────
// Warning dialog — shown when user changes associate_month on an existing policy
// ─────────────────────────────────────────────────────────────────────────────
interface WarnProps {
  open:         boolean;
  fromMonth:    number;
  toMonth:      number;
  onConfirm:    () => void;
  onCancel:     () => void;
}

const MonthChangeWarning = ({ open, fromMonth, toMonth, onConfirm, onCancel }: WarnProps) => (
  <Dialog open={open} onOpenChange={v => { if (!v) onCancel(); }}>
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-amber-500">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Allocation month change
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-3 text-sm">
        {/* What will happen */}
        <p className="text-muted-foreground leading-relaxed">
          You are changing the allocation basis month from{' '}
          <span className="font-semibold text-foreground">{MONTH_NAMES[fromMonth - 1]}</span>
          {' '}to{' '}
          <span className="font-semibold text-foreground">{MONTH_NAMES[toMonth - 1]}</span>.
        </p>

        {/* Impact disclaimer */}
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/5 p-3 space-y-1.5">
          <p className="text-xs font-semibold text-amber-500 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Balance recalculation disclaimer
          </p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside leading-relaxed">
            <li>
              All existing employee leave balances for this policy will be
              <span className="font-medium text-foreground"> recalculated</span> using{' '}
              <span className="font-medium text-foreground">{MONTH_NAMES[toMonth - 1]}</span> as the new anchor.
            </li>
            <li>
              Employees who had more days under the previous month{' '}
              <span className="text-destructive font-medium">may see a reduction</span> in their opening balance.
            </li>
            <li>
              Leaves already taken are preserved — only the opening balance is adjusted.
            </li>
            <li>
              Manual adjustments are kept as-is.
            </li>
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          This action cannot be undone without manually re-adjusting each employee balance.
          Proceed only if you intended to change the proration anchor.
        </p>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={onConfirm}
          className="flex-1"
        >
          Yes, recalculate balances
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// ─────────────────────────────────────────────────────────────────────────────
// Proration Visualiser
// ─────────────────────────────────────────────────────────────────────────────
interface VisProps {
  preview:        PolicyAllocationPreview;
  selectedMonth:  number;
  currentMonth:   number;
  isEdit:         boolean;
  originalMonth:  number | null; // stored month from DB (edit only)
  isMonthChanged: boolean;       // user changed the month from original
  onMonthChange:  (m: number) => void;
}

const ProrationVisualiser = ({
  preview, selectedMonth, currentMonth, isEdit, originalMonth, isMonthChanged, onMonthChange,
}: VisProps) => {
  const elapsed      = preview.elapsed_months;
  const remaining    = preview.remaining_months;
  const total        = 12;
  const elapsedPct   = (elapsed / total) * 100;
  const remainingPct = (remaining / total) * 100;

  const showIntern = preview.prorated_intern != null && preview.intern_entitlement != null;

  const rows = [
    {
      label:    'Employee',
      annual:   preview.default_entitlement,
      prorated: preview.prorated_default,
      bar:      'bg-primary',
      text:     'text-primary',
      badge:    'bg-primary/10 text-primary border-primary/20',
    },
    ...(showIntern ? [{
      label:    'Intern',
      annual:   preview.intern_entitlement as number,
      prorated: preview.prorated_intern    as number,
      bar:      'bg-violet-500',
      text:     'text-violet-500',
      badge:    'bg-violet-500/10 text-violet-600 border-violet-200',
    }] : []),
  ];

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-1.5">
          <CalendarCheck className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">Allocation preview</span>
          {isEdit && isMonthChanged && (
            <Badge className="text-[9px] h-4 px-1.5 bg-amber-500/10 text-amber-600 border border-amber-400/40 rounded-full">
              changed
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Create: show "Today" when on current month. Edit: never show Today badge. */}
          {!isEdit && preview.is_current_month && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-green-400 text-green-600">
              Today
            </Badge>
          )}
          <Select value={String(selectedMonth)} onValueChange={v => onMonthChange(Number(v))}>
            <SelectTrigger className="h-6 text-[11px] w-28 px-2 py-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((name, i) => (
                <SelectItem key={i + 1} value={String(i + 1)} className="text-xs">
                  <span className="flex items-center gap-1.5">
                    {name}
                    {/* Create: mark today's month */}
                    {!isEdit && i + 1 === currentMonth && (
                      <span className="text-[9px] text-green-600 font-medium">← now</span>
                    )}
                    {/* Edit: mark the original stored month */}
                    {isEdit && originalMonth !== null && i + 1 === originalMonth && (
                      <span className="text-[9px] text-primary font-medium">← saved</span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Callout: differs by mode ─────────────────────────────────────── */}
      {!isEdit ? (
        /* CREATE: informational — this month is the allocation anchor */
        <div className="mx-3 mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 flex items-start gap-2">
          <CalendarCheck className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-primary leading-tight">
              Policy creation month — {MONTH_NAMES[selectedMonth - 1]}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
              Existing employees will receive prorated days calculated from this month.
              The allocation below shows exactly what each employee will receive.
            </p>
          </div>
        </div>
      ) : isMonthChanged ? (
        /* EDIT + changed: amber warning callout */
        <div className="mx-3 mt-3 rounded-lg border border-amber-400/40 bg-amber-500/5 px-3 py-2 flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-amber-500 leading-tight">
              Allocation month changed → {MONTH_NAMES[selectedMonth - 1]}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
              Saving will recalculate all employee balances using this month as the new anchor.
              Employees who had more days before may see a reduction.
            </p>
          </div>
        </div>
      ) : (
        /* EDIT + unchanged: neutral — shows the stored month */
        <div className="mx-3 mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 flex items-start gap-2">
          <CalendarCheck className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-primary leading-tight">
              Allocation month — {MONTH_NAMES[selectedMonth - 1]}
              <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">(saved)</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
              This is the month used when balances were originally calculated.
              Changing it will trigger a full recalculation for all employees.
            </p>
          </div>
        </div>
      )}

      <div className="p-3 space-y-3">

        {/* ── 12-month strip ──────────────────────────────────────────────── */}
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground">
            Allocation basis — click to change
          </p>
          <div className="flex h-7 w-full rounded-md overflow-hidden gap-[1px] bg-border">
            {MONTH_SHORT.map((m, i) => {
              const mn           = i + 1;
              const isSelected   = mn === selectedMonth;
              const isElapsed    = mn < selectedMonth;
              const isAllocated  = mn > selectedMonth;
              const isToday      = mn === currentMonth;
              const isOriginal   = isEdit && originalMonth !== null && mn === originalMonth && !isSelected;

              return (
                <button
                  key={m}
                  type="button"
                  title={[
                    MONTH_NAMES[i],
                    isToday     && !isEdit    ? '(today)'          : '',
                    isOriginal               ? '(saved month)'     : '',
                    isSelected               ? '— allocation start' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => onMonthChange(mn)}
                  className={[
                    'flex-1 flex flex-col items-center justify-center transition-colors cursor-pointer relative',
                    isElapsed  ? 'bg-muted text-muted-foreground/40 hover:bg-muted/80' : '',
                    isSelected ? 'bg-primary text-primary-foreground'                  : '',
                    isAllocated? 'bg-primary/10 text-primary/70 hover:bg-primary/20'  : '',
                    // Today ring (create only)
                    isToday && !isSelected && !isEdit ? 'ring-1 ring-inset ring-green-400' : '',
                    // Original/saved ring (edit only, when not also selected)
                    isOriginal ? 'ring-1 ring-inset ring-primary/60' : '',
                    // Changed: amber ring on selected when it differs from original
                    isSelected && isEdit && isMonthChanged ? 'bg-amber-500 text-white' : '',
                  ].join(' ')}
                >
                  <span className="text-[9px] font-medium leading-none">{m[0]}</span>
                  {isSelected && (
                    <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-white/60" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-muted border inline-block" />
              Elapsed ({elapsed} mo)
            </span>
            <span className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-sm inline-block ${isEdit && isMonthChanged ? 'bg-amber-500' : 'bg-primary'}`} />
              {isEdit && isMonthChanged ? 'New start' : 'Allocation start'}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-primary/10 border border-primary/20 inline-block" />
              Allocated ({remaining} mo)
            </span>
            {isEdit && originalMonth !== null && originalMonth !== selectedMonth && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm border border-primary/60 inline-block" />
                Previous saved
              </span>
            )}
            {!isEdit && currentMonth !== selectedMonth && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm border border-green-400 inline-block" />
                Today
              </span>
            )}
          </div>
        </div>

        {/* ── Per-role rows ─────────────────────────────────────────────────── */}
        <div className="space-y-3">
          {rows.map(row => {
            const pct = total > 0 ? Math.round((row.prorated / row.annual) * 100) : 0;
            return (
              <div key={row.label} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-foreground">{row.label}</span>
                    <Badge variant="outline" className={`text-[10px] h-4 px-1 ${row.badge}`}>
                      {pct}%
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-bold tabular-nums ${row.text}`}>
                      {fmtDays(row.prorated)}
                    </span>
                    <span className="text-xs text-muted-foreground">/ {row.annual} days</span>
                  </div>
                </div>

                <div className="relative h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-muted-foreground/20 rounded-l-full"
                    style={{ width: `${elapsedPct}%` }}
                  />
                  <div
                    className={`absolute inset-y-0 ${isEdit && isMonthChanged ? 'bg-amber-500' : row.bar} rounded-r-full transition-all duration-500`}
                    style={{ left: `${elapsedPct}%`, width: `${remainingPct}%` }}
                  />
                </div>

                <p className="text-[10px] text-muted-foreground/60 text-right tabular-nums">
                  {row.annual} × {remaining}/12 ={' '}
                  <span className={`font-semibold ${row.text}`}>{fmtDays(row.prorated)}</span> days
                </p>
              </div>
            );
          })}
        </div>

        {/* ── Year coverage ─────────────────────────────────────────────────── */}
        <div className="space-y-1 pt-1 border-t border-border/40">
          <p className="text-[10px] font-medium text-muted-foreground">Year coverage</p>
          <div className="flex h-4 w-full rounded-md overflow-hidden text-[9px] font-semibold">
            <div
              className="bg-muted flex items-center justify-center text-muted-foreground/50 shrink-0"
              style={{ width: `${elapsedPct}%` }}
            >
              {elapsedPct >= 15 ? `${Math.round(elapsedPct)}%` : ''}
            </div>
            <div
              className={`${isEdit && isMonthChanged ? 'bg-amber-500/20' : 'bg-primary/20'} flex items-center justify-center ${isEdit && isMonthChanged ? 'text-amber-600' : 'text-primary'} shrink-0`}
              style={{ width: `${remainingPct}%` }}
            >
              {remainingPct >= 15 ? `${Math.round(remainingPct)}%` : ''}
            </div>
          </div>

          <div className="flex items-start gap-1 mt-1">
            <Info className="h-3 w-3 text-muted-foreground/50 mt-0.5 shrink-0" />
            <p className="text-[10px] text-muted-foreground/50 leading-snug">
              Prior-year employees receive the full annual amount.
              New employees are prorated from their own joining month.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main step component
// ─────────────────────────────────────────────────────────────────────────────
interface Props {
  mode:          'add' | 'edit';
  originalMonth: number | null;  // stored associate_month from DB (edit only), null for add
  form:          PolicyFormValues;
  preview:       PolicyAllocationPreview | null;
  previewLoad:   boolean;
  selectedMonth: number;          // = form.associate_month
  onMonthChange: (m: number) => void;
  onPatch:       (p: Partial<PolicyFormValues>) => void;
  onNext:        () => void;
  onBack:        () => void;
}

export const StepEntitlement = ({
  mode, originalMonth, form, preview, previewLoad, selectedMonth,
  onMonthChange, onPatch, onNext, onBack,
}: Props) => {
  const isEdit = mode === 'edit';
  const currentMonth = new Date().getMonth() + 1;

  // Month changed from the stored value (only relevant in edit mode)
  const isMonthChanged = isEdit && originalMonth !== null && selectedMonth !== originalMonth;

  // Pending month — held while warning is shown
  const [pendingMonth, setPendingMonth] = useState<number | null>(null);
  const [warnOpen, setWarnOpen]         = useState(false);

  const handleMonthChange = (m: number) => {
    if (isEdit && originalMonth !== null && m !== originalMonth) {
      // User is changing away from the saved month → show warning first
      setPendingMonth(m);
      setWarnOpen(true);
    } else {
      onMonthChange(m);
    }
  };

  const handleConfirm = () => {
    if (pendingMonth !== null) onMonthChange(pendingMonth);
    setWarnOpen(false);
    setPendingMonth(null);
  };

  const handleCancel = () => {
    setWarnOpen(false);
    setPendingMonth(null);
  };

  const suggestedIntern = form.default_entitlement
    ? Math.floor(Number(form.default_entitlement) / 1.5)
    : 0;

  const valid = form.default_entitlement.length > 0;

  return (
    <div className="space-y-4 py-4 px-1">

      {/* ── Warning dialog ─────────────────────────────────────────────── */}
      {isEdit && (
        <MonthChangeWarning
          open={warnOpen}
          fromMonth={originalMonth ?? selectedMonth}
          toMonth={pendingMonth ?? selectedMonth}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}

      {/* ── Annual days — Employee ──────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label htmlFor="pf-entitlement">Annual Days — Employee</Label>
        <Input
          id="pf-entitlement"
          type="number" min={0} placeholder="18"
          value={form.default_entitlement}
          onChange={e => onPatch({ default_entitlement: e.target.value })}
          autoFocus
        />
      </div>

      {/* ── Annual days — Intern ────────────────────────────────────────── */}
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
          type="number" min={0}
          placeholder={form.default_entitlement ? String(suggestedIntern) : '12'}
          value={form.intern_entitlement}
          onChange={e => onPatch({ intern_entitlement: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">Optional — leave blank to use suggested value</p>
      </div>

      {/* ── Proration visualiser ────────────────────────────────────────── */}
      {form.default_entitlement && (
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
              isEdit={isEdit}
              originalMonth={originalMonth}
              isMonthChanged={isMonthChanged}
              onMonthChange={handleMonthChange}
            />
          )}
        </>
      )}

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">← Back</Button>
        <Button type="button" className="flex-1" disabled={!valid} onClick={onNext}>Next →</Button>
      </div>
    </div>
  );
};
