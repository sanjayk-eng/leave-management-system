import { useQuery } from '@tanstack/react-query';
import { leaveService } from '@/services';
import type { LeavePolicyReportParams } from '@/types';

export const useLeavePolicyReport = (params: LeavePolicyReportParams) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['leavePolicyReport', params],
    queryFn: () => leaveService.getLeavePolicyReport(params),
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
