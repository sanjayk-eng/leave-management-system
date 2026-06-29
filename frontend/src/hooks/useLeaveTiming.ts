import { useState, useEffect } from 'react';
import { LeaveTiming, UpdateLeaveTimingRequest } from '../types';
import { leaveTimingService } from '../services/leaveTimingService';
import { toast } from 'sonner';

export const useLeaveTiming = (autoFetch: boolean = true) => {
  const [leaveTimings, setLeaveTimings] = useState<LeaveTiming[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaveTimings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await leaveTimingService.getLeaveTiming();
      setLeaveTimings(data);
    } catch (err) {
      let errorMessage = 'Failed to fetch leave timings';
      if (err instanceof Error) errorMessage = err.message;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateLeaveTiming = async (request: UpdateLeaveTimingRequest) => {
    try {
      setLoading(true);
      setError(null);
      await leaveTimingService.updateLeaveTiming(request);
      await fetchLeaveTimings();
      toast.success('Leave timing updated successfully!', {
        description: `Timing has been updated to "${request.timing}"`,
        duration: 4000,
      });
      return true;
    } catch (err: unknown) {
      let errorMessage = 'Failed to update leave timing';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      setError(errorMessage);
      toast.error('Failed to update leave timing', {
        description: errorMessage,
        duration: 5000,
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch) {
      fetchLeaveTimings();
    }
  }, [autoFetch]);

  return {
    leaveTimings,
    loading,
    error,
    fetchLeaveTimings,
    updateLeaveTiming,
  };
};