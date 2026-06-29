import { useQuery } from '@tanstack/react-query';
import { holidayService } from '@/services/holidayService';

export const useHolidays = () => {
  const { data: holidays = [], isLoading, error } = useQuery({
    queryKey: ['holidays', 'calendar'], // Different key to avoid conflict with settings holidays
    queryFn: async () => {
      try {
        const data = await holidayService.getAll();
        const result = Array.isArray(data) ? data : [];
        return result;
      } catch (error) {
        console.error('Failed to fetch holidays:', error);
        return [];
      }
    },
    retry: false, // Don't retry on failure
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return {
    holidays,
    isLoading,
    error,
  };
};
