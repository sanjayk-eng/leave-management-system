import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { approvalFlowService } from '@/services/approvalFlowService';
import { LeaveApprovalFlowRequest, LeaveApprovalFlowResponse } from '@/types';
import { toast } from 'sonner';
import { useApiErrorHandler } from './useApiErrorHandler';

const QUERY_KEYS = {
  flow:  ['approvalFlow'] as const,
  roles: ['systemRoles']  as const,
};

// ─── Roles hook ───────────────────────────────────────────────────────────────
export const useSystemRoles = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.roles,
    queryFn:  approvalFlowService.getRoles,
    staleTime: 30 * 60 * 1000,
    retry: 2,
  });
  return { roles: data ?? [], isLoading, error };
};

// ─── Main hook ────────────────────────────────────────────────────────────────
export const useApprovalFlow = () => {
  const queryClient = useQueryClient();
  const handleError = useApiErrorHandler();

  const { data: flows = [], isLoading, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.flow,
    queryFn:  approvalFlowService.getFlow,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // ── CREATE ────────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: LeaveApprovalFlowRequest) =>
      approvalFlowService.createFlow(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flow });
      toast.success('Approval flow created');
    },
    onError: handleError,
  });

  // ── UPDATE (only for non-system flows) ────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<LeaveApprovalFlowRequest> }) =>
      approvalFlowService.updateFlow(id, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.flow });
      const previous = queryClient.getQueryData<LeaveApprovalFlowResponse[]>(QUERY_KEYS.flow);
      queryClient.setQueryData<LeaveApprovalFlowResponse[]>(QUERY_KEYS.flow, (old = []) =>
        old.map(f => f.id === id ? { ...f, ...payload } : f)
      );
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flow });
      toast.success('Approval flow updated');
    },
    onError: (error, _vars, context) => {
      if (context?.previous)
        queryClient.setQueryData(QUERY_KEYS.flow, context.previous);
      handleError(error);
    },
  });

  // ── DELETE (only for non-system flows) ────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => approvalFlowService.deleteFlow(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.flow });
      const previous = queryClient.getQueryData<LeaveApprovalFlowResponse[]>(QUERY_KEYS.flow);
      queryClient.setQueryData<LeaveApprovalFlowResponse[]>(QUERY_KEYS.flow, (old = []) =>
        old.filter(f => f.id !== id)
      );
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flow });
      toast.success('Approval flow deleted');
    },
    onError: (error, _vars, context) => {
      if (context?.previous)
        queryClient.setQueryData(QUERY_KEYS.flow, context.previous);
      handleError(error);
    },
  });

  return {
    flows,
    isLoading,
    error,
    refetch,
    createFlow:      createMutation.mutate,
    isCreating:      createMutation.isPending,
    updateFlow:      updateMutation.mutate,
    updateFlowAsync: updateMutation.mutateAsync,
    isUpdating:      updateMutation.isPending,
    deleteFlow:      deleteMutation.mutate,
    isDeleting:      deleteMutation.isPending,
  };
};
