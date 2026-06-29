import { useState, useCallback } from 'react';
import { useLeaves } from './useLeaves';

export const useFilteredLeaves = () => {
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1); // 1-12
  const [year, setYear] = useState(currentDate.getFullYear());
  
  const { leaves, summary, isLoading, error, refetch, processLeave, isProcessing, withdrawLeave, isWithdrawing } = useLeaves(month, year);

  // Get pending leaves for approval — all non-terminal, non-approved leaves
  // (Approvals.tsx then narrows further by checking approval_log WAITING entries)
  const pendingLeaves = leaves.filter(l => {
    const status = l.status.toUpperCase();
    const excludedStatuses = ['APPROVED', 'REJECTED', 'CANCELLED', 'WITHDRAWN'];
    return !excludedStatuses.includes(status) && status !== 'WITHDRAWAL_PENDING';
  });

  // Get withdrawal requests
  const withdrawalRequests = leaves.filter(l => {
    const status = l.status.toUpperCase();
    return status === 'WITHDRAWAL_PENDING';
  });

  const applyFilters = useCallback((newMonth: number, newYear: number) => {
    setMonth(newMonth);
    setYear(newYear);
  }, []);

  const refreshLeaves = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    // Filtered data
    leaves,
    pendingLeaves,
    withdrawalRequests,
    totalCount: leaves.length,
    summary,
    
    // Filter state
    month,
    year,
    
    // Filter actions
    applyFilters,
    refreshLeaves,
    
    // Original hook data and actions
    isLoading,
    error,
    processLeave,
    isProcessing,
    withdrawLeave,
    isWithdrawing,
  };
};