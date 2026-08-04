import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MonthSelect, YearSelect } from "@/components/ui/MonthYearSelect";
import { getMonthLabel } from "@/lib/dateConstants";
import { DollarSign, PlayCircle, CheckCircle, Download } from "lucide-react";
import { MONTHS, YEARS } from "@/lib/dateConstants";import { toast } from "sonner";
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
import { usePayroll } from "@/hooks/usePayroll";
import { useAuth } from "@/hooks/useAuth";

const Payroll = () => {
  const { currentUser } = useAuth();
  const { runPayroll, isRunning, payrollPreview, finalizePayroll, isFinalizing, downloadPayslip } = usePayroll();
  
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [showRunDialog, setShowRunDialog] = useState(false);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [payslipIds, setPayslipIds] = useState<string[]>([]);

  const handleRunPayroll = () => {
    setPayslipIds([]); // Reset payslip IDs when running new payroll
    runPayroll(
      { month: selectedMonth, year: selectedYear },
      {
        onSuccess: () => {
          setShowRunDialog(false);
        },
      }
    );
  };

  const handleFinalizePayroll = () => {
    if (currentUser?.role !== 'SUPERADMIN' && currentUser?.role !== 'ADMIN') {
      toast.error("Only Administrators can finalize payroll");
      return;
    }
    
    if (!payrollPreview?.payroll_run_id) {
      toast.error("Please run payroll first");
      return;
    }
    
    finalizePayroll(payrollPreview.payroll_run_id, {
      onSuccess: (data) => {
        if (data?.payslip_ids && Array.isArray(data.payslip_ids)) {
          setPayslipIds(data.payslip_ids);
          // Map payslip IDs to preview items
          if (payrollPreview?.payroll_preview && Array.isArray(payrollPreview.payroll_preview)) {
            payrollPreview.payroll_preview.forEach((item, index) => {
              if (data.payslip_ids[index]) {
                item.payslip_id = data.payslip_ids[index];
              }
            });
          }
        }
        setShowFinalizeDialog(false);
      },
    });
  };

  const handleDownloadPayslip = (payslipId: string) => {
    downloadPayslip(payslipId);
  };

  const handleDownloadAllPayslips = () => {
    if (!payslipIds || payslipIds.length === 0) {
      toast.error("No payslips available to download");
      return;
    }
    payslipIds.forEach((id) => {
      setTimeout(() => downloadPayslip(id), 500); // Stagger downloads
    });
  };

  const totalPayroll = payrollPreview?.total_payroll || 0;
  const totalDeductions = payrollPreview?.total_deductions || 0;
  const employeesCount = payrollPreview?.employees_count || 0;
  const payrollItems = payrollPreview?.payroll_preview || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payroll Management</h1>
        <p className="text-muted-foreground">Run payroll and manage salary disbursements</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payroll</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalPayroll.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">For selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deductions</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalDeductions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total absent deductions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employees</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employeesCount}</div>
            <p className="text-xs text-muted-foreground">Active employees</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payroll Run</CardTitle>
              <CardDescription>Select period and run payroll</CardDescription>
            </div>
            <div className="flex gap-2">
              {(currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'ADMIN') && 
               payrollPreview?.payroll_run_id && 
               (!payslipIds || payslipIds.length === 0) && (
                <Button 
                  onClick={() => setShowFinalizeDialog(true)} 
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={isFinalizing}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {isFinalizing ? "Finalizing..." : "Finalize Payroll"}
                </Button>
              )}
              <Button onClick={() => setShowRunDialog(true)} disabled={isRunning}>
                <PlayCircle className="mr-2 h-4 w-4" />
                {isRunning ? "Running..." : "Run Payroll"}
              </Button>
              {payslipIds && payslipIds.length > 0 && (
                <Button 
                  onClick={handleDownloadAllPayslips}
                  variant="outline"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download All Payslips
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <MonthSelect
                value={selectedMonth}
                onChange={setSelectedMonth}
                className="w-full"
              />
            </div>
            <div className="flex-1">
              <YearSelect
                value={selectedYear}
                onChange={setSelectedYear}
                className="w-full"
              />
            </div>
          </div>

          {payrollItems.length > 0 ? (
            <>
              {(!payslipIds || payslipIds.length === 0) && payrollPreview?.payroll_run_id && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Preview Mode:</strong> Review the payroll details below. Click "Finalize Payroll" to generate payslips.
                  </p>
                </div>
              )}
              {payslipIds && payslipIds.length > 0 && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Payroll Finalized:</strong> Payslips have been generated and are ready for download.
                  </p>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Basic Salary</TableHead>
                    <TableHead>Working Days</TableHead>
                    <TableHead>Paid Leaves</TableHead>
                    <TableHead>Unpaid Leaves</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Salary</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollItems.map((item) => (
                    <TableRow key={item.employee_id}>
                      <TableCell className="font-medium">{item.employee}</TableCell>
                      <TableCell>₹{(item.basic_salary || 0).toLocaleString()}</TableCell>
                      <TableCell>{item.working_days || 0}</TableCell>
                     <TableCell className="text-center">
           <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">
             {item.paid_leaves || 0}
           </Badge>
        </TableCell>
                      <TableCell>
                        {(item.unpaid_leaves || 0) > 0 ? (
                          <Badge variant="destructive">{item.unpaid_leaves || 0}</Badge>
                        ) : (
                          <Badge className="bg-green-600 text-white hover:bg-green-700">0</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-destructive">-₹{(item.deductions || 0).toLocaleString()}</TableCell>
                      <TableCell className="font-semibold">₹{(item.net_salary || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        {item.payslip_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadPayslip(item.payslip_id!)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            PDF
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Select a period and click "Run Payroll" to generate preview
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showRunDialog} onOpenChange={setShowRunDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run Payroll</AlertDialogTitle>
            <AlertDialogDescription>
              This will calculate salaries for {getMonthLabel(selectedMonth)} {selectedYear} based on attendance and leave data.
              Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRunPayroll}>Run Payroll</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize Payroll</AlertDialogTitle>
            <AlertDialogDescription>
              Finalizing the payroll will lock all calculations and make payslips available to employees.
              This action cannot be undone. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalizePayroll}>Finalize</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Payroll;
