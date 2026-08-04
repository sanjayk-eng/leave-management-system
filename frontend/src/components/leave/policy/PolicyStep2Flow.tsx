// Step 2 of the policy form wizard: attach an approval flow + submit.
// The allocation preview was already fetched on Step 1 and is passed in
// as a prop — no recalculation or extra API call needed here.

import { Badge }   from '@/components/ui/badge';
import { Button }  from '@/components/ui/button';
import { Label }   from '@/components/ui/label';
import { Loader2, GitMerge, CalendarDays } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { LeaveApprovalFlowResponse } from '@/types';
import type { PolicyAllocationPreview }   from '@/services/leaveService';
import type { PolicyFormValues }          from './PolicyFormTypes';

/** Show one decimal only when the value is .5, otherwise whole number */
const fmtDays = (v: number) => v % 1 === 0 ? String(v) : v.toFixed(1);

// ── Policy summary card ───────────────────────────────────────────────────────
interface SummaryProps {
  form:    PolicyFormValues;
  preview: PolicyAllocationPreview | null;
}

const PolicySummary = ({ form, preview }: SummaryProps) => (
  <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground space-y-2 border">

    {/* Name + annual entitlement */}
    <p className="font-medium text-foreground text-sm">{form.name}</p>
    <p>
      {form.default_entitlement} days/yr (employee)
      {form.intern_entitlement ? `, ${form.intern_entitlement} days/yr (intern)` : ''}
    </p>

    {/* Type badges */}
    <div className="flex gap-2 flex-wrap">
      {form.is_paid           && <Badge className="bg-green-100  text-green-800  text-[10px]">Paid</Badge>}
      {form.is_early          && <Badge className="bg-blue-100   text-blue-800   text-[10px]">Early</Badge>}
      {form.is_work_from_home && <Badge className="bg-purple-100 text-purple-800 text-[10px]">WFH</Badge>}
    </div>

    {/* Prorated allocation — only for non-early policies with a backend result */}
    {!form.is_early && preview && (
      <div className="pt-1.5 border-t border-border/50 space-y-1.5">
        <div className="flex items-center gap-1 text-[10px] font-medium text-foreground">
          <CalendarDays className="h-3 w-3 text-primary" />
          Actual allocation on creation ({preview.remaining_months} months remaining)
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Employee */}
          <span className="flex items-baseline gap-1">
            <span>Employee:</span>
            <strong className="text-foreground text-sm">{fmtDays(preview.prorated_default)} days</strong>
            <span className="text-muted-foreground/60">
              ({preview.default_entitlement}&nbsp;×&nbsp;{preview.remaining_months}/12)
            </span>
          </span>

          {/* Intern */}
          {preview.prorated_intern != null && preview.intern_entitlement != null && (
            <span className="flex items-baseline gap-1">
              <span>Intern:</span>
              <strong className="text-foreground text-sm">{fmtDays(preview.prorated_intern)} days</strong>
              <span className="text-muted-foreground/60">
                ({preview.intern_entitlement}&nbsp;×&nbsp;{preview.remaining_months}/12)
              </span>
            </span>
          )}
        </div>
      </div>
    )}
  </div>
);

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  form:         PolicyFormValues;
  flows:        LeaveApprovalFlowResponse[];
  isAdd:        boolean;
  isSubmitting: boolean;
  preview:      PolicyAllocationPreview | null;
  onPatch:      (partial: Partial<PolicyFormValues>) => void;
  onBack:       () => void;
  onSubmit:     (e: React.FormEvent) => void;
}

export const PolicyStep2Flow = ({
  form, flows, isAdd, isSubmitting, preview, onPatch, onBack, onSubmit,
}: Props) => (
  <form onSubmit={onSubmit} className="space-y-4 py-4">

    {/* Approval flow picker */}
    <div className="space-y-2">
      <Label>Approval Flow</Label>
      <Select
        value={form.approval_flow_id || '__none__'}
        onValueChange={v => onPatch({ approval_flow_id: v === '__none__' ? '' : v })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select an approval flow (optional)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">
            <span className="text-muted-foreground">None — no approval required</span>
          </SelectItem>
          {flows.map(flow => (
            <SelectItem key={flow.id} value={flow.id}>
              <div className="flex items-center gap-2">
                <GitMerge className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{flow.name}</span>
                {flow.is_system && (
                  <Badge variant="secondary" className="text-[10px]">Default</Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  ({flow.flow.length} stage{flow.flow.length !== 1 ? 's' : ''})
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        The system default flow is pre-selected. You can change or remove it.
      </p>
    </div>

    {/* Summary + allocation from backend */}
    <PolicySummary form={form} preview={preview} />

    {/* Actions */}
    <div className="flex gap-3 pt-4 border-t">
      <Button type="button" variant="outline" onClick={onBack} className="flex-1">
        ← Back
      </Button>
      <Button type="submit" className="flex-1" disabled={isSubmitting}>
        {isSubmitting
          ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isAdd ? 'Adding...' : 'Updating...'}</>
          : isAdd ? 'Add Policy' : 'Update Policy'}
      </Button>
    </div>
  </form>
);
