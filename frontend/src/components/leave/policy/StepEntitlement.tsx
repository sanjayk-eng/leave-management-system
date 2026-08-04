// Step 3 — Entitlements + proration preview
// Only shown when is_early = false.
//
// associate_month:
//   CREATE → interactive month strip, admin chooses the proration anchor,
//            selection is saved with the policy.
//   EDIT   → month strip hidden. Preview is shown automatically based on
//            the already-saved associate_month. No selection possible.

import { Button }       from '@/components/ui/button';
import { Input }        from '@/components/ui/input';
import { Label }        from '@/components/ui/label';
import { Badge }        from '@/components/ui/badge';
import { Skeleton }     from '@/components/ui/skeleton';
import { CalendarCheck, Info, Lock } from 'lucide-react';
import type { PolicyAllocationPreview } from '@/services/leaveService';
import type { PolicyFormValues }        from './PolicyFormTypes';

// ─────────────────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
// Two-letter abbreviations — used for the add-mode month strip
const MONTH_SHORT2 = ['Ja','Fe','Ma','Ap','My','Jn','Jl','Au','Se','Oc','No','De'];

const fmtDays = (v: number) => v % 1 === 0 ? String(v) : v.toFixed(1);

// ─────────────────────────────────────────────────────────────────────────────
// Proration Visualiser
// ─────────────────────────────────────────────────────────────────────────────
interface VisProps {
  preview:       PolicyAllocationPreview;
  selectedMonth: number;
  currentMonth:  number;
  isEdit:        boolean;
  originalMonth: number | null;
  onMonthChange: (m: number) => void;
}

const ProrationVisualiser = ({
  preview, selectedMonth, currentMonth, isEdit, originalMonth, onMonthChange,
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

  // The display month for labels — edit always shows saved month, add shows selected
  const displayMonth = isEdit
    ? (originalMonth ?? selectedMonth)
    : selectedMonth;

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-1.5">
          <CalendarCheck className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">Allocation preview</span>
        </div>
        {/* Edit: locked saved-month badge */}
        {isEdit ? (
          <div className="flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-muted-foreground/60" />
            <Badge variant="outline" className="text-[11px] h-5 px-2 border-primary/30 text-primary">
              {MONTH_NAMES[displayMonth - 1]}
            </Badge>
          </div>
        ) : (
          /* Create: show Today badge when on current month */
          preview.is_current_month && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-green-400 text-green-600">
              Today
            </Badge>
          )
        )}
      </div>

      {/* ── Callout ──────────────────────────────────────────────────────── */}
      {isEdit ? (
        <div className="mx-3 mt-3 rounded-lg border border-muted bg-muted/30 px-3 py-2 flex items-start gap-2">
          <Lock className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-muted-foreground leading-tight">
              Allocation month — {MONTH_NAMES[displayMonth - 1]}
            </p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5 leading-snug">
              Fixed at creation. Showing prorated allocation based on this month.
            </p>
          </div>
        </div>
      ) : (
        <div className="mx-3 mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 flex items-start gap-2">
          <CalendarCheck className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-primary leading-tight">
              Policy creation month — {MONTH_NAMES[selectedMonth - 1]}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
              Employees receive prorated days from this month. Click any month below to change.
            </p>
          </div>
        </div>
      )}

      <div className="p-3 space-y-3">

        {/* ── 12-month strip — Add mode only ──────────────────────────────── */}
        {!isEdit && (
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground">
              Allocation basis — click to change
            </p>

            {/* CSS grid: every cell is exactly equal width */}
            <div className="grid grid-cols-12 h-8 w-full rounded-md overflow-hidden gap-px bg-border">
              {MONTH_SHORT2.map((m, i) => {
                const mn          = i + 1;
                const isSelected  = mn === selectedMonth;
                const isElapsed   = mn < selectedMonth;
                const isAllocated = mn > selectedMonth;
                const isToday     = mn === currentMonth;

                return (
                  <button
                    key={m}
                    type="button"
                    title={[
                      MONTH_NAMES[i],
                      isToday    ? '(today)'            : '',
                      isSelected ? '— allocation start' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => onMonthChange(mn)}
                    className={[
                      'flex items-center justify-center transition-colors cursor-pointer relative min-w-0',
                      isElapsed   ? 'bg-muted text-muted-foreground/40 hover:bg-muted/80'  : '',
                      isSelected  ? 'bg-primary text-primary-foreground'                   : '',
                      isAllocated ? 'bg-primary/10 text-primary/70 hover:bg-primary/20'   : '',
                      isToday && !isSelected ? 'ring-1 ring-inset ring-green-400'          : '',
                    ].join(' ')}
                  >
                    <span className="text-[9px] font-semibold leading-none truncate px-0.5">{m}</span>
                    {isSelected && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/70" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-muted border inline-block" />
                Elapsed ({elapsed}mo)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-primary inline-block" />
                Start
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-primary/10 border border-primary/20 inline-block" />
                Allocated ({remaining}mo)
              </span>
              {currentMonth !== selectedMonth && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm border border-green-400 inline-block" />
                  Today
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Direct & range summary — Edit mode ──────────────────────────── */}
        {isEdit && (
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground">
              Month coverage
            </p>
            <div className="flex h-8 w-full rounded-md overflow-hidden gap-px bg-border">
              {/* Elapsed segment */}
              {elapsedPct > 0 && (
                <div
                  className="bg-muted flex items-center justify-center shrink-0"
                  style={{ width: `${elapsedPct}%` }}
                  title={`Elapsed: ${elapsed} month${elapsed !== 1 ? 's' : ''}`}
                >
                  {elapsedPct >= 12 && (
                    <span className="text-[9px] font-semibold text-muted-foreground/50 truncate px-0.5">
                      {elapsed}mo
                    </span>
                  )}
                </div>
              )}
              {/* Allocated segment */}
              {remainingPct > 0 && (
                <div
                  className="bg-primary/20 flex items-center justify-center shrink-0"
                  style={{ width: `${remainingPct}%` }}
                  title={`Allocated: ${remaining} month${remaining !== 1 ? 's' : ''}`}
                >
                  {remainingPct >= 12 && (
                    <span className="text-[9px] font-semibold text-primary/70 truncate px-0.5">
                      {remaining}mo
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-muted border inline-block" />
                Elapsed ({elapsed}mo)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-primary/20 border border-primary/20 inline-block" />
                Allocated ({remaining}mo)
              </span>
            </div>
          </div>
        )}

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
                    <span className="text-xs text-muted-foreground">/ {row.annual}d</span>
                  </div>
                </div>

                <div className="relative h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-muted-foreground/20 rounded-l-full"
                    style={{ width: `${elapsedPct}%` }}
                  />
                  <div
                    className={`absolute inset-y-0 ${row.bar} rounded-r-full transition-all duration-500`}
                    style={{ left: `${elapsedPct}%`, width: `${remainingPct}%` }}
                  />
                </div>

                <p className="text-[10px] text-muted-foreground/60 text-right tabular-nums">
                  {row.annual} × {remaining}/12 = <span className={`font-semibold ${row.text}`}>{fmtDays(row.prorated)}</span>d
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
              className="bg-primary/20 flex items-center justify-center text-primary shrink-0"
              style={{ width: `${remainingPct}%` }}
            >
              {remainingPct >= 15 ? `${Math.round(remainingPct)}%` : ''}
            </div>
          </div>
          <div className="flex items-start gap-1 mt-1">
            <Info className="h-3 w-3 text-muted-foreground/50 mt-0.5 shrink-0" />
            <p className="text-[10px] text-muted-foreground/50 leading-snug">
              Prior-year employees receive the full annual amount.
              New employees are prorated from their joining month.
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
  originalMonth: number | null;
  form:          PolicyFormValues;
  preview:       PolicyAllocationPreview | null;
  previewLoad:   boolean;
  selectedMonth: number;
  onMonthChange: (m: number) => void;
  onPatch:       (p: Partial<PolicyFormValues>) => void;
  onNext:        () => void;
  onBack:        () => void;
}

export const StepEntitlement = ({
  mode, originalMonth, form, preview, previewLoad, selectedMonth,
  onMonthChange, onPatch, onNext, onBack,
}: Props) => {
  const isEdit       = mode === 'edit';
  const currentMonth = new Date().getMonth() + 1;

  const suggestedIntern = form.default_entitlement
    ? Math.floor(Number(form.default_entitlement) / 1.5)
    : 0;

  const valid = form.default_entitlement.length > 0;

  return (
    <div className="space-y-4 py-4 px-1">

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
            <div className="rounded-xl border bg-muted/20 overflow-hidden">
              {/* Skeleton header */}
              <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-3.5 w-3.5 rounded-full" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="p-3 space-y-3">
                {/* Callout skeleton */}
                <Skeleton className="h-9 w-full rounded-lg" />
                {/* Month strip skeleton — add mode only */}
                {!isEdit && <Skeleton className="h-8 w-full rounded-md" />}
                {/* Row skeleton — employee */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-2.5 w-full rounded-full" />
                  <Skeleton className="h-3 w-32 ml-auto" />
                </div>
                {/* Year coverage skeleton */}
                <div className="space-y-1 pt-1 border-t border-border/40">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-full rounded-md" />
                </div>
              </div>
            </div>
          )}
          {!previewLoad && preview && (
            <ProrationVisualiser
              preview={preview}
              selectedMonth={selectedMonth}
              currentMonth={currentMonth}
              isEdit={isEdit}
              originalMonth={originalMonth}
              onMonthChange={onMonthChange}
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
