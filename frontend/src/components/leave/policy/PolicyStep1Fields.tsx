// Step 1 of the policy form wizard: name, entitlements, paid/early/WFH toggles.

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { PolicyFormValues } from './PolicyFormTypes';

interface Props {
  form:       PolicyFormValues;
  isValid:    boolean;
  onPatch:    (partial: Partial<PolicyFormValues>) => void;
  onNext:     () => void;
  onCancel:   () => void;
}

export const PolicyStep1Fields = ({ form, isValid, onPatch, onNext, onCancel }: Props) => {
  const suggestedIntern = form.default_entitlement
    ? Math.floor(Number(form.default_entitlement) / 1.5)
    : 0;

  return (
    <div className="space-y-4 py-4">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="pf-name">Policy Name</Label>
        <Input
          id="pf-name"
          placeholder="e.g., Sick Leave"
          value={form.name}
          onChange={e => onPatch({ name: e.target.value })}
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
          onChange={e => onPatch({ default_entitlement: e.target.value })}
        />
      </div>

      {/* Intern entitlement */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="pf-intern">Default Entitlement (days) — Intern</Label>
          {form.default_entitlement && (
            <span className="text-xs text-blue-500">
              Suggested: <span className="font-medium">{suggestedIntern}</span> days
            </span>
          )}
        </div>
        <Input
          id="pf-intern"
          type="number"
          placeholder={form.default_entitlement ? String(suggestedIntern) : '5'}
          value={form.intern_entitlement}
          onChange={e => onPatch({ intern_entitlement: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">Optional — leave blank to use suggested value</p>
      </div>

      {/* Toggles */}
      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex items-center space-x-2">
          <Switch
            id="pf-paid"
            checked={form.is_paid}
            onCheckedChange={checked => onPatch({ is_paid: checked })}
          />
          <Label htmlFor="pf-paid">Paid Leave</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="pf-early"
            checked={form.is_early}
            onCheckedChange={checked =>
              onPatch({ is_early: checked, is_work_from_home: checked ? false : form.is_work_from_home })
            }
          />
          <Label htmlFor="pf-early">Early Leave</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="pf-wfh"
            checked={form.is_work_from_home}
            onCheckedChange={checked =>
              onPatch({ is_work_from_home: checked, is_early: checked ? false : form.is_early })
            }
          />
          <Label htmlFor="pf-wfh">Work From Home</Label>
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="button" className="flex-1" disabled={!isValid} onClick={onNext}>
          Next →
        </Button>
      </div>
    </div>
  );
};
