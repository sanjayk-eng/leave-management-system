// Shared types and defaults for the leave policy form wizard.

export interface PolicyFormValues {
  name:                string;
  is_paid:             boolean;
  is_early:            boolean;
  is_work_from_home:   boolean;
  default_entitlement: string;
  intern_entitlement:  string;
  approval_flow_id:    string; // "" = none
  associate_month:     number; // 1-12: the month used as the proration anchor when creating the policy
}

export const POLICY_FORM_DEFAULTS: PolicyFormValues = {
  name:                '',
  is_paid:             true,
  is_early:            false,
  is_work_from_home:   false,
  default_entitlement: '',
  intern_entitlement:  '',
  approval_flow_id:    '',
  associate_month:     new Date().getMonth() + 1,
};

// Wizard steps:
//  1 → Name
//  2 → Leave type (Paid / Early / WFH)
//  3 → Entitlements + proration preview   (skipped when is_early = true)
//  4 → Approval flow + submit
export type WizardStep = 1 | 2 | 3 | 4;

/** Returns the ordered list of steps for the current form state. */
export function getSteps(isEarly: boolean): WizardStep[] {
  return isEarly ? [1, 2, 4] : [1, 2, 3, 4];
}
