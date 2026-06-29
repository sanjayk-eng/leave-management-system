import { api } from '@/lib/api';
import { LeaveTiming, LeaveTimingResponse, UpdateLeaveTimingRequest } from '../types';

export const leaveTimingService = {
  // Get all leave timings
  async getLeaveTiming(): Promise<LeaveTiming[]> {
    const data = await api.get<LeaveTimingResponse>('/leaves/timming');
    return data.data;
  },

  // Update leave timing
  async updateLeaveTiming(request: UpdateLeaveTimingRequest): Promise<void> {
    await api.put<{ message: string }>('/leaves/timming', request);
  },
};