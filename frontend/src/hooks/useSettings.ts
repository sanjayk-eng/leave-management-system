import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService, UpdateSettingsRequest, AddHolidayRequest } from '@/services';
import { toast } from 'sonner';
import { useApiErrorHandler } from './useApiErrorHandler';

export const useSettings = () => {
  const queryClient = useQueryClient();
  const handleError = useApiErrorHandler();

  const { data, isLoading, error } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsService.get(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateSettingsRequest) => settingsService.update(data),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['settings'] });
      const previousSettings = queryClient.getQueryData(['settings']);
      return { previousSettings };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings updated successfully');
    },
    onError: (error, variables, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(['settings'], context.previousSettings);
      }
      handleError(error);
    },
  });

  return {
    settings: data?.settings,
    isLoading,
    error,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
};

export const useHolidays = () => {
  const queryClient = useQueryClient();
  const handleError = useApiErrorHandler();

  const { data: holidays = [], isLoading, error } = useQuery({
  queryKey: ['holidays'],
  queryFn: async () => {
    try {
      const res = await settingsService.getHolidays();

      console.log("API RESPONSE:", res);

      return Array.isArray(res?.data) ? res.data : [];
    } catch (error) {
      console.error('Error fetching holidays:', error);
      return [];
    }
  },
  staleTime: 10 * 60 * 1000,
});

  const addMutation = useMutation({
    mutationFn: (data: AddHolidayRequest) => settingsService.addHoliday(data),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['holidays'] });
      const previousHolidays = queryClient.getQueryData(['holidays']);
      return { previousHolidays };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      toast.success('Holiday added successfully');
    },
    onError: (error, variables, context) => {
      if (context?.previousHolidays) {
        queryClient.setQueryData(['holidays'], context.previousHolidays);
      }
      handleError(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => settingsService.deleteHoliday(id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['holidays'] });
      const previousHolidays = queryClient.getQueryData(['holidays']);
      return { previousHolidays };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      toast.success('Holiday deleted successfully');
    },
    onError: (error, variables, context) => {
      if (context?.previousHolidays) {
        queryClient.setQueryData(['holidays'], context.previousHolidays);
      }
      handleError(error);
    },
  });

  return {
    holidays,
    isLoading,
    error,
    addHoliday: addMutation.mutate,
    isAdding: addMutation.isPending,
    deleteHoliday: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
};
