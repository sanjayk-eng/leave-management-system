import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLeavePolicies } from "@/hooks/useLeaves";
import { useApprovalFlow } from "@/hooks/useApprovalFlow";
import { Plus, Trash2, Edit, GitMerge } from "lucide-react";
import { PolicyFormDialog, PolicyFormValues, POLICY_FORM_DEFAULTS } from "@/components/leave/PolicyFormDialog";
import { CardSkeleton } from "@/components/skeletons/CardSkeleton";
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

export default function LeavePolicies() {
  const {
    policies = [],
    isLoading: isLoadingPolicies,
    addPolicy,
    isAdding: isAddingPolicy,
    updatePolicy,
    isUpdating: isUpdatingPolicy,
    deletePolicy,
    isDeleting: isDeletingPolicy,
  } = useLeavePolicies();
  const { flows = [] } = useApprovalFlow();

  // Dialog state
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [editPolicyDialogOpen, setEditPolicyDialogOpen] = useState(false);
  const [deletePolicyDialogOpen, setDeletePolicyDialogOpen] = useState(false);
  const [selectedPolicyId, setSelectedPolicyId] = useState<number | null>(null);
  const [editPolicyInitial, setEditPolicyInitial] = useState<Partial<PolicyFormValues>>(POLICY_FORM_DEFAULTS);

  const handleAddPolicy = (values: PolicyFormValues) => {
    addPolicy({
      name:                values.name,
      is_paid:             values.is_paid,
      is_early:            values.is_early,
      is_work_from_home:   values.is_work_from_home,
      default_entitlement: parseInt(values.default_entitlement),
      intern_entitlement:  values.intern_entitlement ? parseInt(values.intern_entitlement) : undefined,
      approval_flow_id:    values.approval_flow_id || undefined,
    });
    setPolicyDialogOpen(false);
  };

  const handleEditPolicyClick = (policy: (typeof policies)[number]) => {
    setSelectedPolicyId(policy.id);
    setEditPolicyInitial({
      name:                policy.name,
      is_paid:             policy.is_paid,
      is_early:            policy.is_early        || false,
      is_work_from_home:   policy.is_work_from_home || false,
      default_entitlement: policy.default_entitlement.toString(),
      intern_entitlement:  policy.intern_entitlement ? policy.intern_entitlement.toString() : '',
      approval_flow_id:    policy.approval_flow_id || '',
    });
    setEditPolicyDialogOpen(true);
  };

  const handleUpdatePolicy = (values: PolicyFormValues) => {
    if (!selectedPolicyId) return;
    updatePolicy({
      id: selectedPolicyId,
      data: {
        name:                values.name,
        is_paid:             values.is_paid,
        is_early:            values.is_early,
        is_work_from_home:   values.is_work_from_home,
        default_entitlement: parseInt(values.default_entitlement),
        intern_entitlement:  values.intern_entitlement ? parseInt(values.intern_entitlement) : undefined,
        approval_flow_id:    values.approval_flow_id || undefined,
      },
    });
    setEditPolicyDialogOpen(false);
    setSelectedPolicyId(null);
  };

  const handleDeletePolicyClick = (id: number) => {
    setSelectedPolicyId(id);
    setDeletePolicyDialogOpen(true);
  };

  const confirmDeletePolicy = () => {
    if (selectedPolicyId) deletePolicy(selectedPolicyId);
    setDeletePolicyDialogOpen(false);
    setSelectedPolicyId(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Configured Policies</CardTitle>
            <Button size="sm" onClick={() => setPolicyDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Policy
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingPolicies ? (
            <CardSkeleton showHeader={false} rows={4} />
          ) : (
            <div className="space-y-4">
              {!policies || policies.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No leave policies configured. Click "Add Policy" to create one.
                </p>
              ) : (
                policies.map((policy) => (
                  <div key={policy.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{policy.name}</p>
                      <div className="flex items-center gap-2">
                        <Badge className={policy.is_paid ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}>
                          {policy.is_paid ? "Paid" : "Unpaid"}
                        </Badge>
                        {policy.is_early && <Badge className="bg-blue-500 text-white">Early</Badge>}
                        {policy.is_work_from_home && <Badge className="bg-purple-500 text-white">WFH</Badge>}
                        {policy.approval_flow_id && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <GitMerge className="h-3 w-3" />
                            {flows.find(f => f.id === policy.approval_flow_id)?.name ?? "Flow"}
                          </Badge>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleEditPolicyClick(policy)} disabled={isUpdatingPolicy}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeletePolicyClick(policy.id)} disabled={isDeletingPolicy}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{policy.default_entitlement} days per year</p>
                    {policy.intern_entitlement != null && (
                      <p className="text-xs text-muted-foreground">Intern: {policy.intern_entitlement} days per year</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add Policy Dialog ── */}
      <PolicyFormDialog
        mode="add"
        open={policyDialogOpen}
        onOpenChange={setPolicyDialogOpen}
        flows={flows}
        onSubmit={handleAddPolicy}
        isSubmitting={isAddingPolicy}
      />

      {/* ── Edit Policy Dialog ── */}
      <PolicyFormDialog
        mode="edit"
        open={editPolicyDialogOpen}
        onOpenChange={setEditPolicyDialogOpen}
        initial={editPolicyInitial}
        flows={flows}
        onSubmit={handleUpdatePolicy}
        isSubmitting={isUpdatingPolicy}
      />

      {/* ── Delete Policy Confirm ── */}
      <AlertDialog open={deletePolicyDialogOpen} onOpenChange={setDeletePolicyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Leave Policy</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this leave policy? This action cannot be undone and may affect existing leave applications.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePolicy} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Policy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
