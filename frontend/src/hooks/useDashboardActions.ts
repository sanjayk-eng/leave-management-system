/**
 * useDashboardActions — all stateful logic for the Dashboard page.
 *
 * Extracted so Dashboard.tsx becomes a thin layout-only orchestrator.
 * Each "feature" (cancel leave, withdraw, edit profile, change password)
 * lives here with its own state + handlers.
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { dateInputToISO } from '@/lib/dateUtils';
import { validateSecurePassword } from '@/lib/passwordValidation';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EditProfileForm {
  full_name:    string;
  email:        string;
  joining_date: string;
  ending_date:  string;
  birth_date:   string;
}

interface ProfileData {
  full_name:        string;
  email:            string;
  joining_date?:    string | null;
  ending_date?:     string | null;
  birth_date?:      string | null;
  designation_name?: string | null;
  manager_name?:    string | null;
  role:             string;
}

interface UseDashboardActionsOptions {
  isAdmin:        boolean;
  profileData:    ProfileData | null | undefined;
  updateInfo:     (updates: Record<string, string | null>) => void;
  updatePassword: (password: string) => void;
  cancelLeave:    (id: string) => void;
  withdrawLeave:  (payload: { id: string; reason?: string }) => void;
  isCancelling:   boolean;
  isWithdrawing:  boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDashboardActions({
  isAdmin,
  profileData,
  updateInfo,
  updatePassword,
  cancelLeave,
  withdrawLeave,
  isCancelling,
  isWithdrawing,
}: UseDashboardActionsOptions) {

  // ── Balance sheet ─────────────────────────────────────────────────────────
  const [balanceSheetOpen, setBalanceSheetOpen] = useState(false);

  // ── Edit profile ──────────────────────────────────────────────────────────
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditProfileForm>({
    full_name: '', email: '', joining_date: '', ending_date: '', birth_date: '',
  });

  const openEditProfile = () => {
    if (!profileData) return;
    setEditForm({
      full_name:    profileData.full_name,
      email:        profileData.email,
      joining_date: profileData.joining_date ? profileData.joining_date.split('T')[0] : '',
      ending_date:  profileData.ending_date  ? profileData.ending_date.split('T')[0]  : '',
      birth_date:   profileData.birth_date   ? profileData.birth_date.split('T')[0]   : '',
    });
    setEditDialogOpen(true);
  };

  const submitEditProfile = () => {
    if (!profileData) return;
    const updates: Record<string, string | null> = {};

    if (editForm.full_name !== profileData.full_name)
      updates.full_name = editForm.full_name;

    if (isAdmin && editForm.email !== profileData.email)
      updates.email = editForm.email;

    if (isAdmin) {
      const curJoin  = profileData.joining_date ? profileData.joining_date.split('T')[0] : '';
      const curEnd   = profileData.ending_date  ? profileData.ending_date.split('T')[0]  : '';
      const curBirth = profileData.birth_date   ? profileData.birth_date.split('T')[0]   : '';

      if (editForm.joining_date && editForm.joining_date !== curJoin)
        updates.joining_date = dateInputToISO(editForm.joining_date);
      if (editForm.ending_date !== curEnd)
        updates.ending_date = editForm.ending_date ? dateInputToISO(editForm.ending_date) : null;
      if (editForm.birth_date !== curBirth)
        updates.birth_date = editForm.birth_date ? dateInputToISO(editForm.birth_date) : null;
    }

    if (Object.keys(updates).length > 0) {
      updateInfo(updates);
      setEditDialogOpen(false);
    }
  };

  // ── Change password ───────────────────────────────────────────────────────
  const [passwordDialogOpen, setPasswordDialogOpen]     = useState(false);
  const [newPassword,         setNewPassword]           = useState('');
  const [confirmPassword,     setConfirmPassword]       = useState('');
  const [showNewPassword,     setShowNewPassword]       = useState(false);
  const [showConfirmPassword, setShowConfirmPassword]   = useState(false);

  const generateSecurePassword = () => {
    const sets = [
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      'abcdefghijklmnopqrstuvwxyz',
      '0123456789',
      '@#$%&*!?',
    ];
    const counts = [3, 3, 2, 2];
    const getRandom = (chars: string) => {
      const arr = new Uint32Array(1);
      crypto.getRandomValues(arr);
      return chars[arr[0] % chars.length];
    };
    let pwd = sets.flatMap((s, i) => Array.from({ length: counts[i] }, () => getRandom(s))).join('');
    const letters = pwd.split('');
    for (let i = letters.length - 1; i > 0; i--) {
      const rand = new Uint32Array(1);
      crypto.getRandomValues(rand);
      const j = rand[0] % (i + 1);
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    const generated = letters.join('');
    setNewPassword(generated);
    setConfirmPassword(generated);
    setShowNewPassword(true);
    setShowConfirmPassword(true);
    toast.success('Secure password generated!');
  };

  const submitChangePassword = () => {
    if (!newPassword) { toast.error('Password is required'); return; }
    const { isValid, errors } = validateSecurePassword(newPassword);
    if (!isValid) { toast.error(errors[0] || 'Password does not meet security requirements'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    updatePassword(newPassword);
    setPasswordDialogOpen(false);
    setNewPassword(''); setConfirmPassword('');
    setShowNewPassword(false); setShowConfirmPassword(false);
  };

  const closePasswordDialog = () => {
    setPasswordDialogOpen(false);
    setNewPassword(''); setConfirmPassword('');
    setShowNewPassword(false); setShowConfirmPassword(false);
  };

  // ── Cancel leave ──────────────────────────────────────────────────────────
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelLeaveId,    setCancelLeaveId]    = useState('');

  const handleCancelLeave = (leaveId: string, leaveStatus: string) => {
    const s = leaveStatus.toUpperCase();
    if (s === 'APPROVED') { toast.error('Cannot cancel approved leave. Please contact your manager or admin'); return; }
    if (s === 'REJECTED' || s === 'CANCELLED') { toast.error(`Leave is already ${leaveStatus.toLowerCase()}`); return; }
    setCancelLeaveId(leaveId);
    setCancelDialogOpen(true);
  };

  const confirmCancelLeave = () => {
    if (!cancelLeaveId) return;
    cancelLeave(cancelLeaveId);
    setCancelDialogOpen(false);
    setCancelLeaveId('');
  };

  // ── Withdraw leave ────────────────────────────────────────────────────────
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawLeaveId,    setWithdrawLeaveId]    = useState('');
  const [withdrawReason,     setWithdrawReason]     = useState('');

  const handleWithdrawLeave = (leaveId: string, leaveStatus: string) => {
    if (leaveStatus.toUpperCase() !== 'APPROVED') { toast.error('Only approved leaves can be withdrawn'); return; }
    setWithdrawLeaveId(leaveId);
    setWithdrawReason('');
    setWithdrawDialogOpen(true);
  };

  const confirmWithdraw = () => {
    if (!withdrawLeaveId) return;
    withdrawLeave({ id: withdrawLeaveId, reason: withdrawReason || undefined });
    setWithdrawDialogOpen(false);
    setWithdrawLeaveId('');
    setWithdrawReason('');
  };

  return {
    // balance sheet
    balanceSheetOpen, setBalanceSheetOpen,

    // edit profile
    editDialogOpen, setEditDialogOpen,
    editForm, setEditForm,
    openEditProfile, submitEditProfile,

    // password
    passwordDialogOpen, setPasswordDialogOpen,
    newPassword, setNewPassword,
    confirmPassword, setConfirmPassword,
    showNewPassword, setShowNewPassword,
    showConfirmPassword, setShowConfirmPassword,
    generateSecurePassword, submitChangePassword, closePasswordDialog,

    // cancel leave
    cancelDialogOpen, setCancelDialogOpen,
    cancelLeaveId,
    handleCancelLeave, confirmCancelLeave,
    isCancelling,

    // withdraw leave
    withdrawDialogOpen, setWithdrawDialogOpen,
    withdrawReason, setWithdrawReason,
    handleWithdrawLeave, confirmWithdraw,
    isWithdrawing,
  };
}
