import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw, X } from 'lucide-react';
import { ActivityFeedFilter } from '@/types';

interface LogsFilterProps {
  filter: ActivityFeedFilter;
  onComponentChange: (v: string) => void;
  onActionChange:    (v: string) => void;
  onClear:           () => void;
  onRefresh:         () => void;
  loading:           boolean;
}

// All component values defined on the backend BuildDescription
const COMPONENTS = [
  { value: 'designation',   label: 'Designation'    },
  { value: 'employee',      label: 'Employee'       },
  { value: 'leave',         label: 'Leave'          },
  { value: 'leave_balance', label: 'Leave Balance'  },
  { value: 'leave_policy',  label: 'Leave Policy'   },
  { value: 'holiday',       label: 'Holiday'        },
  { value: 'settings',      label: 'Settings'       },
  { value: 'payroll',       label: 'Payroll'        },
  { value: 'asset',         label: 'Asset'          },
  { value: 'permission',    label: 'Permission'     },
];

// All dot-namespaced actions defined on the backend
const ACTIONS = [
  // designation
  { value: 'designation.created', label: 'Designation — Created'   },
  { value: 'designation.updated', label: 'Designation — Updated'   },
  { value: 'designation.deleted', label: 'Designation — Deleted'   },
  // employee
  { value: 'employee.created',            label: 'Employee — Created'            },
  { value: 'employee.updated',            label: 'Employee — Updated'            },
  { value: 'employee.role_updated',       label: 'Employee — Role Updated'       },
  { value: 'employee.manager_updated',    label: 'Employee — Manager Updated'    },
  { value: 'employee.designation_updated',label: 'Employee — Designation Updated'},
  { value: 'employee.password_changed',   label: 'Employee — Password Changed'   },
  { value: 'employee.activated',          label: 'Employee — Activated'          },
  { value: 'employee.deactivated',        label: 'Employee — Deactivated'        },
  // leave
  { value: 'leave.applied',   label: 'Leave — Applied'   },
  { value: 'leave.approved',  label: 'Leave — Approved'  },
  { value: 'leave.rejected',  label: 'Leave — Rejected'  },
  { value: 'leave.cancelled', label: 'Leave — Cancelled' },
  { value: 'leave.withdrawn', label: 'Leave — Withdrawn' },
  { value: 'leave.updated',   label: 'Leave — Updated'   },
  // balance
  { value: 'leave_balance.adjusted', label: 'Leave Balance — Adjusted' },
  // policy
  { value: 'leave_policy.created', label: 'Leave Policy — Created' },
  { value: 'leave_policy.updated', label: 'Leave Policy — Updated' },
  { value: 'leave_policy.deleted', label: 'Leave Policy — Deleted' },
  // holiday
  { value: 'holiday.created', label: 'Holiday — Created' },
  { value: 'holiday.deleted', label: 'Holiday — Deleted' },
  // settings
  { value: 'settings.updated', label: 'Settings — Updated' },
  // payroll
  { value: 'payroll.run',       label: 'Payroll — Run'       },
  { value: 'payroll.finalized', label: 'Payroll — Finalized' },
  // asset
  { value: 'asset.created',    label: 'Asset — Created'    },
  { value: 'asset.updated',    label: 'Asset — Updated'    },
  { value: 'asset.deleted',    label: 'Asset — Deleted'    },
  { value: 'asset.assigned',   label: 'Asset — Assigned'   },
  { value: 'asset.unassigned', label: 'Asset — Unassigned' },
  // permission
  { value: 'permission.updated', label: 'Permission — Updated' },
];

const ALL = 'all';

export const LogsFilter = ({
  filter,
  onComponentChange,
  onActionChange,
  onClear,
  onRefresh,
  loading,
}: LogsFilterProps) => {
  const [search, setSearch] = useState('');

  const activeFilters =
    (filter.component ? 1 : 0) + (filter.action ? 1 : 0);

  const filteredActions = search
    ? ACTIONS.filter(a => a.label.toLowerCase().includes(search.toLowerCase()))
    : ACTIONS;

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Component filter */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Component</Label>
        <Select
          value={filter.component ?? ALL}
          onValueChange={v => onComponentChange(v === ALL ? '' : v)}
          disabled={loading}
        >
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder="All components" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All components</SelectItem>
            {COMPONENTS.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Action filter */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Action</Label>
        <Select
          value={filter.action ?? ALL}
          onValueChange={v => onActionChange(v === ALL ? '' : v)}
          disabled={loading}
        >
          <SelectTrigger className="h-8 w-52 text-sm">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            {/* Searchable input inside the dropdown */}
            <div className="px-2 py-1.5">
              <Input
                placeholder="Search actions…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-7 text-xs"
              />
            </div>
            <SelectItem value={ALL}>All actions</SelectItem>
            {filteredActions.map(a => (
              <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clear filters */}
      {activeFilters > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={loading}
          className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
          Clear ({activeFilters})
        </Button>
      )}

      {/* Refresh */}
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={loading}
        className="h-8 gap-1.5 ml-auto"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  );
};
