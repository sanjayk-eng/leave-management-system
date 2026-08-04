/**
 * Employee grid cell renderers — used by the Employees page (shadcn Table).
 * These receive the row data object directly, not AG Grid params.
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical, UserCog, Users, UserX, UserCheck,
  Calendar, Edit, Key, Briefcase,
} from 'lucide-react';

// ─── Role Badge ───────────────────────────────────────────────────────────────
export const RoleBadgeRenderer = ({ value }: { value: string }) => {
  const colors: Record<string, string> = {
    SUPERADMIN: 'bg-primary text-primary-foreground',
    ADMIN:      'bg-secondary text-secondary-foreground',
    MANAGER:    'bg-warning text-warning-foreground',
    EMPLOYEE:   'bg-muted text-muted-foreground',
    HR:         'bg-info text-info-foreground',
    INTERN:     'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  };
  return (
    <Badge className={colors[value] || colors.EMPLOYEE}>
      {value?.replace('_', ' ')}
    </Badge>
  );
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
export const StatusBadgeRenderer = ({ value }: { value: string }) => (
  <Badge
    className={
      value === 'active'
        ? 'bg-success text-success-foreground'
        : 'bg-muted text-muted-foreground'
    }
  >
    {value}
  </Badge>
);

// ─── Currency ─────────────────────────────────────────────────────────────────
export const CurrencyRenderer = ({ value }: { value: number }) => (
  <span>₹{(value || 0).toLocaleString()}</span>
);

// ─── Date ─────────────────────────────────────────────────────────────────────
export const DateRenderer = ({ value }: { value?: string }) => {
  if (!value) return <span className="text-muted-foreground italic">-</span>;
  const date = new Date(value);
  return (
    <span>
      {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
    </span>
  );
};

// ─── Not Assigned ─────────────────────────────────────────────────────────────
export const NotAssignedRenderer = ({ value }: { value?: string }) => {
  if (!value) {
    return <span className="text-sm text-muted-foreground italic">Not Assigned</span>;
  }
  return <span className="text-sm">{value}</span>;
};

// ─── Actions Dropdown ─────────────────────────────────────────────────────────
interface ActionsRendererProps {
  data: Record<string, unknown>;
  onEditInfo?: (data: unknown) => void;
  onUpdateRole?: (data: unknown) => void;
  onUpdateManager?: (data: unknown) => void;
  onUpdateDesignation?: (data: unknown) => void;
  onChangePassword?: (data: unknown) => void;
  onAdjustLeave?: (data: unknown) => void;
  onDeactivate?: (data: unknown) => void;
  isSuperAdmin?: boolean;
  isAdmin?: boolean;
}

export const ActionsRenderer = ({
  data,
  onEditInfo,
  onUpdateRole,
  onUpdateManager,
  onUpdateDesignation,
  onChangePassword,
  onAdjustLeave,
  onDeactivate,
  isSuperAdmin,
  isAdmin,
}: ActionsRendererProps) => {
  const isSuperAdminUser = data.role === 'SUPERADMIN';
  const canEdit = isSuperAdmin || !isSuperAdminUser;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!canEdit ? (
          <DropdownMenuItem disabled>
            <span className="text-muted-foreground text-xs">
              Only SUPERADMIN can edit this user
            </span>
          </DropdownMenuItem>
        ) : (
          <>
            {isAdmin && onChangePassword && (
              <DropdownMenuItem onClick={() => onChangePassword(data)}>
                <Key className="mr-2 h-4 w-4" /> Change Password
              </DropdownMenuItem>
            )}
            {onEditInfo && (
              <DropdownMenuItem onClick={() => onEditInfo(data)}>
                <Edit className="mr-2 h-4 w-4" /> Edit Info
              </DropdownMenuItem>
            )}
            {onUpdateRole && (
              <DropdownMenuItem onClick={() => onUpdateRole(data)}>
                <UserCog className="mr-2 h-4 w-4" /> Update Role
              </DropdownMenuItem>
            )}
            {onUpdateManager && (
              <DropdownMenuItem onClick={() => onUpdateManager(data)}>
                <Users className="mr-2 h-4 w-4" /> Assign Manager
              </DropdownMenuItem>
            )}
            {onUpdateDesignation && (
              <DropdownMenuItem onClick={() => onUpdateDesignation(data)}>
                <Briefcase className="mr-2 h-4 w-4" /> Assign Designation
              </DropdownMenuItem>
            )}
            {isSuperAdmin && onAdjustLeave && (
              <DropdownMenuItem onClick={() => onAdjustLeave(data)}>
                <Calendar className="mr-2 h-4 w-4" /> Adjust Leave Balance
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {onDeactivate && (
              <DropdownMenuItem
                onClick={() => onDeactivate(data)}
                className={
                  data.status === 'active' ? 'text-destructive' : 'text-success'
                }
              >
                {data.status === 'active' ? (
                  <>
                    <UserX className="mr-2 h-4 w-4" /> Deactivate
                  </>
                ) : (
                  <>
                    <UserCheck className="mr-2 h-4 w-4" /> Activate
                  </>
                )}
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
