import { useQuery } from '@tanstack/react-query';
import { payrollService } from '@/services/payrollService';

export const usePayslips = () => {
  return useQuery({
    queryKey: ['payslips'],
    queryFn: async () => {
      const response = await payrollService.getPayslips();
      return response;
    },
  });
};
