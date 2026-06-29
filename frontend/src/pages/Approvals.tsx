import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/dateUtils";
import { useFilteredLeaves } from "@/hooks/useFilteredLeaves";
import { LeaveFilter } from "@/components/LeaveFilter";
import { DataGrid } from "@/components/DataGrid";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { LeaveSummaryCards } from "@/components/leave/LeaveSummaryCards";
import { ReasonCellRenderer, TimingCellRenderer, StatusCellRenderer, ApprovalLogCellRenderer } from "@/components/leave/LeaveCellRenderers";
import { ApprovalLogDrawer } from "@/components/leave/ApprovalLogDrawer";
import { LeaveResponse } from "@/services/leaveService";
import { Check, X, Loader2, Undo2, Info } from "lucide-react";
import { ColDef, ICellRendererParams } from "ag-grid-community"; // ICellRendererParams used by useCallback renderers
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getCurrentUser } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { canApproveOrReject, canWithdraw, withdrawLabel } from "@/lib/leaveActionUtils";

// Fix: typed interface instead of `any` for errors with a status code
interface ApiError extends Error {
  status?: number;
}

const Approvals = () => {
  const { 
    leaves, 
    pendingLeaves: filteredPendingLeaves, 
    withdrawalRequests: filteredWithdrawalRequests,
    totalCount,
    summary,
    month,
    year,
    isLoading, 
    error, 
    applyFilters,
    refreshLeaves,
    processLeave, 
    isProcessing, 
    withdrawLeave, 
    isWithdrawing 
  } = useFilteredLeaves();
  
  const [selectedLeave, setSelectedLeave] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const currentUser = getCurrentUser();

  // Withdraw leave state
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawLeaveId, setWithdrawLeaveId] = useState<string>("");
  const [withdrawReason, setWithdrawReason] = useState("");

  // Approval log drawer state
  const [approvalLogLeave, setApprovalLogLeave] = useState<LeaveResponse | null>(null);

  const role: string = currentUser?.role ?? '';

  // Pending approvals: show only leaves where this role has a WAITING entry in approval_log
  const pendingLeaves = filteredPendingLeaves.filter(l =>
    canApproveOrReject(l, role)
  );

  // Withdrawal requests: show only leaves where this role has a WAITING entry for withdrawal
  const withdrawalRequests = filteredWithdrawalRequests.filter(l =>
    canWithdraw(l, role)
  );

  // Approval confirm-dialog message — driven by which stage in the log is WAITING
  const getApprovalMessage = (leave: LeaveResponse | undefined) => {
    if (!leave) return { title: 'Approve Leave Request', description: 'Are you sure?', actionText: 'Approve' };

    const log = leave.approval_log ?? [];
    const stages = [...new Set(log.map(e => e.stage_no))].sort((a, b) => a - b);
    const lastStage = stages[stages.length - 1] ?? -1;
    const isLastStage = log.some(
      e => e.stage_no === lastStage &&
           e.approver_role.toUpperCase() === role.toUpperCase() &&
           e.state === 'WAITING'
    );
    const isFinalApproval = isLastStage || log.length === 0;

    if (isFinalApproval) {
      return {
        title: 'Final Approval',
        description: 'Your approval will finalise this leave and deduct the balance from the employee\'s account.',
        actionText: 'Final Approval',
      };
    }
    return {
      title: 'Approve Leave Request',
      description: 'Your approval moves this leave to the next stage. Further approval may be required before the balance is deducted.',
      actionText: 'Approve',
    };
  };

  const handleAction = useCallback((leaveId: string, action: 'APPROVE' | 'REJECT') => {
    setSelectedLeave(leaveId);
    setActionType(action);
  }, []);

  const confirmAction = () => {
    if (selectedLeave && actionType) {
      processLeave({ id: selectedLeave, action: { action: actionType } });
    }
    setSelectedLeave(null);
    setActionType(null);
  };

  const handleWithdraw = useCallback((leaveId: string) => {
    setWithdrawLeaveId(leaveId);
    setWithdrawReason("");
    setWithdrawDialogOpen(true);
  }, []);

  const confirmWithdraw = () => {
    if (!withdrawLeaveId) return;
    
    withdrawLeave({ id: withdrawLeaveId, reason: withdrawReason || undefined });
    setWithdrawDialogOpen(false);
    setWithdrawLeaveId("");
    setWithdrawReason("");
  };

  // Fix: wrap in useCallback so useMemo dependency arrays stay accurate
  const PendingActionsCellRenderer = useCallback((params: ICellRendererParams) => {
    const leave = params.data as LeaveResponse;

    if (!canApproveOrReject(leave, role)) {
      return <span className="text-xs text-muted-foreground italic">Awaiting other approvers</span>;
    }

    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => handleAction(leave.id, 'APPROVE')}
          className="bg-success text-success-foreground hover:bg-success/90"
          disabled={isProcessing}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => handleAction(leave.id, 'REJECT')}
          disabled={isProcessing}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }, [isProcessing, role, handleAction]);

  // Fix: wrap in useCallback so useMemo dependency arrays stay accurate
  const AllLeavesActionsCellRenderer = useCallback((params: ICellRendererParams) => {
    const leave = params.data as LeaveResponse;

    if (!canWithdraw(leave, role)) return null;

    const label = withdrawLabel(leave, role);
    const isPending = leave.status.toUpperCase() === 'WITHDRAWAL_PENDING';

    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleWithdraw(leave.id)}
        disabled={isWithdrawing}
        className={
          isPending
            ? 'gap-1 border-purple-500 text-purple-600 hover:bg-purple-50'
            : 'gap-1 border-orange-500 text-orange-600 hover:bg-orange-50'
        }
      >
        {isPending ? <Check className="h-4 w-4" /> : <Undo2 className="h-4 w-4" />}
        {label}
      </Button>
    );
  }, [isWithdrawing, role, handleWithdraw]);

  // Fix: wrap in useCallback so useMemo dependency arrays stay accurate
  const WithdrawalActionsCellRenderer = useCallback((params: ICellRendererParams) => {
    return (
      <Button
        size="sm"
        onClick={() => handleWithdraw(params.data.id)}
        disabled={isWithdrawing}
        className="bg-purple-600 hover:bg-purple-700 text-white gap-1"
      >
        <Check className="h-4 w-4" />
        Finalize
      </Button>
    );
  }, [isWithdrawing, handleWithdraw]);

  // Fix: extract inline Badge renderer so useMemo deps stay clean
  const DaysBadgeCellRenderer = useCallback(
    (params: ICellRendererParams) => <Badge variant="outline">{params.value}</Badge>,
    []
  );

  // Column Definitions for Pending Approvals
  // Fix: PendingActionsCellRenderer added to deps
  const pendingColumnDefs = useMemo<ColDef[]>(() => [
    { 
      field: 'employee', 
      headerName: 'Employee', 
      width: 150,
      minWidth: 130,
      pinned: 'left',
      lockPosition: true,
      suppressMovable: true
    },
    { field: 'leave_type', headerName: 'Leave Type', width: 140, minWidth: 120 },
    { 
      field: 'leave_timing', 
      headerName: 'Timing', 
      width: 170,
      minWidth: 150,
      cellRenderer: TimingCellRenderer 
    },
    { 
      field: 'start_date', 
      headerName: 'Start Date', 
      width: 130,
      minWidth: 110,
      valueFormatter: (params) => formatDate(params.value)
    },
    { 
      field: 'end_date', 
      headerName: 'End Date', 
      width: 130,
      minWidth: 110,
      valueFormatter: (params) => formatDate(params.value)
    },
    { 
      field: 'days', 
      headerName: 'Days', 
      width: 85,
      minWidth: 75,
      cellRenderer: DaysBadgeCellRenderer
    },
    { 
      field: 'reason', 
      headerName: 'Reason', 
      width: 100,
      minWidth: 90,
      cellRenderer: ReasonCellRenderer 
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 180,
      minWidth: 160,
      cellRenderer: StatusCellRenderer 
    },
    {
      field: 'approval_log',
      headerName: 'Flow',
      width: 80,
      minWidth: 70,
      sortable: false,
      filter: false,
      cellRenderer: ApprovalLogCellRenderer,
    },
    { 
      field: 'actions', 
      headerName: 'Actions', 
      width: 190,
      minWidth: 170,
      pinned: 'right',
      lockPosition: true,
      suppressMovable: true,
      sortable: false,
      filter: false,
      cellRenderer: PendingActionsCellRenderer 
    },
  ], [DaysBadgeCellRenderer, PendingActionsCellRenderer]);

  // Column Definitions for Withdrawal Requests
  // Fix: WithdrawalActionsCellRenderer added to deps
  const withdrawalColumnDefs = useMemo<ColDef[]>(() => [
    { 
      field: 'employee', 
      headerName: 'Employee', 
      width: 150,
      minWidth: 130,
      pinned: 'left',
      lockPosition: true,
      suppressMovable: true
    },
    { field: 'leave_type', headerName: 'Leave Type', width: 140, minWidth: 120 },
    { 
      field: 'leave_timing', 
      headerName: 'Timing', 
      width: 170,
      minWidth: 150,
      cellRenderer: TimingCellRenderer 
    },
    { 
      field: 'start_date', 
      headerName: 'Start Date', 
      width: 130,
      minWidth: 110,
      valueFormatter: (params) => formatDate(params.value)
    },
    { 
      field: 'end_date', 
      headerName: 'End Date', 
      width: 130,
      minWidth: 110,
      valueFormatter: (params) => formatDate(params.value)
    },
    { 
      field: 'days', 
      headerName: 'Days', 
      width: 85,
      minWidth: 75,
      cellRenderer: DaysBadgeCellRenderer
    },
    { 
      field: 'reason', 
      headerName: 'Reason', 
      width: 100,
      minWidth: 90,
      cellRenderer: ReasonCellRenderer 
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 180,
      minWidth: 160,
      cellRenderer: StatusCellRenderer 
    },
    { 
      field: 'actions', 
      headerName: 'Actions', 
      width: 150,
      minWidth: 130,
      pinned: 'right',
      lockPosition: true,
      suppressMovable: true,
      sortable: false,
      filter: false,
      cellRenderer: WithdrawalActionsCellRenderer 
    },
  ], [DaysBadgeCellRenderer, WithdrawalActionsCellRenderer]);

  // Column Definitions for All Leaves
  // Fix: AllLeavesActionsCellRenderer added to deps
  const allLeavesColumnDefs = useMemo<ColDef[]>(() => [
    { 
      field: 'employee', 
      headerName: 'Employee', 
      width: 150,
      minWidth: 130,
      pinned: 'left',
      lockPosition: true,
      suppressMovable: true
    },
    { field: 'leave_type', headerName: 'Leave Type', width: 140, minWidth: 120 },
    { 
      field: 'leave_timing', 
      headerName: 'Timing', 
      width: 170,
      minWidth: 150,
      cellRenderer: TimingCellRenderer 
    },
    { 
      field: 'start_date', 
      headerName: 'Start Date', 
      width: 130,
      minWidth: 110,
      valueFormatter: (params) => formatDate(params.value)
    },
    { 
      field: 'end_date', 
      headerName: 'End Date', 
      width: 130,
      minWidth: 110,
      valueFormatter: (params) => formatDate(params.value)
    },
    { 
      field: 'days', 
      headerName: 'Days', 
      width: 85,
      minWidth: 75,
      cellRenderer: DaysBadgeCellRenderer
    },
    { 
      field: 'reason', 
      headerName: 'Reason', 
      width: 100,
      minWidth: 90,
      cellRenderer: ReasonCellRenderer 
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 180,
      minWidth: 160,
      cellRenderer: StatusCellRenderer 
    },
    { 
      field: 'applied_at', 
      headerName: 'Applied On', 
      width: 130,
      minWidth: 110,
      valueFormatter: (params) => formatDate(params.value || params.data.applying_date)
    },
    {
      field: 'approval_log',
      headerName: 'Flow',
      width: 80,
      minWidth: 70,
      sortable: false,
      filter: false,
      cellRenderer: ApprovalLogCellRenderer,
    },
    { 
      field: 'actions', 
      headerName: 'Actions', 
      width: 210,
      minWidth: 190,
      pinned: 'right',
      lockPosition: true,
      suppressMovable: true,
      sortable: false,
      filter: false,
      cellRenderer: AllLeavesActionsCellRenderer 
    },
  ], [DaysBadgeCellRenderer, AllLeavesActionsCellRenderer]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leave Approvals</h1>
        <p className="text-muted-foreground">Review and approve leave requests from your team</p>
      </div>

      {/* Approval Info — role-agnostic: driven by what approval_log shows for this user */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong className="font-semibold">Approval Flow:</strong>
          <span className="ml-1">
            Actions (Approve / Reject / Withdraw) are shown only when it is your turn in the configured approval flow.
            {pendingLeaves.length > 0
              ? ` You have ${pendingLeaves.length} leave(s) awaiting your action.`
              : ' No leaves are currently waiting for your action.'}
          </span>
        </AlertDescription>
      </Alert>

      {/* Filter Controls */}
      <LeaveFilter
        currentMonth={month}
        currentYear={year}
        onFilterChange={applyFilters}
        onRefresh={refreshLeaves}
        loading={isLoading}
        totalCount={totalCount}
      />

      {/* Summary Stats */}
      <LeaveSummaryCards summary={summary} isLoading={isLoading} />

      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>
            {pendingLeaves.length} leave request(s) awaiting your approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} columns={9} showActions={true} />
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="text-center">
                <p className="text-lg font-semibold text-destructive">Failed to load leave requests</p>
                <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
                {/* Fix: use ApiError instead of any */}
                {(error as ApiError).status && (
                  <p className="text-xs text-muted-foreground mt-1">Error Code: {(error as ApiError).status}</p>
                )}
              </div>
              <Button onClick={() => refreshLeaves()} variant="outline">
                <Loader2 className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          ) : pendingLeaves.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <div className="text-muted-foreground">
                No pending approvals in {new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
              <p className="text-sm text-muted-foreground">
                Try selecting a different month or year to see more results
              </p>
            </div>
          ) : (
            <DataGrid
              rowData={pendingLeaves}
              columnDefs={pendingColumnDefs}
              domLayout="autoHeight"
              rowHeight={56}
              gridOptions={{ context: { onViewApprovalLog: (leave: LeaveResponse) => setApprovalLogLeave(leave) } }}
            />
          )}
        </CardContent>
      </Card>

      {/* Withdrawal Requests Section - Only for Admin/SUPERADMIN */}
      {withdrawalRequests.length > 0 && (
        <Card className="border-purple-200 bg-purple-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Undo2 className="h-5 w-5 text-purple-600" />
              Pending Withdrawal Requests
            </CardTitle>
            <CardDescription>
              {withdrawalRequests.length} withdrawal request(s) awaiting your final approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton rows={3} columns={9} showActions={true} />
            ) : (
              <DataGrid
                rowData={withdrawalRequests}
                columnDefs={withdrawalColumnDefs}
                domLayout="autoHeight"
                rowHeight={56}
              />
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Leave Requests</CardTitle>
          <CardDescription>Complete history of leave applications</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={10} columns={10} showActions={true} />
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="text-center">
                <p className="text-lg font-semibold text-destructive">Failed to load leave history</p>
                <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
                {/* Fix: use ApiError instead of any */}
                {(error as ApiError).status && (
                  <p className="text-xs text-muted-foreground mt-1">Error Code: {(error as ApiError).status}</p>
                )}
              </div>
              <Button onClick={() => refreshLeaves()} variant="outline">
                <Loader2 className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          ) : leaves.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <div className="text-muted-foreground">
                No leave requests found in {new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
              <p className="text-sm text-muted-foreground">
                Try selecting a different month or year to see more results
              </p>
            </div>
          ) : (
            <DataGrid
              rowData={leaves}
              columnDefs={allLeavesColumnDefs}
              domLayout="autoHeight"
              pagination={true}
              paginationPageSize={20}
              rowHeight={56}
              gridOptions={{ context: { onViewApprovalLog: (leave: LeaveResponse) => setApprovalLogLeave(leave) } }}
            />
          )}
        </CardContent>
      </Card>

      <AlertDialog open={selectedLeave !== null} onOpenChange={() => setSelectedLeave(null)}>
        <AlertDialogContent className="sm:max-w-[500px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {actionType === 'APPROVE' ? (
                <>
                  <Check className="h-5 w-5 text-green-600" />
                  {getApprovalMessage(leaves.find(l => l.id === selectedLeave)).title}
                </>
              ) : (
                <>
                  <X className="h-5 w-5 text-red-600" />
                  Reject Leave Request
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              {actionType === 'APPROVE' ? (
                <p>{getApprovalMessage(leaves.find(l => l.id === selectedLeave)).description}</p>
              ) : (
                <p>Are you sure you want to reject this leave request? This action cannot be undone and the employee will be notified.</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={actionType === 'APPROVE' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {actionType === 'APPROVE'
                ? getApprovalMessage(leaves.find(l => l.id === selectedLeave)).actionText
                : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Withdraw Leave Dialog */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          {(() => {
            const withdrawLeave_ = leaves.find(l => l.id === withdrawLeaveId);
            const isFinalize = withdrawLeave_?.status.toUpperCase() === 'WITHDRAWAL_PENDING';
            const label = withdrawLeave_ ? withdrawLabel(withdrawLeave_, role) : 'Withdraw';
            const isRequest = label === 'Request Withdrawal';
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Undo2 className={`h-5 w-5 ${isFinalize ? 'text-purple-600' : 'text-orange-600'}`} />
                    {isFinalize ? 'Finalize Leave Withdrawal' : isRequest ? 'Request Leave Withdrawal' : 'Withdraw Approved Leave'}
                  </DialogTitle>
                  <DialogDescription className="space-y-2">
                    {isFinalize ? (
                      <>
                        <p>Finalise the withdrawal request. The leave balance will be restored upon confirmation.</p>
                        <Alert className="bg-purple-50 border-purple-200">
                          <Info className="h-4 w-4 text-purple-600" />
                          <AlertDescription className="text-purple-800 text-sm">
                            <strong>Final Withdrawal:</strong> This will restore {withdrawLeave_?.days} day(s) to the employee's leave balance.
                          </AlertDescription>
                        </Alert>
                      </>
                    ) : isRequest ? (
                      <>
                        <p>You are requesting withdrawal of this approved leave. The request will be sent for final approval.</p>
                        <Alert className="bg-blue-50 border-blue-200">
                          <Info className="h-4 w-4 text-blue-600" />
                          <AlertDescription className="text-blue-800 text-sm">
                            <strong>Withdrawal Request:</strong> Balance will NOT be restored until the final approver confirms.
                          </AlertDescription>
                        </Alert>
                      </>
                    ) : (
                      <>
                        <p>Are you sure you want to withdraw this approved leave? The leave balance will be restored immediately.</p>
                        <Alert className="bg-orange-50 border-orange-200">
                          <Info className="h-4 w-4 text-orange-600" />
                          <AlertDescription className="text-orange-800 text-sm">
                            <strong>Direct Withdrawal:</strong> Balance will be restored immediately.
                          </AlertDescription>
                        </Alert>
                      </>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="withdraw_reason">
                      Reason for Withdrawal {isRequest ? '(Required)' : '(Optional)'}
                    </Label>
                    <Textarea
                      id="withdraw_reason"
                      value={withdrawReason}
                      onChange={(e) => setWithdrawReason(e.target.value)}
                      placeholder="Enter reason for withdrawing this leave..."
                      rows={4}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      {isRequest
                        ? 'Please provide a reason for the withdrawal request.'
                        : 'Providing a reason helps maintain transparency.'}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setWithdrawDialogOpen(false);
                      setWithdrawLeaveId("");
                      setWithdrawReason("");
                    }}
                    disabled={isWithdrawing}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmWithdraw}
                    disabled={isWithdrawing}
                    className={isFinalize ? 'bg-purple-600 hover:bg-purple-700' : 'bg-orange-600 hover:bg-orange-700'}
                  >
                    {isWithdrawing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isFinalize ? 'Finalize Withdrawal' : isRequest ? 'Submit Request' : 'Confirm Withdrawal'}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Approval Log Drawer */}
      <ApprovalLogDrawer
        leave={approvalLogLeave}
        open={approvalLogLeave !== null}
        onOpenChange={(open) => { if (!open) setApprovalLogLeave(null); }}
      />
    </div>
  );
};

export default Approvals;