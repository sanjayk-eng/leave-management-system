/* eslint-disable react-refresh/only-export-components */


import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, GitMerge } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { LeaveApprovalFlowResponse } from '@/types';

// ─── Form shape ───────────────────────────────────────────────────────────────
export interface PolicyFormValues {
  name:                string;
  is_paid:             boolean;
  is_early:            boolean;
  is_work_from_home:   boolean;
  default_entitlement: string;
  intern_entitlement:  string;
  approval_flow_id:    string;   // "" = none
}

export const POLICY_FORM_DEFAULTS: PolicyFormValues = {
  name:                '',
  is_paid:             true,
  is_early:            false,
  is_work_from_home:   false,
  default_entitlement: '',
  intern_entitlement:  '',
  approval_flow_id:    '',
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface PolicyFormDialogProps {
  mode:          'add' | 'edit';
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  initial?:      Partial<PolicyFormValues>;
  flows:         LeaveApprovalFlowResponse[];
  onSubmit:      (values: PolicyFormValues) => void;
  isSubmitting:  boolean;
}

// ─── Step indicator ───────────────────────────────────────────────────────────
const StepIndicator = ({ step }: { step: 1 | 2 }) => (
  <div className="flex items-center gap-2 px-1">
    <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
    <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
  </div>
);

// ─── Policy summary (shown in step 2) ────────────────────────────────────────
const PolicySummary = ({ form }: { form: PolicyFormValues }) => (
  <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground space-y-1 border">
    <p className="font-medium text-foreground text-sm">{form.name}</p>
    <p>
      {form.default_entitlement} days/yr (employee)
      {form.intern_entitlement ? `, ${form.intern_entitlement} days/yr (intern)` : ''}
    </p>
    <div className="flex gap-2 flex-wrap pt-0.5">
      {form.is_paid          && <Badge className="bg-green-100  text-green-800  text-[10px]">Paid</Badge>}
      {form.is_early         && <Badge className="bg-blue-100   text-blue-800   text-[10px]">Early</Badge>}
      {form.is_work_from_home && <Badge className="bg-purple-100 text-purple-800 text-[10px]">WFH</Badge>}
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
export const PolicyFormDialog = ({
  mode, open, onOpenChange, initial, flows, onSubmit, isSubmitting,
}: PolicyFormDialogProps) => {
  const isAdd = mode === 'add';

  // Derive the system flow id once (used as default in step 2)
  const systemFlowId = flows.find(f => f.is_system)?.id ?? '';

  // ── form state ──────────────────────────────────────────────────────────────
  const [form, setForm] = useState<PolicyFormValues>(POLICY_FORM_DEFAULTS);
  const [step, setStep] = useState<1 | 2>(1);

  // Re-initialize when dialog opens or initial values change
  useEffect(() => {
    if (open) {
      setStep(1);
      setForm({
        ...POLICY_FORM_DEFAULTS,
        ...initial,
        // For a new policy, pre-select the system flow.
        // For edit, keep whatever the policy already has (or fall back to system).
        approval_flow_id: initial?.approval_flow_id ?? systemFlowId,
      });
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (partial: Partial<PolicyFormValues>) =>
    setForm(prev => ({ ...prev, ...partial }));

  const step1Valid =
    form.name.trim().length > 0 && form.default_entitlement.length > 0;

  const handleClose = () => {
    onOpenChange(false);
    setStep(1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{isAdd ? 'Add Leave Policy' : 'Edit Leave Policy'}</DialogTitle>
          <DialogDescription>
            {step === 1
              ? `Step 1 of 2 — ${isAdd ? 'Create a new leave type policy' : 'Update leave policy details'}`
              : 'Step 2 of 2 — Attach an approval flow'}
          </DialogDescription>
        </DialogHeader>

        <StepIndicator step={step} />

        {step === 1 ? (
          /* ── Step 1: policy fields ── */
          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="pf-name">Policy Name</Label>
              <Input
                id="pf-name"
                placeholder="e.g., Sick Leave"
                value={form.name}
                onChange={e => patch({ name: e.target.value })}
                autoFocus
              />
            </div>

            {/* Employee entitlement */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="pf-entitlement">Default Entitlement (days) — Employee</Label>
                {form.default_entitlement && (
                  <span className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{form.default_entitlement}</span> days
                  </span>
                )}
              </div>
              <Input
                id="pf-entitlement"
                type="number"
                placeholder="10"
                value={form.default_entitlement}
                onChange={e => patch({ default_entitlement: e.target.value })}
              />
            </div>

            {/* Intern entitlement */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="pf-intern">Default Entitlement (days) — Intern</Label>
                {form.default_entitlement && (
                  <span className="text-xs text-blue-500">
                    Suggested: <span className="font-medium">
                      {Math.floor(Number(form.default_entitlement) / 1.5)}
                    </span> days
                  </span>
                )}
              </div>
              <Input
                id="pf-intern"
                type="number"
                placeholder={
                  form.default_entitlement
                    ? String(Math.floor(Number(form.default_entitlement) / 1.5))
                    : '5'
                }
                value={form.intern_entitlement}
                onChange={e => patch({ intern_entitlement: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Optional — leave blank to use suggested value</p>
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="pf-paid"
                  checked={form.is_paid}
                  onCheckedChange={checked => patch({ is_paid: checked })}
                />
                <Label htmlFor="pf-paid">Paid Leave</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="pf-early"
                  checked={form.is_early}
                  onCheckedChange={checked =>
                    patch({ is_early: checked, is_work_from_home: checked ? false : form.is_work_from_home })
                  }
                />
                <Label htmlFor="pf-early">Early Leave</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="pf-wfh"
                  checked={form.is_work_from_home}
                  onCheckedChange={checked =>
                    patch({ is_work_from_home: checked, is_early: checked ? false : form.is_early })
                  }
                />
                <Label htmlFor="pf-wfh">Work From Home</Label>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={!step1Valid}
                onClick={() => setStep(2)}
              >
                Next →
              </Button>
            </div>
          </div>
        ) : (
          /* ── Step 2: attach approval flow ── */
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Approval Flow</Label>
              <Select
                value={form.approval_flow_id || '__none__'}
                onValueChange={v => patch({ approval_flow_id: v === '__none__' ? '' : v })}
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
                Only one flow can be attached per policy.
              </p>
            </div>

            {/* Step 1 summary */}
            <PolicySummary form={form} />

            {/* Footer */}
            <div className="flex gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                ← Back
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isAdd ? 'Adding...' : 'Updating...'}</>
                  : isAdd ? 'Add Policy' : 'Update Policy'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
