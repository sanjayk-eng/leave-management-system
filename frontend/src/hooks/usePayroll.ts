import { useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollService, RunPayrollRequest } from '@/services';
import { toast } from 'sonner';
import { useApiErrorHandler } from './useApiErrorHandler';

export const usePayroll = () => {
  const queryClient = useQueryClient();
  const handleError = useApiErrorHandler();

  const runMutation = useMutation({
    mutationFn: (data: RunPayrollRequest) => payrollService.run(data),
    onSuccess: () => {
      toast.success('Payroll preview generated successfully');
    },
    onError: handleError,
  });

  const finalizeMutation = useMutation({
    mutationFn: (payrollRunId: string) => payrollService.finalize(payrollRunId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['payslips'] });
      const previousPayslips = queryClient.getQueryData(['payslips']);
      return { previousPayslips };
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
      toast.success(response.message || 'Payroll finalized successfully');
    },
    onError: (error, variables, context) => {
      if (context?.previousPayslips) {
        queryClient.setQueryData(['payslips'], context.previousPayslips);
      }
      handleError(error);
    },
  });

  const downloadPayslip = async (payslipId: string) => {
    try {
      await payrollService.downloadPayslipPdf(payslipId);
      toast.success('Payslip downloaded successfully');
    } catch (error:unknown) {
      handleError(error);
    }
  };

  return {
    runPayroll: runMutation.mutate,
    isRunning: runMutation.isPending,
    payrollPreview: runMutation.data,
    finalizePayroll: finalizeMutation.mutate,
    isFinalizing: finalizeMutation.isPending,
    downloadPayslip,
  };
};
