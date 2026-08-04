// Table row for a single leave policy.
// Used inside the <TableBody> in LeavePolicies.tsx.

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { TableCell, TableRow } from '@/components/ui/table';
import { Edit, GitMerge, Trash2, Calendar } from 'lucide-react';
import type { LeavePolicy } from '@/services/leaveService';
import type { LeaveApprovalFlowResponse } from '@/types';

const MONTH_SHORT = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
];

interface Props {
  policy:     LeavePolicy;
  flows:      LeaveApprovalFlowResponse[];
  isUpdating: boolean;
  isDeleting: boolean;
  isToggling: boolean;
  onEdit:     (policy: LeavePolicy) => void;
  onDelete:   (id: number) => void;
  onToggle:   (id: number) => void;
}

export const PolicyRow = ({
  policy, flows, isUpdating, isDeleting, isToggling, onEdit, onDelete, onToggle,
}: Props) => {
  const flowName = flows.find(f => f.id === policy.approval_flow_id)?.name;

  // Proration basis label — e.g. "from Jan" when associate_month is set
  const associateLabel = policy.associate_month != null
    ? MONTH_SHORT[policy.associate_month - 1]
    : null;

  return (
    <TableRow className={!policy.is_active ? 'opacity-50' : undefined}>
      {/* Name */}
      <TableCell className="font-medium">{policy.name}</TableCell>

      {/* Type badges */}
      <TableCell>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant={policy.is_paid ? 'default' : 'secondary'}>
            {policy.is_paid ? 'Paid' : 'Unpaid'}
          </Badge>
          {policy.is_early          && <Badge className="bg-blue-500   text-white text-xs">Early</Badge>}
          {policy.is_work_from_home && <Badge className="bg-purple-500 text-white text-xs">WFH</Badge>}
        </div>
      </TableCell>

      {/* Entitlement — annual days + associate month basis */}
      <TableCell>
        <div className="flex flex-col gap-0.5">
          {/* Annual entitlement */}
          <span className="font-medium text-sm">
            {policy.default_entitlement} days / yr
          </span>
          {policy.intern_entitlement != null && (
            <span className="text-xs text-muted-foreground">
              Intern: {policy.intern_entitlement} days / yr
            </span>
          )}
          {/* Associate month badge — proration anchor */}
          {associateLabel && !policy.is_early && (
            <span className="inline-flex items-center gap-1 mt-0.5">
              <Calendar className="h-3 w-3 text-primary/60" />
              <span className="text-[11px] text-primary font-medium">
                from {associateLabel}
              </span>
            </span>
          )}
        </div>
      </TableCell>

      {/* Approval flow */}
      <TableCell>
        {flowName ? (
          <Badge variant="outline" className="gap-1 text-xs">
            <GitMerge className="h-3 w-3" />
            {flowName}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Active status */}
      <TableCell>
        <Badge
          variant="outline"
          className={
            policy.is_active
              ? 'border-green-500 text-green-600 text-xs'
              : 'border-muted-foreground text-muted-foreground text-xs'
          }
        >
          {policy.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>

      {/* Actions */}
      <TableCell>
        <div className="flex items-center gap-1">
          <Switch
            checked={policy.is_active}
            onCheckedChange={() => onToggle(policy.id)}
            disabled={isToggling}
            aria-label={policy.is_active ? 'Deactivate' : 'Activate'}
          />
          <Button
            variant="ghost" size="sm"
            onClick={() => onEdit(policy)}
            disabled={isUpdating}
            aria-label="Edit policy"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost" size="sm"
            onClick={() => onDelete(policy.id)}
            disabled={isDeleting}
            aria-label="Delete policy"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};
