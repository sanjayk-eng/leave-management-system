import { api } from '@/lib/api';

export interface Holiday {
  id: string;
  name: string;
  date: string;
  day: string;
  type: string;
  created_at: string;
  updated_at: string;
}

interface HolidaysWrapped {
  holidays?: Holiday[];
  data?: Holiday[];
  results?: Holiday[];
}

type HolidaysResponse = Holiday[] | HolidaysWrapped;

export const holidayService = {
  getAll: async (): Promise<Holiday[]> => {
    try {
      const response = await api.get<HolidaysResponse>('/settings/holidays');

      if (Array.isArray(response)) {
        return response;
      }

      // Response is wrapped in an object (e.g., { holidays: [...] })
      if (response && typeof response === 'object') {
        if (response.holidays) return response.holidays;
        if (response.data) return response.data;
        if (response.results) return response.results;
      }

      return [];
    } catch (error) {
      console.error('Failed to fetch holidays:', error);
      return [];
    }
  },
};