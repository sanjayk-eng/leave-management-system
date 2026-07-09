import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Loader2, UserCheck, Trash2, Edit } from 'lucide-react';
import { useEquipmentAssignments } from '../../hooks/useEquipment';
import {
  AssignEquipmentRequest, AssignedEquipment,
  RemoveEquipmentRequest, UpdateAssignmentRequest,
} from '../../types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '../../hooks/useAuth';
import { formatPurchaseDate } from '../../utils/dateUtils';
import { TableSkeleton } from '../skeletons/TableSkeleton';
import { ServerPagination } from '../ServerPagination';
import { SearchableSelect } from '../SearchableSelect';
import { useEmployeeSelect, useEquipmentSelect } from './shared';
import { employeeService } from '../../services/employeeService';
import { equipmentService } from '../../services/equipmentService';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { ApiError } from '@/lib/api';

const EMPTY_ASSIGN: AssignEquipmentRequest = { employee_id: '', equipment_id: '', quantity: 1 };

function isAccessDenied(err: Error | null): boolean {
  return err instanceof ApiError && (err.status === 403 || err.status === 401);
}

const EquipmentAssignments: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const assignmentParams = useMemo(
    () => ({ page: currentPage, page_size: pageSize }),
    [currentPage, pageSize],
  );

  const {
    assignments, loading, fetching, error,
    assignEquipment, removeEquipment, updateAssignment,
    fetchAssignments, fetchAssignmentsByEmployee,
    totalItems, totalPages,
  } = useEquipmentAssignments(assignmentParams);

  // Server-driven dropdowns — all search backend as user types, 10 per page
  const employeeFilterSelect = useEmployeeSelect();   // toolbar filter
  const employeeDialogSelect = useEmployeeSelect();   // assign dialog
  const reassignSelect = useEmployeeSelect();          // reassign dialog
  const equipmentDialogSelect = useEquipmentSelect(); // assign dialog

  const { toast } = useToast();
  const { currentUser } = useAuth();

  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignedEquipment | null>(null);

  const [formData, setFormData] = useState<AssignEquipmentRequest>(EMPTY_ASSIGN);
  const [removeData, setRemoveData] = useState<RemoveEquipmentRequest>({ employee_id: '', equipment_id: '' });
  const [updateData, setUpdateData] = useState<UpdateAssignmentRequest>({
    from_employee_id: '', to_employee_id: undefined, equipment_id: '', quantity: 1,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterEmployee, setFilterEmployee] = useState<string>('all');

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  // Resolve employee_id and equipment_id for an assignment row.
  // If the backend already returns them (future), use directly.
  // Otherwise do a targeted search by email/name — exact match, page_size=1.
  const resolveIds = useCallback(async (assignment: AssignedEquipment) => {
    // Use IDs directly if backend provides them
    if (assignment.employee_id && assignment.equipment_id) {
      return { employeeId: assignment.employee_id, equipmentId: assignment.equipment_id };
    }

    try {
      const [empRes, eqRes] = await Promise.all([
        employeeService.getAll({ search: assignment.employee_email, page: 1, page_size: 5 }),
        equipmentService.getAll({ search: assignment.equipment_name, page: 1, page_size: 5 }),
      ]);
      const employee = empRes.employees?.find((e) => e.email === assignment.employee_email);
      const equipment = eqRes.equipment?.find((e) => e.name === assignment.equipment_name);
      return { employeeId: employee?.id, equipmentId: equipment?.id };
    } catch {
      return { employeeId: undefined, equipmentId: undefined };
    }
  }, []);

  const showDataMismatch = () =>
    toast({
      title: '❌ Data Mismatch',
      description: 'Unable to find matching employee or asset records.',
      className: 'border-red-200 bg-red-50 text-red-800',
    });

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleAssign = async () => {
    if (!formData.employee_id || !formData.equipment_id || formData.quantity < 1) {
      toast({ title: '⚠️ Missing Information', description: 'Please select employee, asset, and enter valid quantity', className: 'border-amber-200 bg-amber-50 text-amber-800' });
      return;
    }
    setIsSubmitting(true);
    const result = await assignEquipment({ ...formData, assigned_by: currentUser?.id });
    if (result.success) {
      toast({ title: '✅ Asset Assigned', description: 'Asset assigned successfully', className: 'border-green-200 bg-green-50 text-green-800' });
      setIsAssignOpen(false);
      setFormData(EMPTY_ASSIGN);
    } else {
      toast({ title: '❌ Assignment Failed', description: result.error || 'Unable to assign asset.', className: 'border-red-200 bg-red-50 text-red-800' });
    }
    setIsSubmitting(false);
  };

  const handleRemove = async () => {
    setIsSubmitting(true);
    const result = await removeEquipment(removeData);
    if (result.success) {
      toast({ title: '🔄 Asset Returned', description: 'Asset returned successfully', className: 'border-blue-200 bg-blue-50 text-blue-800' });
      setIsRemoveOpen(false);
    } else {
      toast({ title: '❌ Return Failed', description: result.error || 'Unable to return asset.', className: 'border-red-200 bg-red-50 text-red-800' });
    }
    setIsSubmitting(false);
  };

  const handleUpdate = async () => {
    if (updateData.quantity < 1) {
      toast({ title: '⚠️ Invalid Quantity', description: 'Minimum quantity is 1', className: 'border-amber-200 bg-amber-50 text-amber-800' });
      return;
    }
    setIsSubmitting(true);
    const result = await updateAssignment({ ...updateData, assigned_by: currentUser?.id });
    if (result.success) {
      toast({
        title: updateData.to_employee_id ? '🔄 Asset Reassigned' : '✅ Assignment Updated',
        description: updateData.to_employee_id ? 'Asset reassigned successfully' : 'Quantity updated successfully',
        className: 'border-green-200 bg-green-50 text-green-800',
      });
      setIsUpdateOpen(false);
    } else {
      toast({ title: '❌ Update Failed', description: result.error || 'Unable to update assignment.', className: 'border-red-200 bg-red-50 text-red-800' });
    }
    setIsSubmitting(false);
  };

  const openRemoveDialog = async (assignment: AssignedEquipment) => {
    const { employeeId, equipmentId } = await resolveIds(assignment);
    if (!employeeId || !equipmentId) { showDataMismatch(); return; }
    setRemoveData({ employee_id: employeeId, equipment_id: equipmentId });
    setSelectedAssignment(assignment);
    setIsRemoveOpen(true);
  };

  const openUpdateDialog = async (assignment: AssignedEquipment) => {
    const { employeeId, equipmentId } = await resolveIds(assignment);
    if (!employeeId || !equipmentId) { showDataMismatch(); return; }
    setUpdateData({ from_employee_id: employeeId, to_employee_id: undefined, equipment_id: equipmentId, quantity: assignment.quantity || 1 });
    setSelectedAssignment(assignment);
    setIsUpdateOpen(true);
  };

  const handleFilterChange = (employeeId: string) => {
    setFilterEmployee(employeeId);
    setCurrentPage(1);
    if (employeeId !== 'all' && employeeId.trim()) {
      fetchAssignmentsByEmployee(employeeId);
    } else {
      fetchAssignments();
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Toolbar — hidden when access is denied */}
      {!isAccessDenied(error) && (
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-medium">Asset Assignments</h3>
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-muted-foreground" />
            <SearchableSelect
              options={employeeFilterSelect.options}
              value={filterEmployee}
              onValueChange={handleFilterChange}
              placeholder="Filter by employee"
              searchPlaceholder="Search employees..."
              allOptionLabel="All Employees"
              showAllOption
              className="w-[240px]"
              loading={employeeFilterSelect.loading}
              onSearchChange={employeeFilterSelect.onSearch}
              hasMore={employeeFilterSelect.hasMore}
              onLoadMore={employeeFilterSelect.loadMore}
            />
          </div>
        </div>

        <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setFormData(EMPTY_ASSIGN)}>
              <Plus className="h-4 w-4 mr-2" />
              Assign Asset
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Asset</DialogTitle>
              <DialogDescription>Assign an asset to an employee.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Employee *</Label>
                <SearchableSelect
                  options={employeeDialogSelect.options}
                  value={formData.employee_id}
                  onValueChange={(v) => setFormData({ ...formData, employee_id: v })}
                  placeholder="Select employee"
                  searchPlaceholder="Search employees..."
                  showAllOption={false}
                  className="w-full"
                  loading={employeeDialogSelect.loading}
                  onSearchChange={employeeDialogSelect.onSearch}
                  hasMore={employeeDialogSelect.hasMore}
                  onLoadMore={employeeDialogSelect.loadMore}
                />
              </div>
              <div>
                <Label>Asset *</Label>
                <SearchableSelect
                  options={equipmentDialogSelect.options}
                  value={formData.equipment_id}
                  onValueChange={(v) => setFormData({ ...formData, equipment_id: v })}
                  placeholder="Select asset"
                  searchPlaceholder="Search assets..."
                  showAllOption={false}
                  className="w-full"
                  loading={equipmentDialogSelect.loading}
                  onSearchChange={equipmentDialogSelect.onSearch}
                  hasMore={equipmentDialogSelect.hasMore}
                  onLoadMore={equipmentDialogSelect.loadMore}
                />
              </div>
              <div>
                <Label htmlFor="assign-qty">Quantity *</Label>
                <Input
                  id="assign-qty"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignOpen(false)}>Cancel</Button>
              <Button onClick={handleAssign} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Assign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      )}

      {/* Remove Dialog */}
      <Dialog open={isRemoveOpen} onOpenChange={setIsRemoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Asset</DialogTitle>
            <DialogDescription>Are you sure you want to remove this asset assignment?</DialogDescription>
          </DialogHeader>
          {selectedAssignment && (
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Employee:</span> {selectedAssignment.employee_name}</p>
              <p><span className="font-medium">Asset:</span> {selectedAssignment.equipment_name}</p>
              <p><span className="font-medium">Quantity:</span> {selectedAssignment.quantity}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRemoveOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRemove} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update / Reassign Dialog */}
      <Dialog open={isUpdateOpen} onOpenChange={setIsUpdateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Assignment</DialogTitle>
            <DialogDescription>Update quantity or reassign to another employee.</DialogDescription>
          </DialogHeader>
          {selectedAssignment && (
            <div className="space-y-4">
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Employee:</span> {selectedAssignment.employee_name}</p>
                <p><span className="font-medium">Asset:</span> {selectedAssignment.equipment_name}</p>
                <p><span className="font-medium">Current Quantity:</span> {selectedAssignment.quantity}</p>
              </div>
              <div>
                <Label htmlFor="update-qty">Quantity *</Label>
                <Input
                  id="update-qty"
                  type="number"
                  min="1"
                  value={updateData.quantity}
                  onChange={(e) => setUpdateData({ ...updateData, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label>Reassign to Employee (Optional)</Label>
                <SearchableSelect
                  options={reassignSelect.options.filter((o) => o.value !== updateData.from_employee_id)}
                  value={updateData.to_employee_id || 'all'}
                  onValueChange={(v) => setUpdateData({ ...updateData, to_employee_id: v === 'all' ? undefined : v })}
                  placeholder="Keep current employee"
                  searchPlaceholder="Search employees..."
                  allOptionLabel="Keep current employee"
                  showAllOption
                  className="w-full"
                  loading={reassignSelect.loading}
                  onSearchChange={reassignSelect.onSearch}
                  hasMore={reassignSelect.hasMore}
                  onLoadMore={reassignSelect.loadMore}
                />
                {updateData.to_employee_id && (
                  <p className="text-xs text-muted-foreground mt-1">Asset will be reassigned to the selected employee</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {updateData.to_employee_id ? 'Reassign' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <div className="border rounded-lg">
        {loading ? (
          <TableSkeleton rows={5} columns={6} showActions />
        ) : error ? (
          <div className="p-4">
            <ErrorDisplay error={error} onRetry={() => fetchAssignments()} />
          </div>
        ) : (
          <div className={fetching ? 'opacity-60 pointer-events-none transition-opacity duration-150' : ''}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Purchase Date</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Assigned By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No asset assignments found. Assign assets to employees to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  assignments.map((assignment, index) => assignment && (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{assignment.employee_name}</TableCell>
                      <TableCell>{assignment.employee_email}</TableCell>
                      <TableCell>{assignment.equipment_name}</TableCell>
                      <TableCell>{formatPurchaseDate(assignment.purchase_date)}</TableCell>
                      <TableCell>{assignment.quantity}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{assignment.approved_by_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => openUpdateDialog(assignment)} title="Update or reassign">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openRemoveDialog(assignment)} title="Return asset">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {!loading && assignments.length > 0 && (
          <ServerPagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalItems}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            itemName="assignments"
          />
        )}
      </div>
    </div>
  );
};

export default EquipmentAssignments;
