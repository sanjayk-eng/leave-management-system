// Step 3 — Entitlements + proration preview
// Only shown when is_early = false.
// Proration visualiser is passed from parent (already fetched).

import { Button } from '@/components/ui/button';
import { Input }  from '@/components/ui/input';
import { Label }  from '@/components/ui/label';
import { Badge }  from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { PolicyAllocationPreview } from '@/services/leaveService';
import type { PolicyFormValues } from './PolicyFormTypes';

// ─────────────────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const fmtDays = (v: number) => v % 1 === 0 ? String(v) : v.toFixed(1);

// ─────────────────────────────────────────────────────────────────────────────
// Proration Visualiser (self-contained, receives already-fetched data)
// ─────────────────────────────────────────────────────────────────────────────
interface VisProps {
  preview:       PolicyAllocationPreview;
  selectedMonth: number;
  currentMonth:  number;
  onMonthChange: (m: number) => void;
}

const ProrationVisualiser = ({ preview, selectedMonth, currentMonth, onMonthChange }: VisProps) => {
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
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <span className="text-xs font-semibold text-foreground">Allocation preview</span>
        <div className="flex items-center gap-2">
          {preview.is_current_month && (
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
                    {i + 1 === currentMonth && (
                      <span className="text-[9px] text-green-600 font-medium">← now</span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* 12-month strip */}
        <div className="space-y-1">
          <div className="flex h-6 w-full rounded-md overflow-hidden gap-[1px] bg-border">
            {MONTH_SHORT.map((m, i) => {
              const mn = i + 1;
              return (
                <button
                  key={m} type="button" title={MONTH_NAMES[i]}
                  onClick={() => onMonthChange(mn)}
                  className={[
                    'flex-1 flex items-center justify-center text-[9px] font-medium transition-colors cursor-pointer',
                    mn < selectedMonth  ? 'bg-muted text-muted-foreground/40 hover:bg-muted/80' : '',
                    mn === selectedMonth ? 'bg-primary text-primary-foreground' : '',
                    mn > selectedMonth  ? 'bg-primary/10 text-primary/70 hover:bg-primary/20' : '',
                    mn === currentMonth && mn !== selectedMonth ? 'ring-1 ring-inset ring-green-400' : '',
                  ].join(' ')}
                >
                  {m[0]}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-muted border inline-block" />Elapsed ({elapsed} mo)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary inline-block" />Creation</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary/10 border border-primary/20 inline-block" />Allocated ({remaining} mo)</span>
          </div>
        </div>

        {/* Per-role bars */}
        <div className="space-y-3">
          {rows.map(row => {
            const pct = total > 0 ? Math.round((row.prorated / row.annual) * 100) : 0;
            return (
              <div key={row.label} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">{row.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-bold ${row.text}`}>{fmtDays(row.prorated)}</span>
                    <span className="text-xs text-muted-foreground">/ {row.annual} days</span>
                    <Badge variant="outline" className={`text-[10px] h-4 px-1 ${row.badge}`}>{pct}%</Badge>
                  </div>
                </div>
                <div className="relative h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-muted-foreground/20 rounded-l-full" style={{ width: `${elapsedPct}%` }} />
                  <div className={`absolute inset-y-0 ${row.bar} rounded-r-full transition-all duration-500`} style={{ left: `${elapsedPct}%`, width: `${remainingPct}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground/60 text-right">
                  {row.annual} × {remaining}/12 = {fmtDays(row.prorated)} days
                </p>
              </div>
            );
          })}
        </div>

        {/* Year strip */}
        <div className="space-y-1 pt-1 border-t border-border/40">
          <p className="text-[10px] font-medium text-muted-foreground">Year coverage</p>
          <div className="flex h-4 w-full rounded-md overflow-hidden text-[9px] font-semibold">
            <div className="bg-muted flex items-center justify-center text-muted-foreground/50 shrink-0" style={{ width: `${elapsedPct}%` }}>
              {elapsedPct >= 15 ? `${Math.round(elapsedPct)}%` : ''}
            </div>
            <div className="bg-primary/20 flex items-center justify-center text-primary shrink-0" style={{ width: `${remainingPct}%` }}>
              {remainingPct >= 15 ? `${Math.round(remainingPct)}%` : ''}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground/50">
            Prior-year employees get the full annual amount. New employees are prorated from their joining month.
          </p>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main step component
// ─────────────────────────────────────────────────────────────────────────────
interface Props {
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
  form, preview, previewLoad, selectedMonth, onMonthChange,
  onPatch, onNext, onBack,
}: Props) => {
  const suggestedIntern = form.default_entitlement
    ? Math.floor(Number(form.default_entitlement) / 1.5)
    : 0;

  const currentMonth = new Date().getMonth() + 1;
  const valid = form.default_entitlement.length > 0;

  return (
    <div className="space-y-4 py-4 px-1">
      {/* Employee */}
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

      {/* Intern */}
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

      {/* Proration preview */}
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
              onMonthChange={onMonthChange}
            />
          )}
        </>
      )}

      <div className="flex gap-3 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">← Back</Button>
        <Button type="button" className="flex-1" disabled={!valid} onClick={onNext}>Next →</Button>
      </div>
    </div>
  );
};
