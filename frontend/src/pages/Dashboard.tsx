/**
 * Dashboard — thin orchestrator.
 *
 * All state + handlers live in useDashboardActions.
 * Each visual section is its own focused component.
 */
import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Undo2 } from 'lucide-react';

import { useAuth }            from '@/hooks/useAuth';
import { useLeaves, useMyLeaves } from '@/hooks/useLeaves';
import { useLeaveBalances }   from '@/hooks/useLeaveBalances';
import { useEmployeeProfile } from '@/hooks/useEmployees';
import { isManagerOrAbove }   from '@/lib/permissions';
import { useDashboardActions } from '@/hooks/useDashboardActions';

import { DashboardProfileCard }      from '@/components/dashboard/DashboardProfileCard';
import { DashboardStatsStrip }       from '@/components/dashboard/DashboardStatsStrip';
import { DashboardTodaysLeaves }     from '@/components/dashboard/DashboardTodaysLeaves';
import { DashboardLeaveBalanceCard } from '@/components/dashboard/DashboardLeaveBalanceCard';
import { DashboardAssetsCard }       from '@/components/dashboard/DashboardAssetsCard';
import { DashboardPendingApprovals } from '@/components/dashboard/DashboardPendingApprovals';
import { EditProfileDialog }         from '@/components/dashboard/EditProfileDialog';
import { ChangePasswordDialog }      from '@/components/dashboard/ChangePasswordDialog';
import { LeaveBalanceSheet }         from '@/components/LeaveBalanceSheet';
import { AssignedAssetsSheet }       from '@/components/AssignedAssetsSheet';
import { TodaysLeavesSheet }         from '@/components/TodaysLeavesSheet';
import { TodayBirthdays }            from '@/components/TodayBirthdays';
import { BirthdayList }              from '@/components/BirthdayList';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const Dashboard = () => {
  const { currentUser } = useAuth();

  // ── Data ───────────────────────────────────────────────────────────────────
  const {
    employee: profileData,
    isLoading: isLoadingProfile,
    updateInfo, isUpdating,
    updatePassword, isUpdatingPassword,
  } = useEmployeeProfile(currentUser?.id);

  const {
    leaves, isLoading: isLoadingLeaves, error: leavesError,
    refetch: refetchLeaves,
    cancelLeave, isCancelling,
    withdrawLeave, isWithdrawing,
  } = useLeaves();

  // useMyLeaves — calls /leaves/my-leaves (no permission guard).
  // Drives the "My Applications" stat — isolated from useLeaves errors.
  const {
    total: myLeavesCount,
    isLoading: isLoadingMyLeaves,
    error: myLeavesError,
    refetch: refetchMyLeaves,
  } = useMyLeaves();

  const {
    balances, isLoading: isLoadingBalances, error: balancesError,
    refetch: refetchBalances,
  } = useLeaveBalances(currentUser?.id ?? '');

  // ── Derived values ─────────────────────────────────────────────────────────
  const isAdmin         = currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'ADMIN';
  const isAdminOrManager = isManagerOrAbove(currentUser?.role?.toUpperCase() ?? '');
  const totalBalance    = balances.reduce((s, b) => s + b.available, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Today's leaves — only meaningful for managers/admins who can see the team.
  // EMPLOYEE and INTERN do not see this section at all.
  const todaysLeaves = isAdminOrManager
    ? (leaves ?? []).filter(l => {
        const s = new Date(l.start_date); s.setHours(0, 0, 0, 0);
        const e = new Date(l.end_date);   e.setHours(0, 0, 0, 0);
        return s <= today && e >= today;
      })
    : [];

  const pendingLeaves = (leaves ?? []).filter(l => {
    const s = l.status.toUpperCase();
    return !['APPROVED', 'REJECTED', 'CANCELLED', 'WITHDRAWN'].includes(s) && s !== 'WITHDRAWAL_PENDING';
  });
  // ── All handlers + dialog state ────────────────────────────────────────────
  const actions = useDashboardActions({
    isAdmin,
    profileData: profileData ?? null,
    updateInfo,
    updatePassword,
    cancelLeave,
    withdrawLeave,
    isCancelling,
    isWithdrawing,
  });

  const [assetsSheetOpen, setAssetsSheetOpen]       = useState(false);
  const [todaysLeavesSheetOpen, setTodaysLeavesSheetOpen] = useState(false);

  // ── Layout ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Welcome header */}
      <div className="border-b pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Good {getGreeting()}, {profileData?.full_name?.split(' ')[0] ?? currentUser?.email ?? 'there'}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Profile card */}
      {profileData && (
        <DashboardProfileCard
          profileData={profileData}
          onEditProfile={actions.openEditProfile}
          onChangePassword={() => actions.setPasswordDialogOpen(true)}
        />
      )}

      {/* Stats strip */}
      <DashboardStatsStrip
        totalBalance={totalBalance}
        myLeavesCount={myLeavesCount}
        myLeavesLoading={isLoadingMyLeaves}
        myLeavesError={myLeavesError as Error | null}
        refetchMyLeaves={refetchMyLeaves}
        pendingCount={pendingLeaves.length}
        leaveTypesCount={balances.length}
        isAdminOrManager={isAdminOrManager}
        isLoadingLeaves={isLoadingLeaves}
        isLoadingBalances={isLoadingBalances}
        leavesError={leavesError as Error | null}
        balancesError={balancesError as Error | null}
        refetchLeaves={refetchLeaves}
        refetchBalances={refetchBalances}
      />

      {/* Main 3-column row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">

        {/* Today's Leaves — managers/admins only */}
        {isAdminOrManager && (
          <DashboardTodaysLeaves
            leaves={todaysLeaves}
            isLoading={isLoadingLeaves}
            error={leavesError as Error | null}
            isAdminOrManager={isAdminOrManager}
            onRetry={refetchLeaves}
            onViewLeaves={() => setTodaysLeavesSheetOpen(true)}
          />
        )}

        <DashboardLeaveBalanceCard
          balances={balances}
          totalBalance={totalBalance}
          isLoading={isLoadingBalances}
          error={balancesError as Error | null}
          onRetry={refetchBalances}
          onViewBalances={() => actions.setBalanceSheetOpen(true)}
        />

        {/* Assets card */}
        {currentUser?.id && (
          <DashboardAssetsCard
            employeeId={currentUser.id}
            employeeName={profileData?.full_name}
            onViewAssets={() => setAssetsSheetOpen(true)}
          />
        )}
      </div>

      {/* Birthday strips */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TodayBirthdays />
        <BirthdayList maxHeight={340} />
      </div>

      {/* Pending approvals — admin/manager only */}
      {isAdminOrManager && !isLoadingLeaves && (
        <DashboardPendingApprovals leaves={pendingLeaves} />
      )}

      {/* ── Dialogs + Sheet ──────────────────────────────────────────────── */}

      <EditProfileDialog
        open={actions.editDialogOpen}
        onClose={() => actions.setEditDialogOpen(false)}
        form={actions.editForm}
        onChange={actions.setEditForm}
        onSubmit={actions.submitEditProfile}
        isAdmin={isAdmin}
        isUpdating={isUpdating}
      />

      <ChangePasswordDialog
        open={actions.passwordDialogOpen}
        onClose={actions.closePasswordDialog}
        newPassword={actions.newPassword}
        confirmPassword={actions.confirmPassword}
        showNew={actions.showNewPassword}
        showConfirm={actions.showConfirmPassword}
        onNewChange={actions.setNewPassword}
        onConfirmChange={actions.setConfirmPassword}
        onToggleNew={() => actions.setShowNewPassword(v => !v)}
        onToggleConfirm={() => actions.setShowConfirmPassword(v => !v)}
        onGenerate={actions.generateSecurePassword}
        onSubmit={actions.submitChangePassword}
        isUpdating={isUpdatingPassword}
      />

      {/* Cancel leave */}
      <AlertDialog open={actions.cancelDialogOpen} onOpenChange={actions.setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Leave</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this leave application? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => actions.setCancelDialogOpen(false)}>
              Keep Leave
            </AlertDialogCancel>
            <AlertDialogAction onClick={actions.confirmCancelLeave} disabled={isCancelling}>
              {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, Cancel Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Withdraw leave */}
      <Dialog open={actions.withdrawDialogOpen} onOpenChange={actions.setWithdrawDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Undo2 className="h-5 w-5 text-orange-600" />
              Withdraw Approved Leave
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to withdraw this approved leave? The leave balance will be restored.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="withdraw_reason">Reason for Withdrawal (Optional)</Label>
              <Textarea
                id="withdraw_reason"
                value={actions.withdrawReason}
                onChange={(e) => actions.setWithdrawReason(e.target.value)}
                placeholder="Enter reason for withdrawing this leave..."
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Providing a reason helps maintain transparency in leave management.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline"
              onClick={() => actions.setWithdrawDialogOpen(false)}
              disabled={isWithdrawing}>
              Cancel
            </Button>
            <Button onClick={actions.confirmWithdraw} disabled={isWithdrawing}
              className="bg-orange-600 hover:bg-orange-700">
              {isWithdrawing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Withdrawal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave balance sheet */}
      <LeaveBalanceSheet
        open={actions.balanceSheetOpen}
        onOpenChange={actions.setBalanceSheetOpen}
        employeeId={currentUser?.id ?? ''}
        employeeName={profileData?.full_name ?? currentUser?.email ?? ''}
      />

      {/* Assigned assets sheet */}
      <AssignedAssetsSheet
        open={assetsSheetOpen}
        onOpenChange={setAssetsSheetOpen}
        employeeId={currentUser?.id ?? ''}
        employeeName={profileData?.full_name ?? currentUser?.email ?? ''}
      />

      {/* Today's leaves sheet — managers/admins only */}
      {isAdminOrManager && (
        <TodaysLeavesSheet
          open={todaysLeavesSheetOpen}
          onOpenChange={setTodaysLeavesSheetOpen}
          leaves={todaysLeaves}
          isAdminOrManager={isAdminOrManager}
        />
      )}

    </div>
  );
};

export default Dashboard;
