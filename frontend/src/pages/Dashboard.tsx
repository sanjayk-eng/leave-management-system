import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { useLeaves } from "@/hooks/useLeaves";
import { useLeaveBalances } from "@/hooks/useLeaveBalances";
import { useEmployeeProfile } from "@/hooks/useEmployees";
import { isManagerOrAbove } from "@/lib/permissions";
import { formatDate, dateInputToISO } from "@/lib/dateUtils";
import { validateSecurePassword } from "@/lib/passwordValidation";
import { Calendar, Clock, DollarSign, Users, Loader2, User, Mail, Briefcase, CalendarDays, Edit, Key, Undo2, Check, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import EmployeeEquipmentDashboard from "@/components/equipment/EmployeeEquipmentDashboard";
import { TodayBirthdays } from "@/components/TodayBirthdays";
import { BirthdayList } from "@/components/BirthdayList";

const Dashboard = () => {
  const { currentUser } = useAuth();

  const { employee: profileData, isLoading: isLoadingProfile, updateInfo, isUpdating, updatePassword, isUpdatingPassword } = useEmployeeProfile(currentUser?.id);
  const { leaves, isLoading: isLoadingLeaves, error: leavesError, refetch: refetchLeaves, cancelLeave, isCancelling, withdrawLeave, isWithdrawing } = useLeaves();
  const { balances, detailedBalances, isLoading: isLoadingBalances, error: balancesError, refetch: refetchBalances } = useLeaveBalances(currentUser?.id || "");

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    joining_date: "",
    ending_date: "",
    birth_date: "",
  });

  // Cancel leave dialog state — replaces window.confirm
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelLeaveId, setCancelLeaveId] = useState<string>("");

  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawLeaveId, setWithdrawLeaveId] = useState<string>("");
  const [withdrawReason, setWithdrawReason] = useState("");

  const isAdmin = currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'ADMIN';

  const handleCancelLeave = (leaveId: string, leaveStatus: string) => {
    if (leaveStatus.toUpperCase() === 'APPROVED') {
      toast.error('Cannot cancel approved leave. Please contact your manager or admin');
      return;
    }
    if (leaveStatus.toUpperCase() === 'REJECTED' || leaveStatus.toUpperCase() === 'CANCELLED') {
      toast.error(`Leave is already ${leaveStatus.toLowerCase()}`);
      return;
    }
    // Open AlertDialog instead of window.confirm
    setCancelLeaveId(leaveId);
    setCancelDialogOpen(true);
  };

  const confirmCancelLeave = () => {
    if (!cancelLeaveId) return;
    cancelLeave(cancelLeaveId);
    setCancelDialogOpen(false);
    setCancelLeaveId("");
  };

  const handleWithdrawLeave = (leaveId: string, leaveStatus: string) => {
    if (leaveStatus.toUpperCase() !== 'APPROVED') {
      toast.error('Only approved leaves can be withdrawn');
      return;
    }
    setWithdrawLeaveId(leaveId);
    setWithdrawReason("");
    setWithdrawDialogOpen(true);
  };

  const confirmWithdraw = () => {
    if (!withdrawLeaveId) return;
    withdrawLeave({ id: withdrawLeaveId, reason: withdrawReason || undefined });
    setWithdrawDialogOpen(false);
    setWithdrawLeaveId("");
    setWithdrawReason("");
  };

  const handleEditProfile = () => {
    if (profileData) {
      const joiningDateStr = profileData.joining_date ? profileData.joining_date.split('T')[0] : '';
      const endingDateStr = profileData.ending_date ? profileData.ending_date.split('T')[0] : '';
      const birthDateStr = profileData.birth_date ? profileData.birth_date.split('T')[0] : '';
      setEditForm({
        full_name: profileData.full_name,
        email: profileData.email,
        joining_date: joiningDateStr,
        ending_date: endingDateStr,
        birth_date: birthDateStr,
      });
      setEditDialogOpen(true);
    }
  };

  const handleUpdateProfile = () => {
    const updates: Record<string, string | null> = {};
    if (editForm.full_name !== profileData?.full_name) {
      updates.full_name = editForm.full_name;
    }
    if (isAdmin && editForm.email !== profileData?.email) {
      updates.email = editForm.email;
    }
    if (isAdmin) {
      const currentJoiningDate = profileData?.joining_date ? profileData.joining_date.split('T')[0] : '';
      if (editForm.joining_date && editForm.joining_date !== currentJoiningDate) {
        updates.joining_date = dateInputToISO(editForm.joining_date);
      }
      const currentEndingDate = profileData?.ending_date ? profileData.ending_date.split('T')[0] : '';
      if (editForm.ending_date !== currentEndingDate) {
        updates.ending_date = editForm.ending_date ? dateInputToISO(editForm.ending_date) : null;
      }
      const currentBirthDate = profileData?.birth_date ? profileData.birth_date.split('T')[0] : '';
      if (editForm.birth_date !== currentBirthDate) {
        updates.birth_date = editForm.birth_date ? dateInputToISO(editForm.birth_date) : null;
      }
    }
    if (Object.keys(updates).length > 0) {
      updateInfo(updates);
      setEditDialogOpen(false);
    }
  };

  // Fixed: uses crypto.getRandomValues() instead of Math.random()
  const generateSecurePassword = () => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const special = '@#$%&*!?';

    const getRandomChar = (chars: string) => {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      return chars[array[0] % chars.length];
    };

    let password = '';
    for (let i = 0; i < 3; i++) password += getRandomChar(uppercase);
    for (let i = 0; i < 3; i++) password += getRandomChar(lowercase);
    for (let i = 0; i < 2; i++) password += getRandomChar(digits);
    for (let i = 0; i < 2; i++) password += getRandomChar(special);

    // Cryptographically secure shuffle (Fisher-Yates)
    const arr = password.split('');
    for (let i = arr.length - 1; i > 0; i--) {
      const rand = new Uint32Array(1);
      crypto.getRandomValues(rand);
      const j = rand[0] % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    password = arr.join('');

    setNewPassword(password);
    setConfirmPassword(password);
    setShowNewPassword(true);
    setShowConfirmPassword(true);
    toast.success('Secure password generated!');
  };

  const handleChangePassword = () => {
    if (!newPassword) { toast.error('Password is required'); return; }
    const validation = validateSecurePassword(newPassword);
    if (!validation.isValid) {
      toast.error(validation.errors[0] || 'Password does not meet security requirements');
      return;
    }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    updatePassword(newPassword);
    setPasswordDialogOpen(false);
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const pendingLeaves = (leaves && Array.isArray(leaves)) ? leaves.filter(l => {
    const status = l.status.toUpperCase();
    const excludedStatuses = ['APPROVED', 'REJECTED', 'CANCELLED', 'WITHDRAWN'];
    return !excludedStatuses.includes(status) && status !== 'WITHDRAWAL_PENDING';
  }) : [];

  const totalBalance = (balances && Array.isArray(balances)) ? balances.reduce((sum, b) => sum + b.available, 0) : 0;
  const userRole = currentUser?.role?.toUpperCase() || '';
  const isAdminOrManager = isManagerOrAbove(userRole);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaysLeaves = (leaves && Array.isArray(leaves)) ? leaves.filter(l => {
    const startDate = new Date(l.start_date);
    const endDate = new Date(l.end_date);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    const isToday = startDate <= today && endDate >= today;
    if (isToday) {
      if (isAdminOrManager) return true;
      return profileData?.full_name && l.employee === profileData.full_name;
    }
    return false;
  }) : [];

  const myLeaves = (leaves && Array.isArray(leaves) && profileData?.full_name)
    ? leaves.filter(leave => leave.employee === profileData.full_name)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {currentUser?.email || 'User'}</h1>
          <p className="text-muted-foreground">Here's what's happening today</p>
        </div>
      </div>

      {profileData && (
        <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  My Profile
                </CardTitle>
                <CardDescription>Your employee information</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setPasswordDialogOpen(true)} variant="outline" size="sm" className="gap-2">
                  <Key className="h-4 w-4" />
                  Change Password
                </Button>
                <Button onClick={handleEditProfile} variant="outline" size="sm" className="gap-2">
                  <Edit className="h-4 w-4" />
                  Edit Profile
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
                <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
                  <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Full Name</p>
                  <p className="text-sm font-bold mt-1">{profileData.full_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
                <div className="p-2 bg-green-100 dark:bg-green-950 rounded-lg">
                  <Mail className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Email</p>
                  <p className="text-sm font-bold mt-1">{profileData.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
                <div className="p-2 bg-purple-100 dark:bg-purple-950 rounded-lg">
                  <Briefcase className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Role</p>
                  <Badge className="mt-1">{profileData.role}</Badge>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
                <div className="p-2 bg-orange-100 dark:bg-orange-950 rounded-lg">
                  <CalendarDays className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Joining Date</p>
                  <p className="text-sm font-bold mt-1">{formatDate(profileData.joining_date)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
                <div className="p-2 bg-red-100 dark:bg-red-950 rounded-lg">
                  <CalendarDays className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Ending Date</p>
                  <p className="text-sm font-bold mt-1">
                    {profileData.ending_date ? formatDate(profileData.ending_date) : <span className="text-muted-foreground italic">-</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
                <div className="p-2 bg-pink-100 dark:bg-pink-950 rounded-lg">
                  <CalendarDays className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Birth Date</p>
                  <p className="text-sm font-bold mt-1">
                    {profileData.birth_date ? formatDate(profileData.birth_date) : <span className="text-muted-foreground italic">Not set</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
                <div className="p-2 bg-cyan-100 dark:bg-cyan-950 rounded-lg">
                  <Briefcase className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Designation</p>
                  <p className="text-sm font-bold mt-1">
                    {profileData.designation_name || <span className="text-muted-foreground italic">Not Assigned</span>}
                  </p>
                </div>
              </div>
              {profileData.manager_name && (
                <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-950 rounded-lg">
                    <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Manager</p>
                    <p className="text-sm font-bold mt-1">{profileData.manager_name}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leave Balance</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBalance} days</div>
            <p className="text-xs text-muted-foreground">Available for this year</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Leaves</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingLeaves ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : leavesError ? (
              <div className="text-center">
                <p className="text-sm text-destructive">Error loading</p>
                <Button onClick={() => refetchLeaves()} variant="ghost" size="sm" className="mt-1">Retry</Button>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{myLeaves.length}</div>
                <p className="text-xs text-muted-foreground">My total applications</p>
              </>
            )}
          </CardContent>
        </Card>
        {isAdminOrManager && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingLeaves.length}</div>
              <p className="text-xs text-muted-foreground">Awaiting your action</p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leave Types</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingBalances ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : balancesError ? (
              <div className="text-center">
                <p className="text-sm text-destructive">Error loading</p>
                <Button onClick={() => refetchBalances()} variant="ghost" size="sm" className="mt-1">Retry</Button>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{balances.length}</div>
                <p className="text-xs text-muted-foreground">Available types</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Today's Leaves</CardTitle>
            <CardDescription>{isAdminOrManager ? 'Who is on leave today' : 'Your leave status today'}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingLeaves ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </div>
            ) : leavesError ? (
              <div className="flex flex-col items-center justify-center py-4 space-y-2">
                <p className="text-sm text-destructive">{leavesError.message}</p>
                <Button onClick={() => refetchLeaves()} variant="outline" size="sm">Retry</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {todaysLeaves.length > 0 ? todaysLeaves.map((leave) => (
                  <div key={leave.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{isAdminOrManager ? leave.employee : 'You'}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{leave.leave_type}: {formatDate(leave.start_date)} - {formatDate(leave.end_date)}</span>
                        {leave.leave_timing_type && (
                          <span className="text-indigo-600 font-medium">
                            • {leave.leave_timing_type === 'FIRST_HALF' ? 'First Half' :
                               leave.leave_timing_type === 'SECOND_HALF' ? 'Second Half' :
                               leave.leave_timing_type === 'EARLY' ? 'Early Leave' : 'Full Day'}
                            {leave.leave_timing && ` (${leave.leave_timing})`}
                          </span>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={leave.status} approvalName={leave.approval_name} />
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {isAdminOrManager ? 'No one is on leave today' : 'You are not on leave today'}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leave Balances</CardTitle>
            <CardDescription>Your available leave days</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingBalances ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : balancesError ? (
              <div className="flex flex-col items-center justify-center py-4 space-y-2">
                <p className="text-sm text-destructive">{balancesError.message}</p>
                <Button onClick={() => refetchBalances()} variant="outline" size="sm">Retry</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {detailedBalances.map((balance, index) => (
                  <div key={`${balance.leave_type}-${index}`} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-medium">{balance.leave_type}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <span>Used: {balance.used}</span>
                        <span>Total: {balance.total}</span>
                        {balance.adjusted !== undefined && (
                          <span className="col-span-2 text-blue-600 font-medium">
                            Adjusted: {balance.adjusted > 0 ? '+' : ''}{balance.adjusted}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{balance.available}</div>
                      <p className="text-xs text-muted-foreground">available</p>
                    </div>
                  </div>
                ))}
                {detailedBalances.length === 0 && balances.length > 0 && balances.map((balance, index) => (
                  <div key={`fallback-${balance.leave_type}-${index}`} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{balance.leave_type}</p>
                      <p className="text-xs text-muted-foreground">Used: {balance.used} / Total: {balance.total}</p>
                    </div>
                    <div className="text-2xl font-bold">{balance.available}</div>
                  </div>
                ))}
                {detailedBalances.length === 0 && balances.length === 0 && (
                  <p className="text-sm text-muted-foreground">No leave balances available</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {currentUser?.id && !isLoadingProfile ? (
          <Card>
            <CardContent className="p-6">
              <EmployeeEquipmentDashboard employeeId={currentUser.id} employeeName={profileData?.full_name} />
            </CardContent>
          </Card>
        ) : currentUser?.id && isLoadingProfile ? (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-24 w-24 rounded-full mx-auto" />
                <Skeleton className="h-6 w-48 mx-auto" />
                <Skeleton className="h-4 w-32 mx-auto" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground">
                <p>⚠️ No user ID available for equipment dashboard</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TodayBirthdays />
        <BirthdayList maxHeight={340} />
      </div>

      {isAdminOrManager && !isLoadingLeaves && pendingLeaves.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
            <CardDescription>Leave requests awaiting your approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingLeaves.map((leave) => (
                <div key={leave.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{leave.employee}</p>
                    <p className="text-xs text-muted-foreground">
                      {leave.leave_type}: {formatDate(leave.start_date)} - {formatDate(leave.end_date)} ({leave.days} days)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Applied: {formatDate(leave.applied_at || leave.applying_date || leave.created_at || leave.start_date)}
                    </p>
                  </div>
                  <StatusBadge status={leave.status} approvalName={leave.approval_name} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel Leave Confirmation Dialog — replaces window.confirm */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Leave</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this leave application? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setCancelDialogOpen(false); setCancelLeaveId(""); }}>
              Keep Leave
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelLeave} disabled={isCancelling}>
              {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, Cancel Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile information. {!isAdmin && "Only admins can update email and dates."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} placeholder="Enter full name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder="Enter email" disabled={!isAdmin} />
              {!isAdmin && <p className="text-xs text-muted-foreground">Only admins can update email</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="joining_date">Joining Date</Label>
              <Input id="joining_date" type="date" value={editForm.joining_date} onChange={(e) => setEditForm({ ...editForm, joining_date: e.target.value })} disabled={!isAdmin} />
              {!isAdmin && <p className="text-xs text-muted-foreground">Only admins can update joining date</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ending_date">Ending Date (Optional)</Label>
              <Input id="ending_date" type="date" value={editForm.ending_date} onChange={(e) => setEditForm({ ...editForm, ending_date: e.target.value })} disabled={!isAdmin} />
              {!isAdmin && <p className="text-xs text-muted-foreground">Only admins can update ending date</p>}
              {isAdmin && <p className="text-xs text-muted-foreground">Leave empty if employee has no end date</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="birth_date">Birth Date (Optional)</Label>
              <Input id="birth_date" type="date" value={editForm.birth_date} onChange={(e) => setEditForm({ ...editForm, birth_date: e.target.value })} disabled={!isAdmin} />
              {!isAdmin && <p className="text-xs text-muted-foreground">Only admins can update birth date</p>}
              {isAdmin && <p className="text-xs text-muted-foreground">Used for birthday notifications</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isUpdating}>Cancel</Button>
            <Button onClick={handleUpdateProfile} disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Change Password
            </DialogTitle>
            <DialogDescription>
              Password must contain: 1 uppercase, 1 lowercase, 1 digit, 1 special character (@#$%&*!?)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">🔐 Generate Secure Password</p>
                <p className="text-xs text-blue-700 dark:text-blue-300">Auto-generate a 10-character secure password</p>
              </div>
              <Button type="button" onClick={generateSecurePassword} variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/50">
                Generate
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_password">New Password</Label>
              <div className="relative">
                <Input id="new_password" type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" className="pr-10" />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm Password</Label>
              <div className="relative">
                <Input id="confirm_password" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="pr-10" />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {newPassword && (() => {
              const { isValid, errors } = validateSecurePassword(newPassword);
              if (isValid) return null;
              return (
                <ul className="text-xs text-destructive space-y-1 bg-destructive/5 p-2 rounded-md">
                  {errors.map((error, index) => <li key={index} className="flex items-center gap-1"><span>•</span> {error}</li>)}
                </ul>
              );
            })()}
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-sm text-destructive">Passwords do not match</p>
            )}
            {newPassword && newPassword.length >= 6 && newPassword === confirmPassword && (
              <div className="flex items-center gap-2 text-sm text-success">
                <Check className="h-4 w-4" />
                <span>Password is valid and ready to update</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPasswordDialogOpen(false); setNewPassword(''); setConfirmPassword(''); }} disabled={isUpdatingPassword}>Cancel</Button>
            <Button onClick={handleChangePassword} disabled={isUpdatingPassword}>
              {isUpdatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Leave Dialog */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
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
              <Textarea id="withdraw_reason" value={withdrawReason} onChange={(e) => setWithdrawReason(e.target.value)} placeholder="Enter reason for withdrawing this leave..." rows={4} className="resize-none" />
              <p className="text-xs text-muted-foreground">Providing a reason helps maintain transparency in leave management.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setWithdrawDialogOpen(false); setWithdrawLeaveId(""); setWithdrawReason(""); }} disabled={isWithdrawing}>Cancel</Button>
            <Button onClick={confirmWithdraw} disabled={isWithdrawing} className="bg-orange-600 hover:bg-orange-700">
              {isWithdrawing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Withdrawal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;