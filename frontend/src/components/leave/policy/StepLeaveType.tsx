// Step 2 — Leave type configuration (Paid / Early / WFH)

import { Button } from '@/components/ui/button';
import { Label }  from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge }  from '@/components/ui/badge';
import { Banknote, Clock3, MonitorSmartphone, Info } from 'lucide-react';
import type { PolicyFormValues } from './PolicyFormTypes';

interface Props {
  form:    PolicyFormValues;
  onPatch: (p: Partial<PolicyFormValues>) => void;
  onNext:  () => void;
  onBack:  () => void;
}

interface OptionProps {
  id:          string;
  icon:        React.ReactNode;
  title:       string;
  description: string;
  checked:     boolean;
  disabled?:   boolean;
  onChange:    (v: boolean) => void;
  badge?:      string;
  badgeCls?:   string;
}

const ToggleCard = ({
  id, icon, title, description, checked, disabled, onChange, badge, badgeCls,
}: OptionProps) => (
  <label
    htmlFor={id}
    className={[
      'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
      checked  ? 'border-primary/50 bg-primary/5' : 'border-border hover:bg-muted/40',
      disabled ? 'opacity-40 cursor-not-allowed' : '',
    ].join(' ')}
  >
    <div className={`mt-0.5 shrink-0 h-8 w-8 rounded-md flex items-center justify-center ${checked ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">{title}</span>
        {badge && (
          <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${badgeCls}`}>
            {badge}
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
    </div>
    <Switch
      id={id}
      checked={checked}
      disabled={disabled}
      onCheckedChange={onChange}
      className="mt-0.5 shrink-0"
    />
  </label>
);

export const StepLeaveType = ({ form, onPatch, onNext, onBack }: Props) => {
  const handleEarly = (v: boolean) =>
    onPatch({ is_early: v, is_work_from_home: v ? false : form.is_work_from_home });
  const handleWfh = (v: boolean) =>
    onPatch({ is_work_from_home: v, is_early: v ? false : form.is_early });

  return (
    <div className="space-y-4 py-4 px-1">
      <p className="text-sm text-muted-foreground">
        Select the characteristics that apply to <strong className="text-foreground">{form.name}</strong>.
      </p>

      <div className="space-y-2.5">
        <ToggleCard
          id="pf-paid"
          icon={<Banknote className="h-4 w-4" />}
          title="Paid Leave"
          description="Days off are paid. Eligible for monthly accrual."
          checked={form.is_paid}
          onChange={v => onPatch({ is_paid: v })}
          badge={form.is_paid ? 'Paid' : 'Unpaid'}
          badgeCls={form.is_paid ? 'border-green-400 text-green-600' : 'border-muted-foreground text-muted-foreground'}
        />
        <ToggleCard
          id="pf-early"
          icon={<Clock3 className="h-4 w-4" />}
          title="Early Leave"
          description="Short early-departure leave. Skips entitlement allocation and proration."
          checked={form.is_early}
          disabled={form.is_work_from_home}
          onChange={handleEarly}
          badge="No allocation"
          badgeCls="border-blue-400 text-blue-600"
        />
        <ToggleCard
          id="pf-wfh"
          icon={<MonitorSmartphone className="h-4 w-4" />}
          title="Work From Home"
          description="Employee works remotely. Cannot be combined with Early Leave."
          checked={form.is_work_from_home}
          disabled={form.is_early}
          onChange={handleWfh}
        />
      </div>

      {/* Early leave info note */}
      {form.is_early && (
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            Early Leave policies skip entitlement configuration and proration.
            The next step is the approval flow.
          </span>
        </div>
      )}

      <div className="flex gap-3 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          ← Back
        </Button>
        <Button type="button" className="flex-1" onClick={onNext}>
          Next →
        </Button>
      </div>
    </div>
  );
};
