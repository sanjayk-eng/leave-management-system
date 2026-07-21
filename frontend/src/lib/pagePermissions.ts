import type { ComponentType, SVGProps } from 'react';
import {
  Activity,
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  ClipboardList,
  DollarSign,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  History,
  Users,
  Sun,
  Cake,
  Clock,
  GitMerge,
} from 'lucide-react';
import type { ResourceGroup } from '@/services/permissionService';

export type PermissionRequirement = {
  resource: string;
  action: string;
};

export type MenuItemDefinition = {
  title: string;
  label?: string;
  description?: string;
  url: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  permissionAll?: PermissionRequirement[];
  permissionAny?: PermissionRequirement[];
  visible?: (options: {
    currentUserRole?: string;
    resources?: ResourceGroup[];
  }) => boolean;
};

export const PAGE_MENU_ITEMS: MenuItemDefinition[] = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Employees',
    url: '/employees',
    icon: Users,
    permissionAll: [{ resource: 'employee', action: 'read' }],
  },
  {
    title: 'Designations',
    url: '/designations',
    icon: Briefcase,
    permissionAll: [{ resource: 'employee', action: 'designation_management' }],
  },
  {
    title: 'Assets',
    url: '/equipment',
    icon: Package,
    permissionAny: [
      { resource: 'asset', action: 'read' },
      { resource: 'asset', action: 'add' },
    ],
  },
  {
    title: 'Apply Leave',
    url: '/apply-leave',
    icon: Calendar,
    permissionAll: [{ resource: 'leave', action: 'apply' }],
  },
  {
    title: 'My Leave History',
    url: '/my-leave-history',
    icon: History,
    
  },
  {
    title: 'Leave Approvals',
    url: '/approvals',
    icon: ClipboardList,
    permissionAny: [
      { resource: 'leave', action: 'approve' },
      { resource: 'leave', action: 'reject' },
      { resource: 'leave', action: 'read' },
    ],
  },
  {
    title: 'Leave Calendar',
    url: '/calendar',
    icon: Calendar,
  },
  {
    title: 'Payroll',
    url: '/payroll',
    icon: DollarSign,
    permissionAny: [{ resource: 'payroll', action: 'payroll_managment' }],
  },
  {
    title: 'Payslips',
    url: '/payslips',
    icon: FileText,
    permissionAll: [{ resource: 'payslip', action: 'read' }],
  },
  {
    title: 'Activity Log',
    url: '/logs',
    icon: Activity,
    permissionAll: [{ resource: 'log', action: 'read' }],
  },
  {
    title: 'Leave Report',
    url: '/leave-monthly-report',
    icon: BarChart3,
    permissionAll: [{ resource: 'leave_report', action: 'read' }],
  },
  {
    title: 'Settings',
    url: '/settings',
    icon: Settings,
    permissionAny: [
      { resource: 'settings', action: 'manage_company_info' },
      { resource: 'settings', action: 'manage_holidays' },
      { resource: 'settings', action: 'manage_leave_policy' },
      { resource: 'settings', action: 'manage_leave_flow' },
      { resource: 'settings', action: 'manage_leave_timing' },
      { resource: 'permission', action: 'read' },
    ],
  },
];

export const SETTINGS_NAV_ITEMS: MenuItemDefinition[] = [
  {
    title: 'Company',
    url: '/settings/company',
    icon: Building2,
    permissionAll: [{ resource: 'settings', action: 'manage_company_info' }],
  },
  {
    title: 'Leave Policies',
    url: '/settings/leave-policies',
    icon: FileText,
    permissionAll: [{ resource: 'settings', action: 'manage_leave_policy' }],
  },
  {
    title: 'Leave Timing',
    url: '/settings/leave-timing',
    icon: Clock,
    permissionAll: [{ resource: 'settings', action: 'manage_leave_timing' }],
  },
  {
    title: 'Approval Flow',
    url: '/settings/approval-flow',
    icon: GitMerge,
    permissionAll: [{ resource: 'settings', action: 'manage_leave_flow' }],
  },
  {
    title: 'Birthday',
    url: '/settings/birthday',
    icon: Cake,
    permissionAll: [{ resource: 'settings', action: 'manage_company_info' }],
  },
  {
    title: 'Permissions',
    url: '/settings/permissions',
    icon: Settings,
    permissionAll: [{ resource: 'permission', action: 'read' }],
  },
  {
    title: 'Holidays',
    url: '/settings/holidays',
    icon: Sun,
    permissionAll: [{ resource: 'settings', action: 'manage_holidays' }],
  },
];

export function isPermissionEnabled(
  resources: ResourceGroup[] | undefined,
  requirement: PermissionRequirement,
): boolean {
  if (!resources) {
    return false;
  }

  return resources.some((group) =>
    group.resource === requirement.resource &&
    group.permissions.some(
      (permission) =>
        permission.action === requirement.action && permission.is_enabled,
    ),
  );
}

export function hasAllPermissions(
  resources: ResourceGroup[] | undefined,
  requirements: PermissionRequirement[],
): boolean {
  return requirements.every((requirement) =>
    isPermissionEnabled(resources, requirement),
  );
}

export function hasAnyPermission(
  resources: ResourceGroup[] | undefined,
  requirements: PermissionRequirement[],
): boolean {
  return requirements.some((requirement) =>
    isPermissionEnabled(resources, requirement),
  );
}

export function canAccessMenuItem(
  item: MenuItemDefinition,
  options: { currentUserRole?: string; resources?: ResourceGroup[] },
) {
  if (item.visible) {
    return item.visible(options);
  }

  if (item.permissionAll && item.permissionAll.length > 0) {
    return hasAllPermissions(options.resources, item.permissionAll);
  }

  if (item.permissionAny && item.permissionAny.length > 0) {
    return hasAnyPermission(options.resources, item.permissionAny);
  }

  return Boolean(options.currentUserRole);
}
