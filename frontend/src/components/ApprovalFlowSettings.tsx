/* eslint-disable react-refresh/only-export-components */
/**
 * ApprovalFlowSettings
 * ─────────────────────────────────────────────────────────────────
 * Reusable component — can be dropped into any settings page.
 *
 * Rules enforced from the backend `is_system` flag:
 *   is_system = true  → read-only card (no edit, no save, no delete)
 *   is_system = false → fully editable
 */
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Loader2, Plus, Trash2, Edit2, Save, X,
  GitMerge, ChevronDown, Lock,
} from 'lucide-react';
import { CardSkeleton } from '@/components/skeletons/CardSkeleton';
import { useApprovalFlow, useSystemRoles } from '@/hooks/useApprovalFlow';
import type { ApproverRole, ApprovalStage, LeaveApprovalFlowResponse } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────
const APPROVER_ROLES: ApproverRole[] = ['SUPERADMIN', 'HR', 'ADMIN', 'MANAGER'];

const ROLE_COLORS: Record<string, string> = {
  SUPERADMIN: 'bg-red-100    text-red-800    dark:bg-red-900/30    dark:text-red-300',
  ADMIN:      'bg-blue-100   text-blue-800   dark:bg-blue-900/30   dark:text-blue-300',
  HR:         'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  MANAGER:    'bg-amber-100  text-amber-800  dark:bg-amber-900/30  dark:text-amber-300',
};

// ─── Pure stage mutation helpers (no side-effects) ───────────────────────────
export function stageAdd(prev: ApprovalStage[]): ApprovalStage[] {
  const maxNo = prev.reduce((m, s) => Math.max(m, s.stage_no), 0);
  return [...prev, { stage_no: maxNo + 1, approver_role: 'MANAGER' }];
}

export function stageAddApprover(prev: ApprovalStage[], stageNo: number): ApprovalStage[] {
  const used = prev.filter(s => s.stage_no === stageNo).map(s => s.approver_role);
  const next = APPROVER_ROLES.find(r => !used.includes(r));
  if (!next) return prev;
  return [...prev, { stage_no: stageNo, approver_role: next }];
}

export function stageChangeApprover(
  prev: ApprovalStage[], stageNo: number, idx: number, role: ApproverRole
): ApprovalStage[] {
  let count = 0;
  return prev.map(s => {
    if (s.stage_no !== stageNo) return s;
    return count++ === idx ? { ...s, approver_role: role } : s;
  });
}

export function stageRemoveApprover(prev: ApprovalStage[], stageNo: number, idx: number): ApprovalStage[] {
  let count = 0;
  const filtered = prev.filter(s => {
    if (s.stage_no !== stageNo) return true;
    return count++ !== idx;
  });
  const nos   = [...new Set(filtered.map(s => s.stage_no))].sort((a, b) => a - b);
  const renum = new Map(nos.map((n, i) => [n, i + 1]));
  return filtered.map(s => ({ ...s, stage_no: renum.get(s.stage_no)! }));
}

export function stageRemoveStage(prev: ApprovalStage[], stageNo: number): ApprovalStage[] {
  const filtered = prev.filter(s => s.stage_no !== stageNo);
  const nos   = [...new Set(filtered.map(s => s.stage_no))].sort((a, b) => a - b);
  const renum = new Map(nos.map((n, i) => [n, i + 1]));
  return filtered.map(s => ({ ...s, stage_no: renum.get(s.stage_no)! }));
}

function groupByStageNo(flow: ApprovalStage[]): [number, ApprovalStage[]][] {
  const map = new Map<number, ApprovalStage[]>();
  for (const s of flow) {
    if (!map.has(s.stage_no)) map.set(s.stage_no, []);
    map.get(s.stage_no)!.push(s);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a - b);
}

// ─── Reusable: StagePipeline renderer ────────────────────────────────────────

export interface StagePipelineProps {
  stages:           ApprovalStage[];
  readOnly?:        boolean;
  onAddStage?:      () => void;
  onAddApprover?:   (stageNo: number) => void;
  onChangeApprover?:(stageNo: number, idx: number, role: ApproverRole) => void;
  onRemoveApprover?:(stageNo: number, idx: number) => void;
  onRemoveStage?:   (stageNo: number) => void;
}

export const StagePipeline = ({
  stages, readOnly = false,
  onAddStage, onAddApprover, onChangeApprover,
  onRemoveApprover, onRemoveStage,
}: StagePipelineProps) => {
  const stageGroups = groupByStageNo(stages);

  if (stageGroups.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-5">
        {readOnly ? 'No stages configured.' : 'Click "Add Stage" to build your pipeline.'}
      </p>
    );
  }

  return (
    <div className="divide-y">
      {stageGroups.map(([stageNo, rows], groupIdx) => (
        <div key={stageNo} className="flex items-start gap-3 px-4 py-3">
          {/* Stage number + vertical connector */}
          <div className="flex flex-col items-center gap-0.5 pt-1 shrink-0 w-6">
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-[11px] font-bold">
              {stageNo}
            </span>
            {groupIdx < stageGroups.length - 1 && (
              <ChevronDown className="h-4 w-4 text-muted-foreground mt-0.5" />
            )}
          </div>

          {/* Horizontal approver chips */}
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {rows.map((stage, approverIdx) => (
              <div
                key={`${stageNo}-${approverIdx}`}
                className={`flex items-center gap-1.5 border rounded-lg px-2 py-1.5 bg-background shadow-sm ${readOnly ? 'opacity-70' : ''}`}
              >
                {readOnly ? (
                  <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${ROLE_COLORS[stage.approver_role]}`}>
                    {stage.approver_role}
                  </span>
                ) : (
                  <>
                    <Select
                      value={stage.approver_role}
                      onValueChange={v => onChangeApprover?.(stageNo, approverIdx, v as ApproverRole)}
                    >
                      <SelectTrigger className="h-7 w-32 text-xs border-0 p-0 focus:ring-0 shadow-none">
                        <SelectValue>
                          <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${ROLE_COLORS[stage.approver_role]}`}>
                            {stage.approver_role}
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {APPROVER_ROLES.map(r => (
                          <SelectItem
                            key={r} value={r} className="text-xs"
                            disabled={r !== stage.approver_role && rows.some(s => s.approver_role === r)}
                          >
                            <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${ROLE_COLORS[r]}`}>{r}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button type="button"
                      onClick={() => onRemoveApprover?.(stageNo, approverIdx)}
                      className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))}

            {/* Add parallel approver */}
            {!readOnly && rows.length < APPROVER_ROLES.length && (
              <button type="button"
                onClick={() => onAddApprover?.(stageNo)}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 border border-dashed border-primary/40 hover:border-primary rounded-lg px-2 py-1.5 transition-colors">
                <Plus className="h-3 w-3" />
                Add Approver
              </button>
            )}
          </div>

          {/* Remove entire stage */}
          {!readOnly && (
            <button type="button"
              onClick={() => onRemoveStage?.(stageNo)}
              className="text-muted-foreground hover:text-destructive transition-colors pt-1.5 shrink-0">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}

      {/* ✓ Approved footer */}
      <div className="px-4 py-2 border-t bg-muted/20 flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full font-medium">
          ✓ Approved
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
};

// ─── NewFlowCard (inline draft — no API until Create) ────────────────────────

interface NewFlowCardProps {
  onCreate:   (payload: { name: string; flow: ApprovalStage[] }) => void;
  onCancel:   () => void;
  isCreating: boolean;
}

export const NewFlowCard = ({ onCreate, onCancel, isCreating }: NewFlowCardProps) => {
  const [name,   setName]   = useState('');
  const [stages, setStages] = useState<ApprovalStage[]>([]);
  const nameOk = name.trim().length > 0;

  const handleCreate = () => {
    if (!nameOk) return;
    const flow = stages.length > 0 ? stages : [{ stage_no: 1, approver_role: 'MANAGER' as ApproverRole }];
    onCreate({ name: name.trim(), flow });
  };

  return (
    <div className="border-2 border-primary/50 rounded-lg bg-card overflow-hidden">
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2 flex-1 mr-4">
          <GitMerge className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            autoFocus
            placeholder="Flow name  e.g. Standard Employee Flow"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') onCancel(); }}
            className="h-8 text-sm max-w-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm"
            disabled={!nameOk} onClick={() => setStages(stageAdd)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Stage
          </Button>
          <Button type="button" size="sm"
            disabled={!nameOk || isCreating} onClick={handleCreate}>
            {isCreating
              ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Creating…</>
              : <><Save   className="h-3.5 w-3.5 mr-1" />Create</>}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <StagePipeline
        stages={stages}
        onAddStage={() => setStages(stageAdd)}
        onAddApprover={no   => setStages(p => stageAddApprover(p, no))}
        onChangeApprover={(no, i, r) => setStages(p => stageChangeApprover(p, no, i, r))}
        onRemoveApprover={(no, i)    => setStages(p => stageRemoveApprover(p, no, i))}
        onRemoveStage={no   => setStages(p => stageRemoveStage(p, no))}
      />
    </div>
  );
};

// ─── FlowCard (existing flow — editable or read-only based on is_system) ─────

interface FlowCardProps {
  flow:       LeaveApprovalFlowResponse;
  onUpdate:   (id: string, payload: { name: string; flow: ApprovalStage[] }) => void;
  onDelete:   (id: string) => void;
  isUpdating: boolean;
  isDeleting: boolean;
}

export const FlowCard = ({ flow, onUpdate, onDelete, isUpdating, isDeleting }: FlowCardProps) => {
  const locked = flow.is_system;

  const [stages,   setStages]   = useState<ApprovalStage[]>(flow.flow);
  const [editName, setEditName] = useState(flow.name);
  const [nameEdit, setNameEdit] = useState(false);
  const [dirty,    setDirty]    = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const uniqueStages = new Set(stages.map(s => s.stage_no)).size;

  const mutate = (fn: (p: ApprovalStage[]) => ApprovalStage[]) => {
    setStages(fn);
    setDirty(true);
  };

  const handleSave = () => {
    onUpdate(flow.id, { name: editName.trim() || flow.name, flow: stages });
    setDirty(false);
    setNameEdit(false);
  };

  return (
    <div className={`border rounded-lg bg-card overflow-hidden ${locked ? 'opacity-80' : ''}`}>
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2 flex-1 mr-2">
          <GitMerge className="h-4 w-4 text-muted-foreground shrink-0" />

          {!locked && nameEdit ? (
            <Input
              autoFocus
              value={editName}
              onChange={e => { setEditName(e.target.value); setDirty(true); }}
              onKeyDown={e => { if (e.key === 'Escape') { setEditName(flow.name); setNameEdit(false); } }}
              className="h-8 text-sm max-w-xs"
            />
          ) : (
            <span className="font-semibold text-sm">{editName}</span>
          )}

          {!locked && (
            <button type="button" onClick={() => setNameEdit(e => !e)}
              className="text-muted-foreground hover:text-primary transition-colors">
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          )}

          <Badge variant="outline" className="text-xs">
            {uniqueStages} stage{uniqueStages !== 1 ? 's' : ''}
          </Badge>

          {locked && (
            <Badge variant="secondary" className="text-xs gap-1 text-muted-foreground">
              <Lock className="h-3 w-3" />
              System
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!locked && (
            <Button type="button" variant="outline" size="sm"
              onClick={() => mutate(stageAdd)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Stage
            </Button>
          )}

          {!locked && (
            <Button type="button" size="sm"
              disabled={!dirty || isUpdating} onClick={handleSave}>
              {isUpdating
                ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Saving…</>
                : <><Save   className="h-3.5 w-3.5 mr-1" />Save</>}
            </Button>
          )}

          {!locked && (
            <Button type="button" variant="ghost" size="sm"
              onClick={() => setDeleteOpen(true)}
              className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <StagePipeline
        stages={stages}
        readOnly={locked}
        onAddStage={() => mutate(stageAdd)}
        onAddApprover={no    => mutate(p => stageAddApprover(p, no))}
        onChangeApprover={(no, i, r) => mutate(p => stageChangeApprover(p, no, i, r))}
        onRemoveApprover={(no, i)    => mutate(p => stageRemoveApprover(p, no, i))}
        onRemoveStage={no    => mutate(p => stageRemoveStage(p, no))}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{flow.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the entire approval flow and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={() => { onDelete(flow.id); setDeleteOpen(false); }}
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ─── Main page-level component ────────────────────────────────────────────────

export const ApprovalFlowSettings = () => {
  const {
    flows, isLoading,
    createFlow, isCreating,
    updateFlow, isUpdating,
    deleteFlow, isDeleting,
  } = useApprovalFlow();
  const { isLoading: isLoadingRoles } = useSystemRoles();

  const [showNewCard, setShowNewCard] = useState(false);

  if (isLoading || isLoadingRoles) return <CardSkeleton rows={5} />;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitMerge className="h-5 w-5" />
              Leave Approval Flows
            </CardTitle>
            <CardDescription className="mt-1">
              Create named approval pipelines. Stages run in order — multiple
              approvers on the same stage run in parallel.
              System flows are read-only.
            </CardDescription>
          </div>
          {!showNewCard && (
            <Button size="sm" onClick={() => setShowNewCard(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Flow
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {showNewCard && (
          <NewFlowCard
            isCreating={isCreating}
            onCancel={() => setShowNewCard(false)}
            onCreate={payload =>
              createFlow(payload, { onSuccess: () => setShowNewCard(false) })
            }
          />
        )}

        {flows.length === 0 && !showNewCard ? (
          <div className="text-center py-10 border-dashed border-2 rounded-lg">
            <GitMerge className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground font-medium">No approval flows configured</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click "New Flow" to create your first approval pipeline.
            </p>
          </div>
        ) : (
          flows.map(flow => (
            <FlowCard
              key={flow.id}
              flow={flow}
              onUpdate={(id, payload) => updateFlow({ id, payload })}
              onDelete={id => deleteFlow(id)}
              isUpdating={isUpdating}
              isDeleting={isDeleting}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
};