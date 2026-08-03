// Shared types and defaults for the leave policy form.
// Kept in a plain .ts file so it can be imported by both the dialog
// and the parent page without pulling in any JSX.

export interface PolicyFormValues {
  name:                string;
  is_paid:             boolean;
  is_early:            boolean;
  is_work_from_home:   boolean;
  default_entitlement: string;
  intern_entitlement:  string;
  approval_flow_id:    string; // "" = none
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
