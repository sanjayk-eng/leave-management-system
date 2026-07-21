import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import type { EditProfileForm } from '@/hooks/useDashboardActions';

interface EditProfileDialogProps {
  open:       boolean;
  onClose:    () => void;
  form:       EditProfileForm;
  onChange:   (form: EditProfileForm) => void;
  onSubmit:   () => void;
  isAdmin:    boolean;
  isUpdating: boolean;
}

export const EditProfileDialog = ({
  open, onClose, form, onChange, onSubmit, isAdmin, isUpdating,
}: EditProfileDialogProps) => (
  <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogDescription>
          Update your profile information.{' '}
          {!isAdmin && 'Only admins can update email and dates.'}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <Field label="Full Name" id="full_name">
          <Input
            id="full_name"
            value={form.full_name}
            onChange={(e) => onChange({ ...form, full_name: e.target.value })}
            placeholder="Enter full name"
          />
        </Field>

        <Field label="Email" id="email" hint={!isAdmin ? 'Only admins can update email' : undefined}>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => onChange({ ...form, email: e.target.value })}
            placeholder="Enter email"
            disabled={!isAdmin}
          />
        </Field>

        <Field label="Joining Date" id="joining_date" hint={!isAdmin ? 'Only admins can update joining date' : undefined}>
          <Input
            id="joining_date"
            type="date"
            value={form.joining_date}
            onChange={(e) => onChange({ ...form, joining_date: e.target.value })}
            disabled={!isAdmin}
          />
        </Field>

        <Field label="Ending Date (Optional)" id="ending_date"
          hint={!isAdmin ? 'Only admins can update ending date' : 'Leave empty if no end date'}>
          <Input
            id="ending_date"
            type="date"
            value={form.ending_date}
            onChange={(e) => onChange({ ...form, ending_date: e.target.value })}
            disabled={!isAdmin}
          />
        </Field>

        <Field label="Birth Date (Optional)" id="birth_date"
          hint={!isAdmin ? 'Only admins can update birth date' : 'Used for birthday notifications'}>
          <Input
            id="birth_date"
            type="date"
            value={form.birth_date}
            onChange={(e) => onChange({ ...form, birth_date: e.target.value })}
            disabled={!isAdmin}
          />
        </Field>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isUpdating}>Cancel</Button>
        <Button onClick={onSubmit} disabled={isUpdating}>
          {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// tiny helper to reduce repetition
const Field = ({
  label, id, hint, children,
}: { label: string; id: string; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    {children}
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);
