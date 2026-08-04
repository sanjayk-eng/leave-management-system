import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/dateUtils";
import { useFilteredLeaves } from "@/hooks/useFilteredLeaves";
import { LeaveFilter } from "@/components/LeaveFilter";
import { DataGrid, ColDef } from "@/components/DataGrid";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { LeaveSummaryCards } from "@/components/leave/LeaveSummaryCards";
import {
  ReasonCellRenderer,
  TimingCellRenderer,
  StatusCellRenderer,
  ApprovalLogCellRenderer,
  EmployeeCellRenderer,
  AppliedByCellRenderer,
} from "@/components/leave/LeaveCellRenderers";
import { ApprovalLogDrawer } from "@/components/leave/ApprovalLogDrawer";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { LeaveResponse } from "@/services/leaveService";
import { Check, X, Loader2, Undo2, Info } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getCurrentUser } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { canApproveOrReject, canWithdraw, withdrawLabel } from "@/lib/leaveActionUtils";

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
    isWithdrawing,
  } = useFilteredLeaves();

  const [selectedLeave, setSelectedLeave] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT" | null>(null);
  const currentUser = getCurrentUser();

  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawLeaveId, setWithdrawLeaveId] = useState<string>("");
  const [withdrawReason, setWithdrawReason] = useState("");

  const [approvalLogLeave, setApprovalLogLeave] = useState<LeaveResponse | null>(null);

  const role: string = currentUser?.role ?? "";

  const pendingLeaves = filteredPendingLeaves.filter((l) => canApproveOrReject(l, role));
  const withdrawalRequests = filteredWithdrawalRequests.filter((l) => canWithdraw(l, role));

  const getApprovalMessage = (leave: LeaveResponse | undefined) => {
    if (!leave)
      return { title: "Approve Leave Request", description: "Are you sure?", actionText: "Approve" };

    const log = leave.approval_log ?? [];
    const stages = [...new Set(log.map((e) => e.stage_no))].sort((a, b) => a - b);
    const lastStage = stages[stages.length - 1] ?? -1;
    const isLastStage = log.some(
      (e) =>
        e.stage_no === lastStage &&
        e.approver_role.toUpperCase() === role.toUpperCase() &&
        e.state === "WAITING"
    );
    const isFinalApproval = isLastStage || log.length === 0;

    if (isFinalApproval) {
      return {
        title: "Final Approval",
        description:
          "Your approval will finalise this leave and deduct the balance from the employee's account.",
        actionText: "Final Approval",
      };
    }
    return {
      title: "Approve Leave Request",
      description:
        "Your approval moves this leave to the next stage. Further approval may be required before the balance is deducted.",
      actionText: "Approve",
    };
  };

  const handleAction = useCallback((leaveId: string, action: "APPROVE" | "REJECT") => {
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

  // ── Pending column defs ───────────────────────────────────────────────────
  const pendingColumnDefs = useMemo<ColDef<LeaveResponse>[]>(
    () => [
      {
        field: "employee",
        headerName: "Employee",
        cellRenderer: (row) => <EmployeeCellRenderer {...row} />,
      },
      { field: "leave_type", headerName: "Leave Type" },
      {
        field: "leave_timing",
        headerName: "Timing",
        cellRenderer: (row) => <TimingCellRenderer {...row} />,
      },
      {
        field: "start_date",
        headerName: "Start Date",
        valueFormatter: (v) => formatDate(v as string),
      },
      {
        field: "end_date",
        headerName: "End Date",
        valueFormatter: (v) => formatDate(v as string),
      },
      {
        field: "days",
        headerName: "Days",
        cellRenderer: (row) => <Badge variant="outline">{row.days}</Badge>,
      },
      {
        field: "reason",
        headerName: "Reason",
        cellRenderer: (row) => <ReasonCellRenderer {...row} />,
      },
      {
        field: "status",
        headerName: "Status",
        cellRenderer: (row) => <StatusCellRenderer {...row} />,
      },
      {
        field: "applied_by_name",
        headerName: "Applied By",
        cellRenderer: (row) => <AppliedByCellRenderer {...row} />,
      },
      {
        field: "approval_log",
        headerName: "Flow",
        cellRenderer: (row) => (
          <ApprovalLogCellRenderer data={row} onViewApprovalLog={setApprovalLogLeave} />
        ),
      },
      {
        field: "id",
        headerName: "Actions",
        cellRenderer: (row) => {
          if (!canApproveOrReject(row, role)) {
            return (
              <span className="text-xs text-muted-foreground italic">
                Awaiting other approvers
              </span>
            );
          }
          return (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleAction(row.id, "APPROVE")}
                className="bg-success text-success-foreground hover:bg-success/90"
                disabled={isProcessing}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleAction(row.id, "REJECT")}
                disabled={isProcessing}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [role, isProcessing, handleAction]
  );

  // ── Withdrawal column defs ────────────────────────────────────────────────
  const withdrawalColumnDefs = useMemo<ColDef<LeaveResponse>[]>(
    () => [
      {
        field: "employee",
        headerName: "Employee",
        cellRenderer: (row) => <EmployeeCellRenderer {...row} />,
      },
      { field: "leave_type", headerName: "Leave Type" },
      {
        field: "leave_timing",
        headerName: "Timing",
        cellRenderer: (row) => <TimingCellRenderer {...row} />,
      },
      {
        field: "start_date",
        headerName: "Start Date",
        valueFormatter: (v) => formatDate(v as string),
      },
      {
        field: "end_date",
        headerName: "End Date",
        valueFormatter: (v) => formatDate(v as string),
      },
      {
        field: "days",
        headerName: "Days",
        cellRenderer: (row) => <Badge variant="outline">{row.days}</Badge>,
      },
      {
        field: "reason",
        headerName: "Reason",
        cellRenderer: (row) => <ReasonCellRenderer {...row} />,
      },
      {
        field: "status",
        headerName: "Status",
        cellRenderer: (row) => <StatusCellRenderer {...row} />,
      },
      {
        field: "id",
        headerName: "Actions",
        cellRenderer: (row) => (
          <Button
            size="sm"
            onClick={() => handleWithdraw(row.id)}
            disabled={isWithdrawing}
            className="bg-purple-600 hover:bg-purple-700 text-white gap-1"
          >
            <Check className="h-4 w-4" />
            Finalize
          </Button>
        ),
      },
    ],
    [isWithdrawing, handleWithdraw]
  );

  // ── All leaves column defs ────────────────────────────────────────────────
  const allLeavesColumnDefs = useMemo<ColDef<LeaveResponse>[]>(
    () => [
      {
        field: "employee",
        headerName: "Employee",
        cellRenderer: (row) => <EmployeeCellRenderer {...row} />,
      },
      { field: "leave_type", headerName: "Leave Type" },
      {
        field: "leave_timing",
        headerName: "Timing",
        cellRenderer: (row) => <TimingCellRenderer {...row} />,
      },
      {
        field: "start_date",
        headerName: "Start Date",
        valueFormatter: (v) => formatDate(v as string),
      },
      {
        field: "end_date",
        headerName: "End Date",
        valueFormatter: (v) => formatDate(v as string),
      },
      {
        field: "days",
        headerName: "Days",
        cellRenderer: (row) => <Badge variant="outline">{row.days}</Badge>,
      },
      {
        field: "reason",
        headerName: "Reason",
        cellRenderer: (row) => <ReasonCellRenderer {...row} />,
      },
      {
        field: "status",
        headerName: "Status",
        cellRenderer: (row) => <StatusCellRenderer {...row} />,
      },
      {
        field: "applied_at",
        headerName: "Applied On",
        valueFormatter: (v, row) =>
          formatDate((v as string) || row.applying_date),
      },
      {
        field: "applied_by_name",
        headerName: "Applied By",
        cellRenderer: (row) => <AppliedByCellRenderer {...row} />,
      },
      {
        field: "approval_log",
        headerName: "Flow",
        cellRenderer: (row) => (
          <ApprovalLogCellRenderer data={row} onViewApprovalLog={setApprovalLogLeave} />
        ),
      },
      {
        field: "id",
        headerName: "Actions",
        cellRenderer: (row) => {
          if (!canWithdraw(row, role)) return null;
          const label = withdrawLabel(row, role);
          const isPending = row.status.toUpperCase() === "WITHDRAWAL_PENDING";
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleWithdraw(row.id)}
              disabled={isWithdrawing}
              className={
                isPending
                  ? "gap-1 border-purple-500 text-purple-600 hover:bg-purple-50"
                  : "gap-1 border-orange-500 text-orange-600 hover:bg-orange-50"
              }
            >
              {isPending ? <Check className="h-4 w-4" /> : <Undo2 className="h-4 w-4" />}
              {label}
            </Button>
          );
        },
      },
    ],
    [role, isWithdrawing, handleWithdraw]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leave Approvals</h1>
        <p className="text-muted-foreground">
          Review and approve leave requests from your team
        </p>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong className="font-semibold">Approval Flow:</strong>
          <span className="ml-1">
            Actions (Approve / Reject / Withdraw) are shown only when it is your turn in the
            configured approval flow.
            {pendingLeaves.length > 0
              ? ` You have ${pendingLeaves.length} leave(s) awaiting your action.`
              : " No leaves are currently waiting for your action."}
          </span>
        </AlertDescription>
      </Alert>

      <LeaveFilter
        currentMonth={month}
        currentYear={year}
        onFilterChange={applyFilters}
        onRefresh={refreshLeaves}
        loading={isLoading}
        totalCount={totalCount}
      />

      <LeaveSummaryCards summary={summary} isLoading={isLoading} />

      {/* Pending Approvals */}
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
            <ErrorDisplay error={error} onRetry={refreshLeaves} className="mx-auto max-w-md" />
          ) : pendingLeaves.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <div className="text-muted-foreground">
                No pending approvals in{" "}
                {new Date(year, month - 1).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <p className="text-sm text-muted-foreground">
                Try selecting a different month or year to see more results
              </p>
            </div>
          ) : (
            <DataGrid rowData={pendingLeaves} columnDefs={pendingColumnDefs} />
          )}
        </CardContent>
      </Card>

      {/* Withdrawal Requests */}
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
              <DataGrid rowData={withdrawalRequests} columnDefs={withdrawalColumnDefs} />
            )}
          </CardContent>
        </Card>
      )}

      {/* All Leave Requests */}
      <Card>
        <CardHeader>
          <CardTitle>All Leave Requests</CardTitle>
          <CardDescription>Complete history of leave applications</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={10} columns={10} showActions={true} />
          ) : error ? (
            <ErrorDisplay error={error} onRetry={refreshLeaves} className="mx-auto max-w-md" />
          ) : leaves.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <div className="text-muted-foreground">
                No leave requests found in{" "}
                {new Date(year, month - 1).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <p className="text-sm text-muted-foreground">
                Try selecting a different month or year to see more results
              </p>
            </div>
          ) : (
            <DataGrid
              rowData={leaves}
              columnDefs={allLeavesColumnDefs}
              pagination={true}
              paginationPageSize={20}
            />
          )}
        </CardContent>
      </Card>

      {/* Approve / Reject confirm dialog */}
      <AlertDialog
        open={selectedLeave !== null}
        onOpenChange={() => setSelectedLeave(null)}
      >
        <AlertDialogContent className="sm:max-w-[500px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {actionType === "APPROVE" ? (
                <>
                  <Check className="h-5 w-5 text-green-600" />
                  {getApprovalMessage(leaves.find((l) => l.id === selectedLeave)).title}
                </>
              ) : (
                <>
                  <X className="h-5 w-5 text-red-600" />
                  Reject Leave Request
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              {actionType === "APPROVE" ? (
                <p>
                  {getApprovalMessage(leaves.find((l) => l.id === selectedLeave)).description}
                </p>
              ) : (
                <p>
                  Are you sure you want to reject this leave request? This action cannot be
                  undone and the employee will be notified.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={
                actionType === "APPROVE"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {actionType === "APPROVE"
                ? getApprovalMessage(leaves.find((l) => l.id === selectedLeave)).actionText
                : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          {(() => {
            const withdrawLeave_ = leaves.find((l) => l.id === withdrawLeaveId);
            const isFinalize =
              withdrawLeave_?.status.toUpperCase() === "WITHDRAWAL_PENDING";
            const label = withdrawLeave_ ? withdrawLabel(withdrawLeave_, role) : "Withdraw";
            const isRequest = label === "Request Withdrawal";
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Undo2
                      className={`h-5 w-5 ${
                        isFinalize ? "text-purple-600" : "text-orange-600"
                      }`}
                    />
                    {isFinalize
                      ? "Finalize Leave Withdrawal"
                      : isRequest
                      ? "Request Leave Withdrawal"
                      : "Withdraw Approved Leave"}
                  </DialogTitle>
                  <DialogDescription className="space-y-2">
                    {isFinalize ? (
                      <>
                        <p>
                          Finalise the withdrawal request. The leave balance will be restored
                          upon confirmation.
                        </p>
                        <Alert className="bg-purple-50 border-purple-200">
                          <Info className="h-4 w-4 text-purple-600" />
                          <AlertDescription className="text-purple-800 text-sm">
                            <strong>Final Withdrawal:</strong> This will restore{" "}
                            {withdrawLeave_?.days} day(s) to the employee's leave balance.
                          </AlertDescription>
                        </Alert>
                      </>
                    ) : isRequest ? (
                      <>
                        <p>
                          You are requesting withdrawal of this approved leave. The request will
                          be sent for final approval.
                        </p>
                        <Alert className="bg-blue-50 border-blue-200">
                          <Info className="h-4 w-4 text-blue-600" />
                          <AlertDescription className="text-blue-800 text-sm">
                            <strong>Withdrawal Request:</strong> Balance will NOT be restored
                            until the final approver confirms.
                          </AlertDescription>
                        </Alert>
                      </>
                    ) : (
                      <>
                        <p>
                          Are you sure you want to withdraw this approved leave? The leave
                          balance will be restored immediately.
                        </p>
                        <Alert className="bg-orange-50 border-orange-200">
                          <Info className="h-4 w-4 text-orange-600" />
                          <AlertDescription className="text-orange-800 text-sm">
                            <strong>Direct Withdrawal:</strong> Balance will be restored
                            immediately.
                          </AlertDescription>
                        </Alert>
                      </>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="withdraw_reason">
                      Reason for Withdrawal {isRequest ? "(Required)" : "(Optional)"}
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
                        ? "Please provide a reason for the withdrawal request."
                        : "Providing a reason helps maintain transparency."}
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
                    className={
                      isFinalize
                        ? "bg-purple-600 hover:bg-purple-700"
                        : "bg-orange-600 hover:bg-orange-700"
                    }
                  >
                    {isWithdrawing && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isFinalize
                      ? "Finalize Withdrawal"
                      : isRequest
                      ? "Submit Request"
                      : "Confirm Withdrawal"}
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
        onOpenChange={(open) => {
          if (!open) setApprovalLogLeave(null);
        }}
      />
    </div>
  );
};

export default Approvals;
