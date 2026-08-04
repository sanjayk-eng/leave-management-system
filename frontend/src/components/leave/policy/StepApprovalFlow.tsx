// Step 4 — Approval flow + final summary + submit

import { Badge }  from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label }  from '@/components/ui/label';
import { Loader2, GitMerge, CalendarDays, Check } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { LeaveApprovalFlowResponse } from '@/types';
import type { PolicyAllocationPreview }   from '@/services/leaveService';
import type { PolicyFormValues }          from './PolicyFormTypes';

const fmtDays = (v: number) => v % 1 === 0 ? String(v) : v.toFixed(1);

// ── Summary card ──────────────────────────────────────────────────────────────
const Summary = ({
  form, preview,
}: { form: PolicyFormValues; preview: PolicyAllocationPreview | null }) => (
  <div className="rounded-lg border bg-muted/30 p-3 space-y-2.5 text-xs text-muted-foreground">
    <p className="font-semibold text-foreground text-sm">{form.name}</p>

    {/* Type badges */}
    <div className="flex gap-1.5 flex-wrap">
      <Badge variant={form.is_paid ? 'default' : 'secondary'} className="text-[10px]">
        {form.is_paid ? 'Paid' : 'Unpaid'}
      </Badge>
      {form.is_early          && <Badge className="bg-blue-100   text-blue-800   text-[10px]">Early Leave</Badge>}
      {form.is_work_from_home && <Badge className="bg-purple-100 text-purple-800 text-[10px]">WFH</Badge>}
    </div>

    {/* Entitlements */}
    {!form.is_early && (
      <div className="space-y-0.5">
        <p>Annual: <strong className="text-foreground">{form.default_entitlement} days</strong> (employee)
          {form.intern_entitlement && (
            <> · <strong className="text-foreground">{form.intern_entitlement} days</strong> (intern)</>
          )}
        </p>
      </div>
    )}

    {/* Proration */}
    {!form.is_early && preview && (
      <div className="pt-1.5 border-t border-border/50 space-y-0.5">
        <div className="flex items-center gap-1 text-[10px] font-medium text-foreground">
          <CalendarDays className="h-3 w-3 text-primary" />
          Allocation on creation ({preview.remaining_months} months remaining)
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5">
          <span>
            Employee: <strong className="text-foreground">{fmtDays(preview.prorated_default)} days</strong>
            <span className="text-muted-foreground/60 ml-1">
              ({preview.default_entitlement} × {preview.remaining_months}/12)
            </span>
          </span>
          {preview.prorated_intern != null && preview.intern_entitlement != null && (
            <span>
              Intern: <strong className="text-foreground">{fmtDays(preview.prorated_intern)} days</strong>
              <span className="text-muted-foreground/60 ml-1">
                ({preview.intern_entitlement} × {preview.remaining_months}/12)
              </span>
            </span>
          )}
        </div>
      </div>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
interface Props {
  form:         PolicyFormValues;
  flows:        LeaveApprovalFlowResponse[];
  isAdd:        boolean;
  isSubmitting: boolean;
  preview:      PolicyAllocationPreview | null;
  onPatch:      (p: Partial<PolicyFormValues>) => void;
  onBack:       () => void;
  onSubmit:     (e: React.FormEvent) => void;
}

export const StepApprovalFlow = ({
  form, flows, isAdd, isSubmitting, preview, onPatch, onBack, onSubmit,
}: Props) => (
  <form onSubmit={onSubmit} className="space-y-4 py-4 px-1">

    {/* Policy summary */}
    <Summary form={form} preview={preview} />

    {/* Approval flow picker */}
    <div className="space-y-1.5">
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

    {/* Actions */}
    <div className="flex gap-3 pt-2 border-t">
      <Button type="button" variant="outline" onClick={onBack} className="flex-1">
        ← Back
      </Button>
      <Button type="submit" className="flex-1" disabled={isSubmitting}>
        {isSubmitting ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isAdd ? 'Adding…' : 'Updating…'}</>
        ) : (
          <><Check className="mr-1.5 h-4 w-4" />{isAdd ? 'Add Policy' : 'Update Policy'}</>
        )}
      </Button>
    </div>
  </form>
);
