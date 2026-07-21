import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

/** One permission row inside a resource group. */
export interface PermissionRow {
  permission_id: number;
  action: string;
  label: string;
  description: string;
  scope: 'own' | 'team' | 'all';
  require_seniority: boolean;
  is_enabled: boolean;
}

/** All permissions for one resource domain, e.g. "employee" or "leave". */
export interface ResourceGroup {
  resource: string;
  permissions: PermissionRow[];
}

/** Full GET response for a role. */
export interface RolePermissionResponse {
  role_id: number;
  role_name: string;
  resources: ResourceGroup[];
}

/** One toggle item sent in the PATCH body. */
export interface PermissionToggle {
  permission_id: number;
  is_enabled: boolean;
}

/** PATCH request body. */
export interface TogglePermissionsRequest {
  permissions: PermissionToggle[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const permissionService = {
  /**
   * GET /api/permissions/roles/:role_id
   * Returns full permission matrix for one role grouped by resource.
   */
  getByRole: async (roleId: number): Promise<RolePermissionResponse> => {
    return api.get<RolePermissionResponse>(`/permissions/roles/${roleId}`);
  },

  getMyPermissions: async (): Promise<RolePermissionResponse> => {
    return api.get<RolePermissionResponse>(`/permissions/me`);
  },

  /**
   * PATCH /api/permissions/roles/:role_id
   * Toggles is_enabled for one or more permissions.
   * Only is_enabled changes — scope and require_seniority are read-only.
   */
  togglePermissions: async (
    roleId: number,
    payload: TogglePermissionsRequest,
  ): Promise<{ message: string; role_id: number; updated: number }> => {
    return api.patch(`/permissions/roles/${roleId}`, payload);
  },
};
