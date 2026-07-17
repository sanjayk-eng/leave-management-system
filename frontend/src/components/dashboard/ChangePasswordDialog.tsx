import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Key, Eye, EyeOff, Check } from 'lucide-react';
import { validateSecurePassword } from '@/lib/passwordValidation';

interface ChangePasswordDialogProps {
  open:               boolean;
  onClose:            () => void;
  newPassword:        string;
  confirmPassword:    string;
  showNew:            boolean;
  showConfirm:        boolean;
  onNewChange:        (v: string) => void;
  onConfirmChange:    (v: string) => void;
  onToggleNew:        () => void;
  onToggleConfirm:    () => void;
  onGenerate:         () => void;
  onSubmit:           () => void;
  isUpdating:         boolean;
}

export const ChangePasswordDialog = ({
  open, onClose,
  newPassword, confirmPassword,
  showNew, showConfirm,
  onNewChange, onConfirmChange,
  onToggleNew, onToggleConfirm,
  onGenerate, onSubmit, isUpdating,
}: ChangePasswordDialogProps) => {
  const { isValid, errors } = newPassword ? validateSecurePassword(newPassword) : { isValid: false, errors: [] };
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Change Password
          </DialogTitle>
          <DialogDescription>
            Must contain: 1 uppercase, 1 lowercase, 1 digit, 1 special character (@#$%&*!?)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Generate button */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">🔐 Generate Secure Password</p>
              <p className="text-xs text-blue-700 dark:text-blue-300">Auto-generate a 10-character secure password</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onGenerate}
              className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300">
              Generate
            </Button>
          </div>

          {/* New password */}
          <div className="space-y-2">
            <Label htmlFor="new_password">New Password</Label>
            <div className="relative">
              <Input
                id="new_password"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => onNewChange(e.target.value)}
                placeholder="Enter new password"
                className="pr-10"
              />
              <button type="button" onClick={onToggleNew}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirm_password"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => onConfirmChange(e.target.value)}
                placeholder="Confirm new password"
                className="pr-10"
              />
              <button type="button" onClick={onToggleConfirm}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Validation errors */}
          {newPassword && !isValid && (
            <ul className="text-xs text-destructive space-y-1 bg-destructive/5 p-2 rounded-md">
              {errors.map((err, i) => (
                <li key={i} className="flex items-center gap-1"><span>•</span>{err}</li>
              ))}
            </ul>
          )}

          {/* Mismatch */}
          {newPassword && confirmPassword && !passwordsMatch && (
            <p className="text-sm text-destructive">Passwords do not match</p>
          )}

          {/* Ready indicator */}
          {newPassword && isValid && passwordsMatch && (
            <div className="flex items-center gap-2 text-sm text-success">
              <Check className="h-4 w-4" />
              Password is valid and ready to update
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUpdating}>Cancel</Button>
          <Button onClick={onSubmit} disabled={isUpdating}>
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
