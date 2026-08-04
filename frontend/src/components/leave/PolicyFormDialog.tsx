/* eslint-disable react-refresh/only-export-components */

import { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import type { LeaveApprovalFlowResponse } from '@/types';
import { leaveService, type PolicyAllocationPreview } from '@/services/leaveService';
import { StepName }         from './policy/StepName';
import { StepLeaveType }    from './policy/StepLeaveType';
import { StepEntitlement }  from './policy/StepEntitlement';
import { StepApprovalFlow } from './policy/StepApprovalFlow';
import {
  PolicyFormValues,
  POLICY_FORM_DEFAULTS,
  WizardStep,
  getSteps,
} from './policy/PolicyFormTypes';

export type { PolicyFormValues };
export { POLICY_FORM_DEFAULTS };

const DEBOUNCE_MS = 400;

// ── Step progress indicator ───────────────────────────────────────────────────
const StepDots = ({
  steps, current,
}: { steps: WizardStep[]; current: WizardStep }) => {
  const idx = steps.indexOf(current);
  return (
    <div className="flex items-center gap-1.5 px-1">
      {steps.map((s, i) => (
        <div
          key={s}
          className={[
            'h-1.5 flex-1 rounded-full transition-all',
            i < idx  ? 'bg-primary'    : '',
            i === idx ? 'bg-primary'   : '',
            i > idx  ? 'bg-muted'      : '',
          ].join(' ')}
        />
      ))}
    </div>
  );
};

// ── Step labels ───────────────────────────────────────────────────────────────
const STEP_TITLES: Record<WizardStep, string> = {
  1: 'Policy Name',
  2: 'Leave Type',
  3: 'Entitlements',
  4: 'Approval Flow',
};

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

// ── Main component ────────────────────────────────────────────────────────────
export const PolicyFormDialog = ({
  mode, open, onOpenChange, initial, flows, onSubmit, isSubmitting,
}: PolicyFormDialogProps) => {
  const isAdd        = mode === 'add';
  const systemFlowId = flows.find(f => f.is_system)?.id ?? '';

  const [form, setForm]       = useState<PolicyFormValues>(POLICY_FORM_DEFAULTS);
  const [step, setStep]       = useState<WizardStep>(1);

  const [preview,       setPreview]       = useState<PolicyAllocationPreview | null>(null);
  const [previewLoad,   setPreviewLoad]   = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Reset on open ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setStep(1);
      setPreview(null);
      setForm({
        ...POLICY_FORM_DEFAULTS,
        ...initial,
        approval_flow_id: initial?.approval_flow_id ?? systemFlowId,
        associate_month:  new Date().getMonth() + 1,
      });
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Backend proration fetch (debounced) ────────────────────────────────────
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
        const internVal = form.intern_entitlement ? Number(form.intern_entitlement) : undefined;
        const data = await leaveService.previewPolicyAllocation(defaultVal, internVal, form.associate_month);
        setPreview(data);
      } catch {
        setPreview(null);
      } finally {
        setPreviewLoad(false);
      }
    }, DEBOUNCE_MS);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.default_entitlement, form.intern_entitlement, form.is_early, form.associate_month]);

  const patch = (partial: Partial<PolicyFormValues>) =>
    setForm(prev => ({ ...prev, ...partial }));

  const handleClose = () => { onOpenChange(false); setStep(1); };

  // Ordered list of steps for the current form state
  const steps    = getSteps(form.is_early);
  const stepIdx  = steps.indexOf(step);
  const goNext   = () => { if (stepIdx < steps.length - 1) setStep(steps[stepIdx + 1]); };
  const goBack   = () => { if (stepIdx > 0) setStep(steps[stepIdx - 1]); };

  const totalSteps  = steps.length;
  const currentNum  = stepIdx + 1;

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) handleClose(); }}>
      <DialogContent className="w-full max-w-md mx-auto max-h-[90vh] flex flex-col overflow-hidden">

        <DialogHeader className="shrink-0">
          <DialogTitle>{isAdd ? 'Add Leave Policy' : 'Edit Leave Policy'}</DialogTitle>
          <DialogDescription>
            Step {currentNum} of {totalSteps} — {STEP_TITLES[step]}
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 px-1">
          <StepDots steps={steps} current={step} />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {step === 1 && (
            <StepName
              form={form}
              onPatch={patch}
              onNext={goNext}
              onCancel={handleClose}
            />
          )}
          {step === 2 && (
            <StepLeaveType
              form={form}
              onPatch={patch}
              onNext={goNext}
              onBack={goBack}
            />
          )}
          {step === 3 && (
            <StepEntitlement
              form={form}
              preview={preview}
              previewLoad={previewLoad}
              selectedMonth={form.associate_month}
              onMonthChange={m => patch({ associate_month: m })}
              onPatch={patch}
              onNext={goNext}
              onBack={goBack}
            />
          )}
          {step === 4 && (
            <StepApprovalFlow
              form={form}
              flows={flows}
              isAdd={isAdd}
              isSubmitting={isSubmitting}
              preview={preview}
              onPatch={patch}
              onBack={goBack}
              onSubmit={e => { e.preventDefault(); onSubmit(form); }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
