import { useState } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { FileText, Plus } from 'lucide-react';
import { useLeavePolicies } from '@/hooks/useLeaves';
import { useApprovalFlow } from '@/hooks/useApprovalFlow';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { PolicyRow }          from '@/components/leave/policy/PolicyCard';
import { PolicyDeleteDialog } from '@/components/leave/policy/PolicyDeleteDialog';
import { PolicyFormDialog, PolicyFormValues, POLICY_FORM_DEFAULTS } from '@/components/leave/PolicyFormDialog';
import type { LeavePolicy } from '@/services/leaveService';

type StatusFilter = 'active' | 'inactive' | 'all';

// ── pure helpers (no side-effects) ────────────────────────────────────────────

const toPayload = (v: PolicyFormValues) => ({
  name:                v.name,
  is_paid:             v.is_paid,
  is_early:            v.is_early,
  is_work_from_home:   v.is_work_from_home,
  default_entitlement: parseInt(v.default_entitlement),
  intern_entitlement:  v.intern_entitlement ? parseInt(v.intern_entitlement) : undefined,
  approval_flow_id:    v.approval_flow_id   || undefined,
});

const toFormValues = (p: LeavePolicy): Partial<PolicyFormValues> => ({
  name:                p.name,
  is_paid:             p.is_paid,
  is_early:            p.is_early          ?? false,
  is_work_from_home:   p.is_work_from_home ?? false,
  default_entitlement: p.default_entitlement.toString(),
  intern_entitlement:  p.intern_entitlement ? p.intern_entitlement.toString() : '',
  approval_flow_id:    p.approval_flow_id  ?? '',
});

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LeavePolicies() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  const {
    policies = [],
    isLoading,
    addPolicy,    isAdding,
    updatePolicy, isUpdating,
    deletePolicy, isDeleting,
    togglePolicy, isToggling,
  } = useLeavePolicies(statusFilter);
  const { flows = [] } = useApprovalFlow();

  const [addOpen,     setAddOpen]     = useState(false);
  const [editOpen,    setEditOpen]    = useState(false);
  const [deleteOpen,  setDeleteOpen]  = useState(false);
  const [selected,    setSelected]    = useState<number | null>(null);
  const [editInitial, setEditInitial] = useState<Partial<PolicyFormValues>>(POLICY_FORM_DEFAULTS);

  const handleAdd = (values: PolicyFormValues) => {
    addPolicy(toPayload(values));
    setAddOpen(false);
  };

  const handleEditOpen = (policy: LeavePolicy) => {
    setSelected(policy.id);
    setEditInitial(toFormValues(policy));
    setEditOpen(true);
  };

  const handleEdit = (values: PolicyFormValues) => {
    if (!selected) return;
    updatePolicy({ id: selected, data: toPayload(values) });
    setEditOpen(false);
    setSelected(null);
  };

  const handleDeleteOpen = (id: number) => {
    setSelected(id);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selected) deletePolicy(selected);
    setDeleteOpen(false);
    setSelected(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Leave Policies
              </CardTitle>
              <CardDescription>
                Configure leave types, entitlements, and approval flows
              </CardDescription>
            </div>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Policy
            </Button>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2 pt-2 flex-wrap">
            {(['active', 'inactive', 'all'] as StatusFilter[]).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={statusFilter === f ? 'default' : 'outline'}
                onClick={() => setStatusFilter(f)}
                className="capitalize"
              >
                {f}
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={4} columns={6} showActions />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Entitlement / yr</TableHead>
                  <TableHead>Approval Flow</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      {statusFilter === 'all'
                        ? 'No leave policies configured. Click "Add Policy" to create one.'
                        : `No ${statusFilter} policies found.`}
                    </TableCell>
                  </TableRow>
                ) : (
                  policies.map(policy => (
                    <PolicyRow
                      key={policy.id}
                      policy={policy}
                      flows={flows}
                      isUpdating={isUpdating}
                      isDeleting={isDeleting}
                      isToggling={isToggling}
                      onEdit={handleEditOpen}
                      onDelete={handleDeleteOpen}
                      onToggle={togglePolicy}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PolicyFormDialog
        mode="add"
        open={addOpen}
        onOpenChange={setAddOpen}
        flows={flows}
        onSubmit={handleAdd}
        isSubmitting={isAdding}
      />

      <PolicyFormDialog
        mode="edit"
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={editInitial}
        flows={flows}
        onSubmit={handleEdit}
        isSubmitting={isUpdating}
      />

      <PolicyDeleteDialog
        open={deleteOpen}
        onCancel={() => { setDeleteOpen(false); setSelected(null); }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
