// Step 1 — Policy name

import { Button } from '@/components/ui/button';
import { Input }  from '@/components/ui/input';
import { Label }  from '@/components/ui/label';
import { FileText } from 'lucide-react';
import type { PolicyFormValues } from './PolicyFormTypes';

interface Props {
  form:     PolicyFormValues;
  onPatch:  (p: Partial<PolicyFormValues>) => void;
  onNext:   () => void;
  onCancel: () => void;
}

export const StepName = ({ form, onPatch, onNext, onCancel }: Props) => {
  const valid = form.name.trim().length > 0;

  return (
    <div className="space-y-5 py-4 px-1">
      <div className="flex flex-col items-center gap-2 pb-1">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground text-center">
          Give this leave policy a clear, recognisable name.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pf-name">Policy Name</Label>
        <Input
          id="pf-name"
          placeholder="e.g., Annual Leave, Sick Leave…"
          value={form.name}
          onChange={e => onPatch({ name: e.target.value })}
          onKeyDown={e => e.key === 'Enter' && valid && onNext()}
          autoFocus
        />
      </div>

      <div className="flex gap-3 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="button" className="flex-1" disabled={!valid} onClick={onNext}>
          Next →
        </Button>
      </div>
    </div>
  );
};
