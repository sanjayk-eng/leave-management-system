// Confirm-delete alert dialog for leave policies.

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  open:      boolean;
  onCancel:  () => void;
  onConfirm: () => void;
}

export const PolicyDeleteDialog = ({ open, onCancel, onConfirm }: Props) => (
  <AlertDialog open={open} onOpenChange={o => { if (!o) onCancel(); }}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete Leave Policy</AlertDialogTitle>
        <AlertDialogDescription>
          This permanently removes the policy. You can only delete policies that have no leave
          applications. To temporarily stop employees from applying, deactivate it instead.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          Delete Policy
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
