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

  // Add getById query for detailed balance information
  const { data: detailedData, isLoading: isLoadingDetailed, error: detailedError, refetch: refetchDetailed } = useQuery({
    queryKey: ['leaveBalancesDetailed', employeeId],
    queryFn: () => leaveBalanceService.getById(employeeId),
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
      await queryClient.cancelQueries({ queryKey: ['leaveBalancesDetailed', employeeId] });
      const previousBalances = queryClient.getQueryData(['leaveBalances', employeeId]);
      const previousDetailed = queryClient.getQueryData(['leaveBalancesDetailed', employeeId]);
      return { previousBalances, previousDetailed };
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['leaveBalances', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['leaveBalancesDetailed', employeeId] });
      toast.success(response.message || 'Leave balance adjusted successfully');
    },
    onError: (error, adjustData, context) => {
      if (context?.previousBalances) {
        queryClient.setQueryData(['leaveBalances', employeeId], context.previousBalances);
      }
      if (context?.previousDetailed) {
        queryClient.setQueryData(['leaveBalancesDetailed', employeeId], context.previousDetailed);
      }
      handleError(error);
    },
  });

  // Ensure balances is always an array and clean the data
  const cleanBalances = data?.balances ? data.balances.filter(balance => 
    balance && 
    typeof balance.leave_type === 'string' && 
    typeof balance.used === 'number' && 
    typeof balance.total === 'number' &&
    typeof balance.available === 'number'
  ) : [];

  const cleanDetailedBalances = detailedData?.balances ? detailedData.balances.filter(balance => 
    balance && 
    typeof balance.leave_type === 'string' && 
    typeof balance.used === 'number' && 
    typeof balance.total === 'number' &&
    typeof balance.available === 'number'
  ) : [];

  return {
    balances: cleanBalances,
    detailedBalances: cleanDetailedBalances,
    employeeId: data?.employee_id,
    isLoading,
    isLoadingDetailed,
    error,
    detailedError,
    refetch,
    refetchDetailed,
    adjustBalance: adjustMutation.mutate,
    isAdjusting: adjustMutation.isPending,
    adjustError: adjustMutation.error,
  };
};
