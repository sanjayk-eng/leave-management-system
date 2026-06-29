import { useQuery } from '@tanstack/react-query';
import { settingsService } from '@/services/settingsService';

export const useTodayBirthdays = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['todayBirthdays'],
    queryFn: () => settingsService.getTodayBirthdays(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return {
    birthdays: data?.data || [],
    total: data?.total || 0,
    date: data?.date,
    isLoading,
    error,
    refetch,
  };
};

export const useUpcomingBirthdays = (filterType?: string) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['upcomingBirthdays', filterType],
    queryFn: () => settingsService.getUpcomingBirthdays(filterType),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return {
    birthdays: data?.data || [],
    isLoading,
    error,
    refetch,
  };
};

export const useCalendarBirthdays = (month: number, year: number) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['calendarBirthdays', month, year],
    queryFn: () => settingsService.getCalendarBirthdays(month, year),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return {
    birthdays: data?.data || [],
    isLoading,
    error,
    refetch,
  };
};

export const useBirthdayPreview = (name?: string, birth_date?: string) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['birthdayPreview', name, birth_date],
    queryFn: () => settingsService.getBirthdayPreview(name, birth_date),
    enabled: true,
    staleTime: 0,
    retry: 1,
  });

  return {
    preview: data,
    isLoading,
    error,
    refetch,
  };
};
