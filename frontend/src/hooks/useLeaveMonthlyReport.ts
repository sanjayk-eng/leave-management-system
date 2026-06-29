import { useQuery } from '@tanstack/react-query';
import { leaveService } from '@/services';
import { LeaveReportParams } from '@/types';

export const useLeaveReport = (params: LeaveReportParams) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['leaveReport', params],
    queryFn: () => leaveService.getLeaveReport(params),
    retry: 2,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 30000),
    staleTime: 2 * 60 * 1000,
  });

  const report = data?.data ?? null;

  return {
    report,
    records: report?.records ?? [],
    total: report?.total ?? 0,
    isLoading,
    error,
    refetch,
  };
};

// backward-compat alias
export const useLeaveMonthlyReport = (month: number, year: number) =>
  useLeaveReport({ report_type: 'monthly', month, year });
