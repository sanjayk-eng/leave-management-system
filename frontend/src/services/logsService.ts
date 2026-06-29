import { api } from '@/lib/api';
import { LogsResponse } from '@/types';

export const logsService = {
  getLogs: async (days: number = 7): Promise<LogsResponse> => {
    const response = await api.get<LogsResponse>(`/logs?days=${days}`);
    return response;
  },
};