import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveBalanceService, AdjustLeaveBalanceRequest } from '@/services';
import { toast } from 'sonner';
import { useApiErrorHandler } from './useApiErrorHandler';

export const useLeaveBalances = (employeeId: string) => {
  const queryClient = useQueryClient();
  const handleError = useApiErrorHandler();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['leaveBalances', employeeId],
    queryFn: () => leaveBalanceService.getByEmployee(employeeId),
    enabled: !!employeeId,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const adjustMutation = useMutation({
    mutationFn: (adjustData: AdjustLeaveBalanceRequest) =>
      leaveBalanceService.adjust(employeeId, adjustData),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['leaveBalances', employeeId] });
      const previousBalances = queryClient.getQueryData(['leaveBalances', employeeId]);
      return { previousBalances };
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['leaveBalances', employeeId] });
      toast.success(response.message || 'Leave balance adjusted successfully');
    },
    onError: (error, adjustData, context) => {
      if (context?.previousBalances) {
        queryClient.setQueryData(['leaveBalances', employeeId], context.previousBalances);
      }
      handleError(error);
    },
  });

  // Ensure balances is always an array
  const cleanBalances = data?.balances ? data.balances.filter(balance =>
    balance &&
    typeof balance.leave_type === 'string' &&
    typeof balance.used === 'number' &&
    typeof balance.total === 'number' &&
    typeof balance.available === 'number'
  ) : [];

  return {
    balances: cleanBalances,
    employeeId: data?.employee_id,
    isLoading,
    error,
    refetch,
    adjustBalance: adjustMutation.mutate,
    isAdjusting: adjustMutation.isPending,
    adjustError: adjustMutation.error,
  };
};
