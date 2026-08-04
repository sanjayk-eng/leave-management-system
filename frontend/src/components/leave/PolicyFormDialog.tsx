/* eslint-disable react-refresh/only-export-components */

// Thin wrapper — owns wizard state, form state, and the backend allocation
// preview that is shared between Step 1 (typed live) and Step 2 (summary).

import { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import type { LeaveApprovalFlowResponse } from '@/types';
import { leaveService, type PolicyAllocationPreview } from '@/services/leaveService';
import { PolicyStep1Fields } from './policy/PolicyStep1Fields';
import { PolicyStep2Flow }   from './policy/PolicyStep2Flow';
import {
  PolicyFormValues,
  POLICY_FORM_DEFAULTS,
} from './policy/PolicyFormTypes';

// Re-export so existing imports in LeavePolicies.tsx keep working.
export type { PolicyFormValues };
export { POLICY_FORM_DEFAULTS };

const DEBOUNCE_MS = 400;

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

  const [form, setForm]       = useState<PolicyFormValues>(POLICY_FORM_DEFAULTS);
  const [step, setStep]       = useState<1 | 2>(1);

  // ── Shared allocation preview (fetched from backend) ─────────────────────
  const [preview,       setPreview]       = useState<PolicyAllocationPreview | null>(null);
  const [previewLoad,   setPreviewLoad]   = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setStep(1);
      setPreview(null);
      setSelectedMonth(new Date().getMonth() + 1);
      setForm({
        ...POLICY_FORM_DEFAULTS,
        ...initial,
        approval_flow_id: initial?.approval_flow_id ?? systemFlowId,
      });
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch preview from backend whenever entitlement values OR month changes
  useEffect(() => {
    const defaultVal = Number(form.default_entitlement) || 0;

    if (defaultVal <= 0 || form.is_early) {
      setPreview(null);
      setPreviewLoad(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }

    setPreviewLoad(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const internVal = form.intern_entitlement
          ? Number(form.intern_entitlement)
          : undefined;
        const data = await leaveService.previewPolicyAllocation(defaultVal, internVal, selectedMonth);
        setPreview(data);
      } catch {
        setPreview(null);
      } finally {
        setPreviewLoad(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.default_entitlement, form.intern_entitlement, form.is_early, selectedMonth]);

  const patch = (partial: Partial<PolicyFormValues>) =>
    setForm(prev => ({ ...prev, ...partial }));

  const handleClose = () => { onOpenChange(false); setStep(1); };

  const step1Valid = form.name.trim().length > 0 && form.default_entitlement.length > 0;

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) handleClose(); }}>
      <DialogContent className="w-full max-w-md mx-auto max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>{isAdd ? 'Add Leave Policy' : 'Edit Leave Policy'}</DialogTitle>
          <DialogDescription>
            {step === 1
              ? `Step 1 of 2 — ${isAdd ? 'Create a new leave type policy' : 'Update leave policy details'}`
              : 'Step 2 of 2 — Attach an approval flow'}
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 px-1">
          <StepIndicator step={step} />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {step === 1 ? (
            <PolicyStep1Fields
              form={form}
              isValid={step1Valid}
              preview={preview}
              previewLoad={previewLoad}
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
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
              preview={preview}
              onPatch={patch}
              onBack={() => setStep(1)}
              onSubmit={e => { e.preventDefault(); onSubmit(form); }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
