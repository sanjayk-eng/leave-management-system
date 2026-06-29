import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeService, CreateEmployeeRequest, EmployeeFilters } from '@/services';
import { toast } from 'sonner';

export const useEmployeeProfile = (employeeId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: employee, isLoading, error, refetch } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => employeeService.getById(employeeId!),
    enabled: !!employeeId,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 3 * 60 * 1000,
  });

  const updateInfoMutation = useMutation({
    mutationFn: (data: { full_name?: string; email?: string; salary?: number; joining_date?: string; ending_date?: string | null; birth_date?: string | null }) =>
      employeeService.updateInfo(employeeId!, data),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['employee', employeeId] });
      await queryClient.cancelQueries({ queryKey: ['employees'] });
      const previousEmployee = queryClient.getQueryData(['employee', employeeId]);
      const previousEmployees = queryClient.getQueryData(['employees']);
      return { previousEmployee, previousEmployees };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Profile updated successfully');
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousEmployee) {
        queryClient.setQueryData(['employee', employeeId], context.previousEmployee);
      }
      if (context?.previousEmployees) {
        queryClient.setQueryData(['employees'], context.previousEmployees);
      }
      toast.error(error.message || 'Failed to update profile');
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: (newPassword: string) => employeeService.updatePassword(employeeId!, newPassword),
    onSuccess: () => {
      toast.success('Password updated successfully. Email notification sent.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update password');
    },
  });

  return {
    employee,
    isLoading,
    error,
    refetch,
    updateInfo: updateInfoMutation.mutate,
    isUpdating: updateInfoMutation.isPending,
    updateError: updateInfoMutation.error,
    updatePassword: updatePasswordMutation.mutate,
    isUpdatingPassword: updatePasswordMutation.isPending,
    passwordError: updatePasswordMutation.error,
  };
};

export const useEmployees = (filters?: EmployeeFilters) => {
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['employees', filters],
    queryFn: () => employeeService.getAll(filters),
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 3 * 60 * 1000,
  });

  const employees = data?.employees || [];
  const totalCount = data?.total_count || 0;
  const currentPage = data?.page || 1;
  const pageSize = data?.page_size || 10;
  const totalPages = data?.total_pages || 0;

  const createMutation = useMutation({
    mutationFn: (data: CreateEmployeeRequest) => employeeService.create(data),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['employees'] });
      const previousEmployees = queryClient.getQueryData(['employees']);
      return { previousEmployees };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee created successfully');
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousEmployees) {
        queryClient.setQueryData(['employees'], context.previousEmployees);
      }
      toast.error(error.message || 'Failed to create employee');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      employeeService.updateRole(id, { role }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['employees'] });
      const previousEmployees = queryClient.getQueryData(['employees']);
      return { previousEmployees };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Role updated successfully');
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousEmployees) {
        queryClient.setQueryData(['employees'], context.previousEmployees);
      }
      toast.error(error.message || 'Failed to update role');
    },
  });

  const updateManagerMutation = useMutation({
    mutationFn: ({ id, manager_id }: { id: string; manager_id: string }) =>
      employeeService.updateManager(id, { manager_id }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['employees'] });
      const previousEmployees = queryClient.getQueryData(['employees']);
      return { previousEmployees };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Manager updated successfully');
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousEmployees) {
        queryClient.setQueryData(['employees'], context.previousEmployees);
      }
      toast.error(error.message || 'Failed to update manager');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => employeeService.deactivate(id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['employees'] });
      const previousEmployees = queryClient.getQueryData(['employees']);
      return { previousEmployees };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee status updated successfully');
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousEmployees) {
        queryClient.setQueryData(['employees'], context.previousEmployees);
      }
      toast.error(error.message || 'Failed to update employee status');
    },
  });

  return {
    employees,
    totalCount,
    currentPage,
    pageSize,
    totalPages,
    isLoading,
    isFetching,
    error,
    refetch,
    createEmployee: createMutation.mutate,
    isCreating: createMutation.isPending,
    createError: createMutation.error,
    updateRole: updateRoleMutation.mutate,
    updateManager: updateManagerMutation.mutate,
    deactivateEmployee: deactivateMutation.mutate,
    isDeactivating: deactivateMutation.isPending,
  };
};