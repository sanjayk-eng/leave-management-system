import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveService, ApplyLeaveRequest, AdminAddLeaveRequest, LeaveActionRequest, UpdateLeavePolicyRequest, LeaveSummary } from '@/services';
import { ApiError } from '@/lib/api';
import { UpdateLeaveRequest, LeaveResponse } from '@/services/leaveService';
import { toast } from 'sonner';
import { useApiErrorHandler } from './useApiErrorHandler';

const buildSummaryFromLeaves = (leaves: LeaveResponse[]): LeaveSummary => ({
  total: leaves.length,
  pending: leaves.filter((leave) => leave.status === 'PENDING').length,
  manager_approved: leaves.filter((leave) => leave.status === 'MANAGER_APPROVED').length,
  manager_rejected: leaves.filter((leave) => leave.status === 'MANAGER_REJECTED').length,
  admin_approved: leaves.filter((leave) => leave.status === 'ADMIN_APPROVED').length,
  admin_rejected: leaves.filter((leave) => leave.status === 'ADMIN_REJECTED').length,
  approved: leaves.filter((leave) => leave.status === 'APPROVED').length,
  rejected: leaves.filter((leave) => leave.status === 'REJECTED').length,
  cancelled: leaves.filter((leave) => leave.status === 'CANCELLED').length,
  withdrawn: leaves.filter((leave) => leave.status === 'WITHDRAWN').length,
  withdrawal_pending: leaves.filter((leave) => leave.status === 'WITHDRAWAL_PENDING').length,
});

export const useLeavePolicies = () => {
  const queryClient = useQueryClient();
  const handleError = useApiErrorHandler();

  const { data: policiesData, isLoading, error, refetch } = useQuery({
    queryKey: ['leavePolicies'],
    queryFn: () => leaveService.getAllPolicies(),
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 10 * 60 * 1000,
  });

  const policies = Array.isArray(policiesData) ? policiesData : [];

  const addPolicyMutation = useMutation({
    mutationFn: (data: { name: string; is_paid: boolean; is_early?: boolean; is_work_from_home?: boolean; default_entitlement: number; intern_entitlement?: number; approval_flow_id?: string }) =>
      leaveService.addPolicy(data),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['leavePolicies'] });
      const previousPolicies = queryClient.getQueryData(['leavePolicies']);
      return { previousPolicies };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leavePolicies'] });
      queryClient.invalidateQueries({ queryKey: ['activeLeavePolicies'] });
      toast.success('Leave policy added successfully');
    },
    onError: (error, variables, context) => {
      if (context?.previousPolicies) {
        queryClient.setQueryData(['leavePolicies'], context.previousPolicies);
      }
      handleError(error);
    },
  });

  const updatePolicyMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateLeavePolicyRequest }) =>
      leaveService.updatePolicy(id, data),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['leavePolicies'] });
      const previousPolicies = queryClient.getQueryData(['leavePolicies']);
      return { previousPolicies };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leavePolicies'] });
      queryClient.invalidateQueries({ queryKey: ['activeLeavePolicies'] });
      toast.success('Leave policy updated successfully');
    },
    onError: (error, variables, context) => {
      if (context?.previousPolicies) {
        queryClient.setQueryData(['leavePolicies'], context.previousPolicies);
      }
      handleError(error);
    },
  });

  const deletePolicyMutation = useMutation({
    mutationFn: (id: number) => leaveService.deletePolicy(id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['leavePolicies'] });
      const previousPolicies = queryClient.getQueryData(['leavePolicies']);
      return { previousPolicies };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leavePolicies'] });
      queryClient.invalidateQueries({ queryKey: ['activeLeavePolicies'] });
      toast.success('Leave policy deleted successfully');
    },
    onError: (error, variables, context) => {
      if (context?.previousPolicies) {
        queryClient.setQueryData(['leavePolicies'], context.previousPolicies);
      }
      handleError(error);
    },
  });

  const togglePolicyMutation = useMutation({
    mutationFn: (id: number) => leaveService.togglePolicy(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['leavePolicies'] });
      const previousPolicies = queryClient.getQueryData(['leavePolicies']);
      // Optimistic update
      queryClient.setQueryData(['leavePolicies'], (old: typeof policies) =>
        old?.map(p => p.id === id ? { ...p, is_active: !p.is_active } : p)
      );
      return { previousPolicies };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['leavePolicies'] });
      queryClient.invalidateQueries({ queryKey: ['activeLeavePolicies'] });
      toast.success(res.message);
    },
    onError: (error, _id, context) => {
      if (context?.previousPolicies) {
        queryClient.setQueryData(['leavePolicies'], context.previousPolicies);
      }
      handleError(error);
    },
  });

  return {
    policies,
    isLoading,
    error,
    refetch,
    addPolicy: addPolicyMutation.mutate,
    isAdding: addPolicyMutation.isPending,
    addError: addPolicyMutation.error,
    updatePolicy: updatePolicyMutation.mutate,
    isUpdating: updatePolicyMutation.isPending,
    updateError: updatePolicyMutation.error,
    deletePolicy: deletePolicyMutation.mutate,
    isDeleting: deletePolicyMutation.isPending,
    deleteError: deletePolicyMutation.error,
    togglePolicy: togglePolicyMutation.mutate,
    isToggling: togglePolicyMutation.isPending,
  };
};

// Lightweight hook for apply-leave form — only active policies.
export const useActiveLeavePolicies = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['activeLeavePolicies'],
    queryFn: () => leaveService.getActivePolicies(),
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 10 * 60 * 1000,
  });
  return {
    policies: Array.isArray(data) ? data : [],
    isLoading,
    error,
  };
};

export const useLeaves = (month?: number, year?: number) => {
  const queryClient = useQueryClient();
  const handleError = useApiErrorHandler();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['leaves', month, year],
    queryFn: () => leaveService.getAll(month, year),
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 2 * 60 * 1000,
  });

  const applyMutation = useMutation({
    mutationFn: (data: ApplyLeaveRequest) => leaveService.apply(data),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['leaves'] });
      await queryClient.cancelQueries({ queryKey: ['leaveBalances'] });
      const previousLeaves = queryClient.getQueryData(['leaves']);
      const previousBalances = queryClient.getQueryData(['leaveBalances']);
      return { previousLeaves, previousBalances };
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['leaveBalances'] });
      toast.success(response.message || 'Leave applied successfully');
    },
    onError: (error, variables, context) => {
      if (context?.previousLeaves) queryClient.setQueryData(['leaves'], context.previousLeaves);
      if (context?.previousBalances) queryClient.setQueryData(['leaveBalances'], context.previousBalances);
      handleError(error);
    },
  });

  const adminAddMutation = useMutation({
    mutationFn: (data: AdminAddLeaveRequest) => leaveService.adminAdd(data),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['leaves'] });
      await queryClient.cancelQueries({ queryKey: ['leaveBalances'] });
      const previousLeaves = queryClient.getQueryData(['leaves']);
      const previousBalances = queryClient.getQueryData(['leaveBalances']);
      return { previousLeaves, previousBalances };
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['leaveBalances'] });
      toast.success(response.message || 'Leave added successfully');
    },
    onError: (error, variables, context) => {
      if (context?.previousLeaves) queryClient.setQueryData(['leaves'], context.previousLeaves);
      if (context?.previousBalances) queryClient.setQueryData(['leaveBalances'], context.previousBalances);
      handleError(error);
    },
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: LeaveActionRequest }) =>
      leaveService.action(id, action),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['leaves'] });
      await queryClient.cancelQueries({ queryKey: ['leaveBalances'] });
      const previousLeaves = queryClient.getQueryData(['leaves']);
      return { previousLeaves };
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['leaveBalances'] });
      toast.success(response.message);
    },
    onError: (error, variables, context) => {
      if (context?.previousLeaves) queryClient.setQueryData(['leaves'], context.previousLeaves);
      handleError(error);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => leaveService.cancel(id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['leaves'] });
      const previousLeaves = queryClient.getQueryData(['leaves']);
      return { previousLeaves };
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['leaveBalances'] });
      toast.success(response.message || 'Leave cancelled successfully');
    },
    onError: (error, variables, context) => {
      if (context?.previousLeaves) queryClient.setQueryData(['leaves'], context.previousLeaves);
      handleError(error);
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      leaveService.action(id, { action: 'WITHDRAW', reason }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['leaves'] });
      await queryClient.cancelQueries({ queryKey: ['leaveBalances'] });
      const previousLeaves = queryClient.getQueryData(['leaves']);
      return { previousLeaves };
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['leaveBalances'] });
      toast.success(response.message || 'Leave withdrawn successfully and balance restored');
    },
    onError: (error, variables, context) => {
      if (context?.previousLeaves) queryClient.setQueryData(['leaves'], context.previousLeaves);
      handleError(error);
    },
  });

  return {
    leaves: data?.data || [],
    total: data?.total || 0,
    summary: data?.summary ?? null as LeaveSummary | null,
    isLoading,
    error,
    refetch,
    applyLeave: applyMutation.mutate,
    isApplying: applyMutation.isPending,
    applyError: applyMutation.error,
    adminAddLeave: adminAddMutation.mutate,
    isAdminAdding: adminAddMutation.isPending,
    adminAddError: adminAddMutation.error,
    processLeave: actionMutation.mutate,
    isProcessing: actionMutation.isPending,
    processError: actionMutation.error,
    cancelLeave: cancelMutation.mutate,
    isCancelling: cancelMutation.isPending,
    cancelError: cancelMutation.error,
    withdrawLeave: withdrawMutation.mutate,
    isWithdrawing: withdrawMutation.isPending,
    withdrawError: withdrawMutation.error,
  };
};

export const useLeaveCalendar = (month?: number, year?: number) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['leaveCalendar', month, year],
    queryFn: async () => {
      try {
        return await leaveService.getAll(month, year);
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          const response = await leaveService.getMyLeaves(month, year);
          return {
            total: response.total ?? response.data.length,
            data: response.data || [],
            summary: buildSummaryFromLeaves(response.data || []),
            message: response.message,
            month: response.month,
            year: response.year,
          };
        }
        throw err;
      }
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 2 * 60 * 1000,
  });

  return {
    leaves: data?.data || [],
    total: data?.total || 0,
    summary: data?.summary ?? null as LeaveSummary | null,
    isLoading,
    error,
    refetch,
  };
};

export const useMyLeaves = (month?: number, year?: number) => {
  const queryClient = useQueryClient();
  const handleError = useApiErrorHandler();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['myLeaves', month, year],
    queryFn: () => leaveService.getMyLeaves(month, year),
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 2 * 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeaveRequest }) =>
      leaveService.update(id, data),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['myLeaves', month, year] });
      await queryClient.cancelQueries({ queryKey: ['myLeaves'] });
      const previousLeaves = queryClient.getQueryData(['myLeaves', month, year]);
      const previousAllLeaves = queryClient.getQueryData(['myLeaves']);
      return { previousLeaves, previousAllLeaves };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myLeaves', month, year] });
      queryClient.invalidateQueries({ queryKey: ['myLeaves'] });
      queryClient.invalidateQueries({ queryKey: ['leaveBalances'] });
    },
    onError: (error, variables, context) => {
      if (context?.previousLeaves) {
        queryClient.setQueryData(['myLeaves', month, year], context.previousLeaves);
      }
      if (context?.previousAllLeaves) {
        queryClient.setQueryData(['myLeaves'], context.previousAllLeaves);
      }
      handleError(error);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => leaveService.cancel(id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['myLeaves', month, year] });
      await queryClient.cancelQueries({ queryKey: ['leaveBalances'] });
      const previousLeaves = queryClient.getQueryData(['myLeaves', month, year]);
      return { previousLeaves };
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['myLeaves', month, year] });
      queryClient.invalidateQueries({ queryKey: ['myLeaves'] });
      queryClient.invalidateQueries({ queryKey: ['leaveBalances'] });
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      toast.success(response.message || 'Leave cancelled successfully');
    },
    onError: (error, variables, context) => {
      if (context?.previousLeaves) {
        queryClient.setQueryData(['myLeaves', month, year], context.previousLeaves);
      }
      handleError(error);
    },
  });

  return {
    leaves: data?.data || [],
    total: data?.data?.length ?? 0,
    month: data?.month,
    year: data?.year,
    isLoading,
    error,
    refetch,
    updateLeave: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,
    cancelLeave: cancelMutation.mutate,
    isCancelling: cancelMutation.isPending,
    cancelError: cancelMutation.error,
  };
};