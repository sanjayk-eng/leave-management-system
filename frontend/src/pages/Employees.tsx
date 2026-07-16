import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { dateInputToISO } from "@/lib/dateUtils";
import { validateSecurePassword } from "@/lib/passwordValidation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useEmployees } from "@/hooks/useEmployees";
import { useDebounce } from "@/hooks/useDebounce";
import { getCurrentUser, ApiError } from "@/lib/api";
import { leaveBalanceService, employeeService } from "@/services";
import type { Employee } from "@/services/employeeService";
import { UserPlus, Search, Loader2, Key, MoreVertical, UserCog, Users, UserX, UserCheck, Calendar, Edit, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { ServerPagination } from "@/components/ServerPagination";
import { SortableTableHead } from "@/components/equipment/shared";
import { useManagerSelect } from "@/components/equipment/shared";
import { SearchableSelect } from "@/components/SearchableSelect";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const roleBadgeClass: Record<string, string> = {
  SUPERADMIN: "bg-primary text-primary-foreground",
  ADMIN:      "bg-secondary text-secondary-foreground",
  MANAGER:    "bg-warning text-warning-foreground",
  EMPLOYEE:   "bg-muted text-muted-foreground",
  HR:         "bg-info text-info-foreground",
  INTERN:     "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
};

function formatDate(iso?: string | null) {
  if (!iso) return <span className="text-muted-foreground italic">-</span>;
  const d = new Date(iso);
  return <span>{d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>;
}

const AVATAR_COLOURS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-sky-500",
  "bg-orange-500",
  "bg-indigo-500",
];
function avatarColour(index: number) {
  return AVATAR_COLOURS[index % AVATAR_COLOURS.length];
}
function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

type SortCol = 'name' | 'email' | 'joining_date' | 'ending_date' | 'salary' | 'birth_date' | 'manager_name' | 'role' | 'status';

// Partial update payload sent to employeeService.updateInfo — only changed fields are included
interface EmployeeInfoUpdate {
  full_name?: string;
  email?: string;
  salary?: number;
  joining_date?: string;
  ending_date?: string | null;
  birth_date?: string | null;
}

const Employees = () => {
  const [searchQuery,       setSearchQuery]       = useState("");
  const [roleFilter,        setRoleFilter]        = useState("all");
  const [designationFilter, setDesignationFilter] = useState("all");
  const [statusFilter,      setStatusFilter]      = useState("active");
  const [currentPage,       setCurrentPage]       = useState(1);
  const [pageSize,          setPageSize]          = useState(10);
  const [sortBy,            setSortBy]            = useState<SortCol | ''>('');
  const [sortDir,           setSortDir]           = useState<'asc' | 'desc'>('asc');

  // ── dialog state — declared early so lazy hooks below can read them ───────────
  const [dialogOpen,            setDialogOpen]            = useState(false);
  const [roleDialogOpen,        setRoleDialogOpen]        = useState(false);
  const [managerDialogOpen,     setManagerDialogOpen]     = useState(false);
  const [designationDialogOpen, setDesignationDialogOpen] = useState(false);
  const [leaveAdjustDialogOpen, setLeaveAdjustDialogOpen] = useState(false);
  const [editInfoDialogOpen,    setEditInfoDialogOpen]    = useState(false);
  const [passwordDialogOpen,    setPasswordDialogOpen]    = useState(false);
  const [deactivateDialogOpen,  setDeactivateDialogOpen]  = useState(false);

  const [selectedEmployee,     setSelectedEmployee]     = useState<Employee | null>(null);
  const [newRole,              setNewRole]              = useState("");
  const [newManagerId,         setNewManagerId]         = useState("");
  const [newDesignationId,     setNewDesignationId]     = useState("");
  const [isUpdatingDesignation,setIsUpdatingDesignation]= useState(false);
  const [isAdjustingLeave,     setIsAdjustingLeave]     = useState(false);
  const [isUpdatingPassword,   setIsUpdatingPassword]   = useState(false);
  const [newPassword,          setNewPassword]          = useState("");
  const [confirmPassword,      setConfirmPassword]      = useState("");

  const [adjustmentData, setAdjustmentData] = useState({ leave_type_id: "", quantity: "", reason: "" });
  const [editInfoForm,   setEditInfoForm]   = useState({
    full_name: "", email: "", salary: 0, joining_date: "", ending_date: "", birth_date: "",
  });
  const [formData, setFormData] = useState({
    full_name: "", email: "", role: "", salary: "", joining_date: "", ending_date: "",
  });

  // ── lazy: fetch designations only when the filter dropdown or assign dialog is used
  // Silent on 403/401 — user may not have designation permission, filter just shows empty
  const { data: designationData } = useQuery({
    queryKey: ['designations'],
    queryFn: async () => {
      const { designationService } = await import('@/services/designationService');
      return designationService.getAll();
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
    throwOnError: false,
  });
  const designations = designationData ?? [];

  // debounce search input
  const debouncedSearch   = useDebounce(searchQuery,   500);

  // ── stable designation name lookup ───────────────────────────────────────────
  const designationName = useMemo(() => {
    if (designationFilter === "all") return undefined;
    if (designationFilter === "unassigned") return "unassigned";
    return designations.find(d => String(d.id) === designationFilter)?.designation_name;
  }, [designationFilter, designations]);

  // ── memoized filters — stable object reference, only changes when values change
  const filters = useMemo(() => ({
    page:        currentPage,
    page_size:   pageSize,
    search:      debouncedSearch  || undefined,
    role:        roleFilter !== "all" ? roleFilter : undefined,
    designation: designationName,
    status:      statusFilter !== "all" ? statusFilter : undefined,
    sort_by:     sortBy   || undefined,
    sort_order:  sortBy   ? sortDir : undefined,
  }), [currentPage, pageSize, debouncedSearch, roleFilter, designationName, statusFilter, sortBy, sortDir]);

  const {
    employees, totalCount, totalPages, isLoading, isFetching, error, refetch,
    createEmployee, isCreating, updateRole, updateManager, deactivateEmployee,
  } = useEmployees(filters);

  const handleError  = useApiErrorHandler();
  const currentUser  = getCurrentUser();
  const isSuperAdmin = currentUser?.role === 'SUPERADMIN';
  const isAdmin      = currentUser?.role === 'ADMIN' || isSuperAdmin;
  const isHR         = currentUser?.role === 'HR';
  const queryClient  = useQueryClient();

  // 403/401 → hide write controls and filters (same pattern as Designations page)
  const isAccessDenied = error instanceof ApiError && (error.status === 403 || error.status === 401);

  // ── lazy: manager list only fetches when "Assign Manager" dialog opens ────────
  const managerSelect = useManagerSelect(managerDialogOpen);

  // ── lazy: leave policies only fetches when "Adjust Leave Balance" dialog opens
  const { data: leavePolicies } = useQuery({
    queryKey: ['leavePolicies'],
    queryFn: async () => { const { leaveService } = await import('@/services'); return leaveService.getAllPolicies(); },
    enabled: leaveAdjustDialogOpen,
    staleTime: 5 * 60 * 1000,
  });

  // ── unified sort handler ──────────────────────────────────────────────────────
  const handleSort = useCallback((col: string) => {
    const c = col as SortCol;
    setSortBy(prev => {
      if (prev === c) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        return prev;
      }
      setSortDir('asc');
      return c;
    });
    setCurrentPage(1);
  }, []);

  // ── action handlers ───────────────────────────────────────────────────────────
  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.role === 'SUPERADMIN' && !isSuperAdmin) { toast.error('Only SUPERADMIN can create SUPERADMIN users'); return; }
    createEmployee({
      full_name: formData.full_name, email: formData.email, role: formData.role,
      salary: isHR ? 0 : parseFloat(formData.salary),
      joining_date: dateInputToISO(formData.joining_date),
      ending_date: formData.ending_date ? dateInputToISO(formData.ending_date) : null,
    });
    setDialogOpen(false);
    setFormData({ full_name: "", email: "", role: "", salary: "", joining_date: "", ending_date: "" });
  };

  const handleUpdateRole = (emp: Employee) => {
    if (emp.role === 'SUPERADMIN' && !isSuperAdmin) { toast.error('Only SUPERADMIN can update SUPERADMIN role'); return; }
    setSelectedEmployee(emp); setNewRole(emp.role); setRoleDialogOpen(true);
  };
  const submitRoleUpdate = () => {
    if (!selectedEmployee || !newRole) return;
    if (newRole === 'SUPERADMIN' && !isSuperAdmin) { toast.error('Only SUPERADMIN can promote to SUPERADMIN'); return; }
    updateRole({ id: selectedEmployee.id, role: newRole });
    setRoleDialogOpen(false); setSelectedEmployee(null); setNewRole("");
  };

  const handleUpdateManager = (emp: Employee) => {
    if (emp.role === 'SUPERADMIN' && !isSuperAdmin) { toast.error('Only SUPERADMIN can update SUPERADMIN manager'); return; }
    setSelectedEmployee(emp); setNewManagerId(emp.manager_id || ""); setManagerDialogOpen(true);
  };
  const submitManagerUpdate = () => {
    if (!selectedEmployee || !newManagerId) return;
    updateManager({ id: selectedEmployee.id, manager_id: newManagerId });
    setManagerDialogOpen(false); setSelectedEmployee(null); setNewManagerId("");
  };

  const handleUpdateDesignation = (emp: Employee) => {
    if (emp.role === 'SUPERADMIN' && !isSuperAdmin) { toast.error('Only SUPERADMIN can update SUPERADMIN designation'); return; }
    setSelectedEmployee(emp);
    setNewDesignationId(emp.designation_id ? String(emp.designation_id) : "");
    setDesignationDialogOpen(true);
  };
  const submitDesignationUpdate = async () => {
    if (!selectedEmployee) return;
    try {
      setIsUpdatingDesignation(true);
      const isRemoving = newDesignationId === "" || newDesignationId === "NONE";
      if (isRemoving) {
        // Remove: employee must have a current designation to clear
        const currentDesignationId = selectedEmployee.designation_id;
        if (!currentDesignationId) {
          toast.info('Employee has no designation to remove');
          setDesignationDialogOpen(false); setSelectedEmployee(null); setNewDesignationId("");
          return;
        }
        const { designationService } = await import('@/services/designationService');
        await designationService.removeEmployee(currentDesignationId, selectedEmployee.id);
      } else {
        // Assign: PATCH /designations/:designationId/assign-employee
        const { designationService } = await import('@/services/designationService');
        await designationService.assignEmployee(newDesignationId, selectedEmployee.id);
      }
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success(isRemoving ? 'Designation removed successfully' : 'Designation assigned successfully');
      setDesignationDialogOpen(false); setSelectedEmployee(null); setNewDesignationId("");
    } catch (err: unknown) { handleError(err); }
    finally { setIsUpdatingDesignation(false); }
  };

  const handleEditInfo = (emp: Employee) => {
    if (emp.role === 'SUPERADMIN' && !isSuperAdmin) { toast.error('Only SUPERADMIN can edit SUPERADMIN users'); return; }
    setSelectedEmployee(emp);
    setEditInfoForm({
      full_name:    emp.full_name,
      email:        emp.email,
      salary:       emp.salary,
      joining_date: emp.joining_date ? emp.joining_date.split('T')[0] : '',
      ending_date:  emp.ending_date  ? emp.ending_date.split('T')[0]  : '',
      birth_date:   emp.birth_date   ? emp.birth_date.split('T')[0]   : '',
    });
    setEditInfoDialogOpen(true);
  };
  const submitInfoUpdate = async () => {
    if (!selectedEmployee) return;
    try {
      const updates: EmployeeInfoUpdate = {};
      if (editInfoForm.full_name !== selectedEmployee.full_name) updates.full_name = editInfoForm.full_name;
      if (editInfoForm.email    !== selectedEmployee.email)      updates.email     = editInfoForm.email;
      if (!isHR && editInfoForm.salary !== selectedEmployee.salary) updates.salary = editInfoForm.salary;
      const curJoin  = selectedEmployee.joining_date ? selectedEmployee.joining_date.split('T')[0] : '';
      const curEnd   = selectedEmployee.ending_date  ? selectedEmployee.ending_date.split('T')[0]  : '';
      const curBirth = selectedEmployee.birth_date   ? selectedEmployee.birth_date.split('T')[0]   : '';
      if (editInfoForm.joining_date && editInfoForm.joining_date !== curJoin)
        updates.joining_date = dateInputToISO(editInfoForm.joining_date);
      if (editInfoForm.ending_date !== curEnd)
        updates.ending_date = editInfoForm.ending_date ? dateInputToISO(editInfoForm.ending_date) : null;
      if (editInfoForm.birth_date !== curBirth)
        updates.birth_date = editInfoForm.birth_date ? dateInputToISO(editInfoForm.birth_date) : null;
      if (Object.keys(updates).length > 0) {
        await employeeService.updateInfo(selectedEmployee.id, updates);
        queryClient.invalidateQueries({ queryKey: ['employees'] });
        toast.success('Employee information updated successfully');
      }
      setEditInfoDialogOpen(false); setSelectedEmployee(null);
    } catch (err: unknown) { handleError(err); }
  };

  const handleDeactivate = (emp: Employee) => {
    if (emp.role === 'SUPERADMIN' && !isSuperAdmin) { toast.error('Only SUPERADMIN can deactivate SUPERADMIN users'); return; }
    setSelectedEmployee(emp);
    setDeactivateDialogOpen(true);
  };

  const confirmDeactivate = () => {
    if (!selectedEmployee) return;
    deactivateEmployee(selectedEmployee.id);
    setDeactivateDialogOpen(false);
    setSelectedEmployee(null);
  };

  const handleAdjustLeave = (emp: Employee) => {
    setSelectedEmployee(emp);
    setAdjustmentData({ leave_type_id: "", quantity: "", reason: "" });
    setLeaveAdjustDialogOpen(true);
  };
  const submitLeaveAdjustment = async () => {
    if (!adjustmentData.leave_type_id || !adjustmentData.quantity || !adjustmentData.reason) { toast.error("Please fill all fields"); return; }
    if (!selectedEmployee?.id) { toast.error("No employee selected"); return; }
    setIsAdjustingLeave(true);
    try {
      const res = await leaveBalanceService.adjust(selectedEmployee.id, {
        leave_type_id: parseInt(adjustmentData.leave_type_id),
        quantity:      parseInt(adjustmentData.quantity),
        reason:        adjustmentData.reason,
      });
      toast.success(res.message || "Leave balance adjusted successfully");
      queryClient.invalidateQueries({ queryKey: ['leaveBalances', selectedEmployee.id] });
      setLeaveAdjustDialogOpen(false); setSelectedEmployee(null);
      setAdjustmentData({ leave_type_id: "", quantity: "", reason: "" });
    } catch (err: unknown) { handleError(err); }
    finally { setIsAdjustingLeave(false); }
  };

  // Fixed: uses crypto.getRandomValues() instead of Math.random() for cryptographic security
  const generateSecurePassword = () => {
    const up = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', lo = 'abcdefghijklmnopqrstuvwxyz', di = '0123456789', sp = '@#$%&*!?';
    const getRandomChar = (chars: string) => {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      return chars[array[0] % chars.length];
    };
    let p = '';
    for (let i = 0; i < 4; i++) p += getRandomChar(up);
    for (let i = 0; i < 4; i++) p += getRandomChar(lo);
    for (let i = 0; i < 2; i++) p += getRandomChar(di);
    for (let i = 0; i < 2; i++) p += getRandomChar(sp);
    // Cryptographically secure Fisher-Yates shuffle
    const arr = p.split('');
    for (let i = arr.length - 1; i > 0; i--) {
      const rand = new Uint32Array(1);
      crypto.getRandomValues(rand);
      const j = rand[0] % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    p = arr.join('');
    setNewPassword(p); setConfirmPassword(p);
    toast.success('Secure password generated!');
  };
  const handleChangePassword = (emp: Employee) => {
    if (emp.role === 'SUPERADMIN' && !isSuperAdmin) { toast.error('Only SUPERADMIN can change SUPERADMIN password'); return; }
    setSelectedEmployee(emp); setNewPassword(''); setConfirmPassword(''); setPasswordDialogOpen(true);
  };
  const submitPasswordUpdate = async () => {
    if (!selectedEmployee) return;
    if (!newPassword) { toast.error('Password is required'); return; }
    const val = validateSecurePassword(newPassword);
    if (!val.isValid) { toast.error(val.errors[0] || 'Password does not meet requirements'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    try {
      setIsUpdatingPassword(true);
      await employeeService.updatePassword(selectedEmployee.id, newPassword);
      toast.success('Password updated. Email sent to employee.');
      setPasswordDialogOpen(false); setSelectedEmployee(null); setNewPassword(''); setConfirmPassword('');
    } catch (err: unknown) { handleError(err); }
    finally { setIsUpdatingPassword(false); }
  };

  const hasActiveFilters = searchQuery || roleFilter !== "all" || designationFilter !== "all" || statusFilter !== "all";
  const filteredUsers    = employees || [];

  // shared SortableTableHead props
  const sh = { sortBy: sortBy as string, sortDir, onSort: handleSort };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Employee Management</h1>
          <p className="text-sm text-muted-foreground">Manage employee records and roles</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          {!isAccessDenied && (
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <UserPlus className="mr-2 h-4 w-4" />
              <span>Add Employee</span>
            </Button>
          </DialogTrigger>
          )}
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
              <DialogDescription>Enter employee details to add them to the system</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddEmployee} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" placeholder="John Doe" value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="john@company.com" value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <div className="space-y-2 bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <Label className="text-blue-900 dark:text-blue-100 font-semibold">🔐 Secure Password</Label>
                <p className="text-sm text-blue-700 dark:text-blue-300">A secure 12-character password will be auto-generated and sent to the employee's email.</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">Format: 4 uppercase + 4 lowercase + 2 digits + 2 special characters</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })} required>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="INTERN">Intern</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                    {isSuperAdmin && <SelectItem value="SUPERADMIN">Super Admin</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              {!isHR && (
                <div className="space-y-2">
                  <Label htmlFor="salary">Monthly Salary</Label>
                  <Input id="salary" type="number" placeholder="50000" value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })} required />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="joiningDate">Joining Date</Label>
                <Input id="joiningDate" type="date" value={formData.joining_date}
                  onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endingDate">Ending Date (Optional)</Label>
                <Input id="endingDate" type="date" value={formData.ending_date}
                  onChange={(e) => setFormData({ ...formData, ending_date: e.target.value })} />
                <p className="text-xs text-muted-foreground">Leave empty if employee has no end date</p>
              </div>
              <div className="flex gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1" disabled={isCreating}>
                  {isCreating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</> : "Add Employee"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table card */}
      <Card>
        <CardHeader>
          <CardTitle>All Employees</CardTitle>
          <CardDescription>View and manage all employees</CardDescription>

          {/* Filters — hidden when access is denied */}
          {!isAccessDenied && (
            <>
              {/* Filters row 1 — search + role + status */}
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mt-2">
                <div className="relative sm:col-span-2">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search by name, email, or manager..." className="pl-9 pr-9"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
                  {searchQuery !== debouncedSearch && (
                    <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger><SelectValue placeholder="Filter by role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="INTERN">Intern</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    {isSuperAdmin && <SelectItem value="SUPERADMIN">Super Admin</SelectItem>}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger><SelectValue placeholder="Filter by status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="deactive">Deactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filters row 2 — designation */}
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 mt-2">
                <Select value={designationFilter} onValueChange={(v) => { setDesignationFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger><SelectValue placeholder="Filter by designation" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Designations</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {designations?.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.designation_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Active filter chips */}
              {hasActiveFilters && (
                <div className="mt-3 flex items-center gap-2 text-sm flex-wrap">
                  <span className="text-muted-foreground">Filters:</span>
                  {searchQuery    && <Badge variant="secondary">Search: "{searchQuery}"</Badge>}
                  {roleFilter !== "all"        && <Badge variant="secondary">Role: {roleFilter}</Badge>}
                  {statusFilter !== "all"      && <Badge variant="secondary">Status: {statusFilter}</Badge>}
                  {designationFilter !== "all" && (
                    <Badge variant="secondary">
                      {designationFilter === "unassigned"
                        ? "Unassigned"
                        : designations.find(d => String(d.id) === designationFilter)?.designation_name}
                    </Badge>
                  )}
                  <span className="text-muted-foreground">({totalCount} {totalCount === 1 ? 'employee' : 'employees'})</span>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs"
                    onClick={() => {
                      setSearchQuery(""); setRoleFilter("all");
                      setDesignationFilter("all"); setStatusFilter("all"); setCurrentPage(1);
                    }}>
                    Clear All
                  </Button>
                </div>
              )}
            </>
          )}
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={pageSize} columns={isHR ? 8 : 9} showActions />
          ) : error ? (
            <ErrorDisplay
              error={error}
              onRetry={isAccessDenied ? undefined : () => refetch()}
            />
          ) : (
            <>
              {/* smooth fade while re-fetching (sort / filter change) */}
              <div className={`border rounded-lg overflow-x-auto transition-opacity duration-150 ${isFetching ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {/* sticky left — Name */}
                      <SortableTableHead column="name"         label="Name"         {...sh} className="sticky left-0 z-10 bg-background min-w-[160px] shadow-[1px_0_0_0_hsl(var(--border))]" />
                      <SortableTableHead column="email"        label="Email"        {...sh} className="min-w-[200px] hidden sm:table-cell" />
                      <SortableTableHead column="role"         label="Role"         {...sh} className="min-w-[120px]" />
                      <TableHead className="min-w-[160px] hidden lg:table-cell">Designation</TableHead>
                      <SortableTableHead column="manager_name" label="Manager"      {...sh} className="min-w-[140px] hidden md:table-cell" />
                      {!isHR && <SortableTableHead column="salary" label="Salary"   {...sh} className="min-w-[110px] hidden md:table-cell" />}
                      <SortableTableHead column="joining_date" label="Joining Date" {...sh} className="min-w-[130px] hidden lg:table-cell" />
                      <SortableTableHead column="birth_date"   label="Birth Date"   {...sh} className="min-w-[130px] hidden xl:table-cell" />
                      <SortableTableHead column="status"       label="Status"       {...sh} className="min-w-[90px]" />
                      {/* sticky right — Actions */}
                      <TableHead className="sticky right-0 z-10 bg-background w-[60px] text-center shadow-[-1px_0_0_0_hsl(var(--border))]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isHR ? 9 : 10} className="text-center py-8 text-muted-foreground">
                          No employees found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((emp, idx) => (
                        <TableRow key={emp.id}>
                          <TableCell className="sticky left-0 z-10 bg-background shadow-[1px_0_0_0_hsl(var(--border))]">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarFallback className={`${avatarColour(idx)} text-white text-xs font-bold`}>
                                  {getInitials(emp.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{emp.full_name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm hidden sm:table-cell">{emp.email}</TableCell>
                          <TableCell>
                            <Badge className={roleBadgeClass[emp.role] || roleBadgeClass.EMPLOYEE}>
                              {emp.role?.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm hidden lg:table-cell">
                            {emp.designation_name || <span className="text-muted-foreground italic">Not Assigned</span>}
                          </TableCell>
                          <TableCell className="text-sm hidden md:table-cell">
                            {emp.manager_name || <span className="text-muted-foreground italic">Not Assigned</span>}
                          </TableCell>
                          {!isHR && <TableCell className="text-sm hidden md:table-cell">₹{(emp.salary || 0).toLocaleString()}</TableCell>}
                          <TableCell className="hidden lg:table-cell">{formatDate(emp.joining_date)}</TableCell>
                          <TableCell className="hidden xl:table-cell">{formatDate(emp.birth_date)}</TableCell>
                          <TableCell>
                            <Badge className={emp.status === 'active' ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}>
                              {emp.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="sticky right-0 z-10 bg-background text-center shadow-[-1px_0_0_0_hsl(var(--border))]">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {emp.role === 'SUPERADMIN' && !isSuperAdmin ? (
                                  <DropdownMenuItem disabled>
                                    <span className="text-muted-foreground text-xs">Only SUPERADMIN can edit this user</span>
                                  </DropdownMenuItem>
                                ) : (
                                  <>
                                    {(isAdmin || isHR )  && (
                                      <DropdownMenuItem onClick={() => handleChangePassword(emp)}>
                                        <Key className="mr-2 h-4 w-4" />Change Password
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => handleEditInfo(emp)}>
                                      <Edit className="mr-2 h-4 w-4" />Edit Info
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUpdateRole(emp)}>
                                      <UserCog className="mr-2 h-4 w-4" />Update Role
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUpdateManager(emp)}>
                                      <Users className="mr-2 h-4 w-4" />Assign Manager
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUpdateDesignation(emp)}>
                                      <Briefcase className="mr-2 h-4 w-4" />Assign Designation
                                    </DropdownMenuItem>
                                    {(isSuperAdmin || isAdmin) && (
                                      <DropdownMenuItem onClick={() => handleAdjustLeave(emp)}>
                                        <Calendar className="mr-2 h-4 w-4" />Adjust Leave Balance
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleDeactivate(emp)}
                                      className={emp.status === 'active' ? 'text-destructive' : 'text-success'}
                                    >
                                      {emp.status === 'active'
                                        ? <><UserX className="mr-2 h-4 w-4" />Deactivate</>
                                        : <><UserCheck className="mr-2 h-4 w-4" />Activate</>}
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <ServerPagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={totalCount}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
                itemName="employees"
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Dialogs ──────────────────────────────────────────────────────────── */}

      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Update Employee Role</DialogTitle>
            <DialogDescription>Change the role for {selectedEmployee?.full_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger><SelectValue placeholder="Select new role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  <SelectItem value="INTERN">Intern</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  {isSuperAdmin && <SelectItem value="SUPERADMIN">Super Admin</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setRoleDialogOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={submitRoleUpdate} className="flex-1">Update Role</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={managerDialogOpen} onOpenChange={setManagerDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Assign Manager</DialogTitle>
            <DialogDescription>Assign a manager to {selectedEmployee?.full_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Manager</Label>
              <SearchableSelect
                options={managerSelect.options.filter(o => o.value !== selectedEmployee?.id)}
                value={newManagerId}
                onValueChange={setNewManagerId}
                placeholder="Select manager..."
                searchPlaceholder="Search by name..."
                emptyMessage="No managers found."
                className="w-full"
                loading={managerSelect.loading}
                showAllOption={false}
                onSearchChange={managerSelect.onSearch}
                hasMore={managerSelect.hasMore}
                onLoadMore={managerSelect.loadMore}
              />
            </div>
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setManagerDialogOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={submitManagerUpdate} className="flex-1" disabled={!newManagerId}>Assign Manager</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={designationDialogOpen} onOpenChange={setDesignationDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Assign Designation</DialogTitle>
            <DialogDescription>Assign a designation to {selectedEmployee?.full_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Designation</Label>
              <Select value={newDesignationId || "NONE"} onValueChange={setNewDesignationId}>
                <SelectTrigger><SelectValue placeholder="Select designation" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None (Remove Designation)</SelectItem>
                  {designations?.map(d => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.designation_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setDesignationDialogOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={submitDesignationUpdate} className="flex-1" disabled={isUpdatingDesignation}>
                {isUpdatingDesignation ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</> : "Assign Designation"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={leaveAdjustDialogOpen} onOpenChange={setLeaveAdjustDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Adjust Leave Balance</DialogTitle>
            <DialogDescription>Adjust leave balance for {selectedEmployee?.full_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Leave Type</Label>
              <Select value={adjustmentData.leave_type_id}
                onValueChange={(v) => setAdjustmentData({ ...adjustmentData, leave_type_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select leave type" /></SelectTrigger>
                <SelectContent>
                  {leavePolicies?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity (Days)</Label>
              <Input id="quantity" type="number" placeholder="2" value={adjustmentData.quantity}
                onChange={(e) => setAdjustmentData({ ...adjustmentData, quantity: e.target.value })} />
              <p className="text-xs text-muted-foreground">Use positive to add, negative to deduct</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea id="reason" placeholder="Comp off for weekend work" rows={3}
                value={adjustmentData.reason}
                onChange={(e) => setAdjustmentData({ ...adjustmentData, reason: e.target.value })} />
            </div>
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setLeaveAdjustDialogOpen(false)} className="flex-1" disabled={isAdjustingLeave}>Cancel</Button>
              <Button onClick={submitLeaveAdjustment} className="flex-1" disabled={isAdjustingLeave}>
                {isAdjustingLeave ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adjusting...</> : "Adjust Balance"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editInfoDialogOpen} onOpenChange={setEditInfoDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee Information</DialogTitle>
            <DialogDescription>Update employee details. Changes will be saved immediately.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_full_name">Full Name</Label>
              <Input id="edit_full_name" value={editInfoForm.full_name} placeholder="Enter full name"
                onChange={(e) => setEditInfoForm({ ...editInfoForm, full_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_email">Email</Label>
              <Input id="edit_email" type="email" value={editInfoForm.email}
                placeholder="Enter email" onChange={(e) => setEditInfoForm({ ...editInfoForm, email: e.target.value })} />
              <p className="text-xs text-muted-foreground">Email must end with your company domain</p>
            </div>
            {!isHR && (
              <div className="space-y-2">
                <Label htmlFor="edit_salary">Salary</Label>
                <Input id="edit_salary" type="number" value={editInfoForm.salary} placeholder="Enter salary"
                  onChange={(e) => setEditInfoForm({ ...editInfoForm, salary: parseFloat(e.target.value) || 0 })} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit_joining_date">Joining Date</Label>
              <Input id="edit_joining_date" type="date" value={editInfoForm.joining_date}
                onChange={(e) => setEditInfoForm({ ...editInfoForm, joining_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_ending_date">Ending Date (Optional)</Label>
              <Input id="edit_ending_date" type="date" value={editInfoForm.ending_date}
                onChange={(e) => setEditInfoForm({ ...editInfoForm, ending_date: e.target.value })} />
              <p className="text-xs text-muted-foreground">Leave empty if employee has no end date</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_birth_date">Birth Date (Optional)</Label>
              <Input id="edit_birth_date" type="date" value={editInfoForm.birth_date}
                onChange={(e) => setEditInfoForm({ ...editInfoForm, birth_date: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setEditInfoDialogOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={submitInfoUpdate} className="flex-1">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Key className="h-5 w-5" />Change Employee Password</DialogTitle>
            <DialogDescription>
              Update password for {selectedEmployee?.full_name}. Must contain: 4 uppercase, 4 lowercase, 2 digits, 2 special chars (@#$%&*!?)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">🔐 Generate Secure Password</p>
                <p className="text-xs text-blue-700 dark:text-blue-300">Auto-generate a 12-character secure password</p>
              </div>
              <Button type="button" onClick={generateSecurePassword} variant="outline" size="sm"
                className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300">
                Generate
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_password">New Password</Label>
              <Input id="new_password" type="password" value={newPassword} placeholder="Enter new password"
                onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm Password</Label>
              <Input id="confirm_password" type="password" value={confirmPassword} placeholder="Confirm new password"
                onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-sm text-destructive">Passwords do not match</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setPasswordDialogOpen(false); setNewPassword(''); setConfirmPassword(''); }}
              disabled={isUpdatingPassword} className="flex-1">Cancel</Button>
            <Button onClick={submitPasswordUpdate} disabled={isUpdatingPassword} className="flex-1">
              {isUpdatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deactivate/Activate Confirmation Dialog — replaces window.confirm */}
      <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedEmployee?.status === 'active' ? 'Deactivate' : 'Activate'} Employee
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {selectedEmployee?.status === 'active' ? 'deactivate' : 'activate'}{' '}
              <span className="font-semibold">{selectedEmployee?.full_name}</span>?
              {selectedEmployee?.status === 'active' && ' They will lose access to the system.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setDeactivateDialogOpen(false); setSelectedEmployee(null); }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeactivate}
              className={selectedEmployee?.status === 'active' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {selectedEmployee?.status === 'active' ? 'Yes, Deactivate' : 'Yes, Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Employees;