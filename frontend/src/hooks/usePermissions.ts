import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  permissionService,
  PermissionToggle,
} from '@/services/permissionService';
import { useApiErrorHandler } from './useApiErrorHandler';

// ─── Query key factory ────────────────────────────────────────────────────────
const permissionKeys = {
  role: (roleId: number) => ['permissions', 'role', roleId] as const,
  me: ['permissions', 'me'] as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// useMyPermissions
//
// Fetches and caches the current user's permissions for page rendering.
// ─────────────────────────────────────────────────────────────────────────────
export const useMyPermissions = () => {
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: permissionKeys.me,
    queryFn: () => permissionService.getMyPermissions(),
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  return {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// useRolePermissions
//
// Fetches + caches the full permission matrix for one role.
// Enabled only when roleId is a positive number — prevents firing on initial
// render before the user selects a role tab.
// ─────────────────────────────────────────────────────────────────────────────
export const useRolePermissions = (roleId: number) => {
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: permissionKeys.role(roleId),
    queryFn: () => permissionService.getByRole(roleId),
    enabled: roleId > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes — permissions change infrequently
    retry: 1,
  });

  return {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// useTogglePermissions
//
// Optimistic mutation — flips the local cache immediately so toggles feel
// instant, then confirms or rolls back on server response.
// ─────────────────────────────────────────────────────────────────────────────
export const useTogglePermissions = (roleId: number) => {
  const queryClient = useQueryClient();
  const handleError = useApiErrorHandler();
  const qk = permissionKeys.role(roleId);

  return useMutation({
    mutationFn: (toggles: PermissionToggle[]) =>
      permissionService.togglePermissions(roleId, { permissions: toggles }),

    // ── Optimistic update ─────────────────────────────────────────────────
    onMutate: async (toggles) => {
      await queryClient.cancelQueries({ queryKey: qk });
      const previous = queryClient.getQueryData(qk);

      // Build a quick lookup: permission_id → new is_enabled
      const lookup = new Map(toggles.map((t) => [t.permission_id, t.is_enabled]));

      queryClient.setQueryData<typeof previous>(qk, (old) => {
        if (!old) return old;
        return {
          ...old,
          resources: old.resources.map((rg) => ({
            ...rg,
            permissions: rg.permissions.map((p) => ({
              ...p,
              is_enabled: lookup.has(p.permission_id)
                ? (lookup.get(p.permission_id) as boolean)
                : p.is_enabled,
            })),
          })),
        };
      });

      return { previous };
    },

    onSuccess: (res) => {
      // Confirm cache is authoritative — no need to refetch for just a toggle
      toast.success(`${res.updated} permission${res.updated !== 1 ? 's' : ''} updated`);
    },

    onError: (error, _vars, context) => {
      // Roll back on error
      if (context?.previous) {
        queryClient.setQueryData(qk, context.previous);
      }
      handleError(error);
    },
  });
};
