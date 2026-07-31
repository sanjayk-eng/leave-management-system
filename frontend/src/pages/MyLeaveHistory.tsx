import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/dateUtils";
import { toast } from "sonner"; 
import { useMyLeaves } from "@/hooks/useLeaves";
import { DataGrid } from "@/components/DataGrid";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { LeaveSummaryCards } from "@/components/leave/LeaveSummaryCards";
import { ReasonCellRenderer, TimingCellRenderer, StatusCellRenderer } from "@/components/leave/LeaveCellRenderers";
import { ApprovalLogDrawer } from "@/components/leave/ApprovalLogDrawer";
import { AppliedByCellRenderer } from "@/components/leave/LeaveCellRenderers";
import { LeaveResponse } from "@/services/leaveService";
import { Loader2, X, RefreshCw, Edit, Save, Calendar, Clock, Eye } from "lucide-react";
import { MONTHS, YEARS_EXTENDED } from "@/lib/dateConstants";
import { ColDef, ICellRendererParams } from "ag-grid-community";
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

const MyLeaveHistory = () => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [cancelLeaveId, setCancelLeaveId] = useState<string | null>(null);

  // Approval log drawer
  const [approvalLogLeave, setApprovalLogLeave] = useState<LeaveResponse | null>(null);

  // States for Editing
  const [editingLeave, setEditingLeave] = useState<LeaveResponse | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [holidayList, setHolidayList] = useState<string[]>([]);

  const { 
    leaves, 
    total,
    isLoading, 
    error, 
    refetch,
    cancelLeave,
    isCancelling,
    updateLeave,
    isUpdating
  } = useMyLeaves(selectedMonth, selectedYear);

  const handleMonthChange = useCallback((value: string) => setSelectedMonth(parseInt(value)), []);
  const handleYearChange = useCallback((value: string) => setSelectedYear(parseInt(value)), []);
  const handleCancelLeave = useCallback((leaveId: string) => setCancelLeaveId(leaveId), []);

  const handleEditClick = useCallback((leave: LeaveResponse) => {
    setEditingLeave(leave);
    setIsEditDialogOpen(true);
  }, []);

  const isWeekend = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDay();
    return day === 0 || day === 6;
  }, []);

  const handleUpdateSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingLeave) return;

    const formData = new FormData(e.currentTarget);
    const isEarlyLeave = editingLeave.is_early || false;

    if (isEarlyLeave) {
      const earlyDateRaw = formData.get("early_date") as string;
      const earlyTimeRaw = formData.get("early_time") as string;

      if (!earlyDateRaw || !earlyTimeRaw) {
        toast.error("Please select both date and time for early leave");
        return;
      }

      if (isWeekend(earlyDateRaw)) {
        toast.error("Leave cannot be on a weekend (Saturday or Sunday)");
        return;
      }

      if (holidayList.includes(earlyDateRaw)) {
        toast.error("Selected date is a public holiday");
        return;
      }

      const updatedData = {
        leave_type_id: Number(editingLeave.leave_type_id),
        reason: (formData.get("reason") as string)?.trim() ?? "",
        start_date: `${earlyDateRaw}T00:00:00Z`,
        end_date: `${earlyDateRaw}T00:00:00Z`,
        leave_timing: earlyTimeRaw,
      };

      updateLeave(
        { id: editingLeave.id, data: updatedData },
        {
          onSuccess: () => {
            setIsEditDialogOpen(false);
            setEditingLeave(null);
            toast.success("Leave updated successfully");
          },
        }
      );
    } else {
      const startDateRaw = formData.get("start_date") as string;
      const endDateRaw = formData.get("end_date") as string;
      const selectedTiming = formData.get("leave_timing") as string;

      if (new Date(startDateRaw) > new Date(endDateRaw)) {
        toast.error("End date cannot be earlier than start date");
        return;
      }

      if (isWeekend(startDateRaw) || isWeekend(endDateRaw)) {
        toast.error("Leave cannot start or end on a weekend (Saturday or Sunday)");
        return;
      }

      if (holidayList.includes(startDateRaw) || holidayList.includes(endDateRaw)) {
        toast.error("Selected date is a public holiday");
        return;
      }

      const timingMap: Record<string, number> = {
        "Full Day": 3,
        "First Half": 1,
        "Second Half": 2,
      };

      const updatedData = {
        leave_type_id: Number(editingLeave.leave_type_id),
        leave_timing_id: timingMap[selectedTiming],
        reason: (formData.get("reason") as string)?.trim() ?? "",
        start_date: startDateRaw ? `${startDateRaw}T00:00:00Z` : undefined,
        end_date: endDateRaw ? `${endDateRaw}T00:00:00Z` : undefined,
      };

      updateLeave(
        { id: editingLeave.id, data: updatedData },
        {
          onSuccess: () => {
            setIsEditDialogOpen(false);
            setEditingLeave(null);
            toast.success("Leave updated successfully");
          },
        }
      );
    }
  }, [editingLeave, holidayList, isWeekend, updateLeave]);

  const confirmCancel = useCallback(() => {
    if (cancelLeaveId) cancelLeave(cancelLeaveId);
    setCancelLeaveId(null);
  }, [cancelLeaveId, cancelLeave]);

  const canCancelLeave = useCallback((status: string) => {
    return status.toUpperCase() === 'PENDING';
  }, []);

  // Compute summary from leaves array
  const summary = useMemo(() => ({
    total:     leaves.length,
    pending:   leaves.filter(l => l.status.toUpperCase() === 'PENDING').length,
    approved:  leaves.filter(l => l.status.toUpperCase() === 'APPROVED').length,
    rejected:  leaves.filter(l => l.status.toUpperCase() === 'REJECTED').length,
    cancelled: leaves.filter(l => l.status.toUpperCase() === 'CANCELLED').length,
    withdrawn: leaves.filter(l => l.status.toUpperCase() === 'WITHDRAWN').length,
  }), [leaves]);

  // Applied Date Cell Renderer
  const AppliedDateCellRenderer = useCallback((params: ICellRendererParams) => {
    const date = params.value || params.data.created_at;
    return (
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">
          {formatDate(date)}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {new Date(date).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          })}
        </span>
      </div>
    );
  }, []);

  // Actions Cell Renderer
  const ActionsCellRenderer = useCallback((params: ICellRendererParams) => {
    const leave = params.data;
    if (!canCancelLeave(leave.status)) return null;
    
    return (
      <div className="flex gap-2">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => handleEditClick(leave)} 
          className="h-8"
        >
          <Edit className="h-3.5 w-3.5 mr-1" /> Edit
        </Button>
        <Button 
          size="sm" 
          variant="destructive" 
          onClick={() => handleCancelLeave(leave.id)} 
          className="h-8"
        >
          <X className="h-3.5 w-3.5 mr-1" /> Cancel
        </Button>
      </div>
    );
  }, [canCancelLeave, handleEditClick, handleCancelLeave]);

  // Column Definitions
  const columnDefs = useMemo<ColDef[]>(() => [
    { 
      field: 'leave_type', 
      headerName: 'Leave Type', 
      width: 160,
      minWidth: 130,
    },
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
      width: 100,
      minWidth: 80,
      cellRenderer: (params: ICellRendererParams) => <Badge variant="outline">{params.value} days</Badge>
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
      width: 150,
      minWidth: 130,
      cellRenderer: AppliedDateCellRenderer 
    },
    {
      field: 'applied_by_name',
      headerName: 'Applied By',
      width: 150,
      minWidth: 120,
      cellRenderer: AppliedByCellRenderer,
    },
    {
      field: 'id',
      headerName: 'Flow',
      width: 80,
      minWidth: 70,
      sortable: false,
      filter: false,
      cellRenderer: (params: ICellRendererParams) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-muted"
          onClick={() => setApprovalLogLeave(params.data)}
          title="View approval flow"
        >
          <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        </Button>
      ),
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
      cellRenderer: ActionsCellRenderer 
    },
  ], [ActionsCellRenderer, AppliedDateCellRenderer]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-bold">My Leave History</h1>
        <p className="text-muted-foreground">View and manage your leave applications</p>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={selectedMonth.toString()} onValueChange={handleMonthChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YEARS_EXTENDED.map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={() => refetch()} disabled={isLoading} className="w-full">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <LeaveSummaryCards summary={isLoading ? null : summary} isLoading={isLoading} />

      {/* Leave History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Applications</CardTitle>
          <Badge variant="secondary" className="text-sm">
            {total} {total === 1 ? 'application' : 'applications'} in {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}
          </Badge>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={8} columns={9} showActions={true} />
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              Failed to load leave history. Please try again.
            </div>
          ) : leaves.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No leave applications found for the selected period.
            </div>
          ) : (
            <DataGrid
              rowData={leaves}
              columnDefs={columnDefs}
              domLayout="autoHeight"
              pagination={true}
              paginationPageSize={10}
              rowHeight={56}
              gridOptions={{ context: { onViewApprovalLog: (leave: LeaveResponse) => setApprovalLogLeave(leave) } }}
            />
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <form onSubmit={handleUpdateSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Leave Request</DialogTitle>
              <DialogDescription>
                {editingLeave?.is_early 
                  ? "Update your early leave date and time" 
                  : "Note: Weekends (Sat/Sun) cannot be selected as start or end dates."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {editingLeave?.is_early ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="early_date">Select Date *</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input 
                        id="early_date"
                        name="early_date" 
                        type="date" 
                        required 
                        defaultValue={editingLeave?.start_date ? new Date(editingLeave.start_date).toISOString().split('T')[0] : ''}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="early_time">Select Time *</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input 
                        id="early_time"
                        name="early_time" 
                        type="time" 
                        required 
                        defaultValue={editingLeave?.leave_timing || ''}
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select the time you need to leave early
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input name="start_date" type="date" required defaultValue={editingLeave?.start_date ? new Date(editingLeave.start_date).toISOString().split('T')[0] : ''} />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input name="end_date" type="date" required defaultValue={editingLeave?.end_date ? new Date(editingLeave.end_date).toISOString().split('T')[0] : ''} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Leave Timing</Label>
                    <Select name="leave_timing" defaultValue={editingLeave?.leave_timing || "Full Day"}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Full Day">Full Day</SelectItem>
                        <SelectItem value="First Half">First Half</SelectItem>
                        <SelectItem value="Second Half">Second Half</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea name="reason" defaultValue={editingLeave?.reason} className="min-h-[100px]" />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Update Application
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <AlertDialog open={cancelLeaveId !== null} onOpenChange={() => setCancelLeaveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>This will cancel your leave application. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel} className="bg-red-600" disabled={isCancelling}>Yes, Cancel Leave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approval Log Drawer */}
      <ApprovalLogDrawer
        leave={approvalLogLeave}
        open={approvalLogLeave !== null}
        onOpenChange={(open) => { if (!open) setApprovalLogLeave(null); }}
      />
    </div>
  );
};

export default MyLeaveHistory;