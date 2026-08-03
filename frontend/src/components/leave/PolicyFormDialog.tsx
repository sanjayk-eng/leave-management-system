/* eslint-disable react-refresh/only-export-components */

// Thin wrapper — owns only wizard state (current step) and form state.
// All visual content lives in PolicyStep1Fields / PolicyStep2Flow.

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import type { LeaveApprovalFlowResponse } from '@/types';
import { PolicyStep1Fields } from './policy/PolicyStep1Fields';
import { PolicyStep2Flow }   from './policy/PolicyStep2Flow';
import {
  PolicyFormValues,
  POLICY_FORM_DEFAULTS,
} from './policy/PolicyFormTypes';

// Re-export so existing imports in LeavePolicies.tsx keep working.
export type { PolicyFormValues };
export { POLICY_FORM_DEFAULTS };

// ── Step progress bar ─────────────────────────────────────────────────────────
const StepIndicator = ({ step }: { step: 1 | 2 }) => (
  <div className="flex items-center gap-2 px-1">
    <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
    <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
  </div>
);

// ── Props ─────────────────────────────────────────────────────────────────────
interface PolicyFormDialogProps {
  mode:         'add' | 'edit';
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  initial?:     Partial<PolicyFormValues>;
  flows:        LeaveApprovalFlowResponse[];
  onSubmit:     (values: PolicyFormValues) => void;
  isSubmitting: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────
export const PolicyFormDialog = ({
  mode, open, onOpenChange, initial, flows, onSubmit, isSubmitting,
}: PolicyFormDialogProps) => {
  const isAdd = mode === 'add';
  const systemFlowId = flows.find(f => f.is_system)?.id ?? '';

  const [form, setForm] = useState<PolicyFormValues>(POLICY_FORM_DEFAULTS);
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (open) {
      setStep(1);
      setForm({
        ...POLICY_FORM_DEFAULTS,
        ...initial,
        approval_flow_id: initial?.approval_flow_id ?? systemFlowId,
      });
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (partial: Partial<PolicyFormValues>) =>
    setForm(prev => ({ ...prev, ...partial }));

  const handleClose = () => { onOpenChange(false); setStep(1); };

  const step1Valid = form.name.trim().length > 0 && form.default_entitlement.length > 0;

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) handleClose(); }}>
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
          <PolicyStep1Fields
            form={form}
            isValid={step1Valid}
            onPatch={patch}
            onNext={() => setStep(2)}
            onCancel={handleClose}
          />
        ) : (
          <PolicyStep2Flow
            form={form}
            flows={flows}
            isAdd={isAdd}
            isSubmitting={isSubmitting}
            onPatch={patch}
            onBack={() => setStep(1)}
            onSubmit={e => { e.preventDefault(); onSubmit(form); }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
