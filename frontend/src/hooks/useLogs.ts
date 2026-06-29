import { useState, useEffect, useCallback } from 'react';
import { logsService } from '@/services/logsService';
import { SystemLog } from '@/types';
import { handleApiError, ApiError } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

export const useLogs = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [daysFilter, setDaysFilter] = useState(7);
  const [dateFrom, setDateFrom] = useState<string>('');
  const navigate = useNavigate();

  const fetchLogs = useCallback(async (days: number = 7) => {
    setLoading(true);
    setError(null);

    try {
      const response = await logsService.getLogs(days);
      setLogs(response.data.logs || []);
      setTotalCount(response.data.total_count || 0);
      setDateFrom(response.data.date_from || '');
      // Note: daysFilter is NOT set from the response — it's driven by the
      // caller's `days` argument, so changing it doesn't re-trigger this
      // effect via a feedback loop. If the backend normalizes/clamps the
      // value, that's reflected in the data shown, not in the filter state.
    } catch (err: unknown) {
      console.error('Failed to fetch logs:', err);

      let errorMessage = 'Failed to fetch system logs';

      if (err instanceof ApiError) {
        if (err.status === 403) {
          errorMessage = 'Access denied. You do not have permission to view system logs.';
        } else if (err.status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (err.status === 500) {
          errorMessage = 'Server error occurred while fetching logs. Please try again later.';
        } else if (err.status === 0) {
          errorMessage = 'Unable to connect to server. Please check your internet connection.';
        } else if (err.message) {
          errorMessage = err.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
     handleApiError(err, navigate);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const refreshLogs = useCallback(() => {
    fetchLogs(daysFilter);
  }, [fetchLogs, daysFilter]);

  // Refetch whenever the user changes daysFilter (or on first mount)
  useEffect(() => {
    fetchLogs(daysFilter);
  }, [fetchLogs, daysFilter]);

  return {
    logs,
    loading,
    error,
    totalCount,
    daysFilter,
    setDaysFilter,
    dateFrom,
    fetchLogs,
    refreshLogs,
  };
};