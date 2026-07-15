import { api } from '@/lib/api';
import { ActivityFeedFilter, ActivityFeedResponse } from '@/types';

export const logsService = {
  getActivity: async (filter: ActivityFeedFilter = {}): Promise<ActivityFeedResponse> => {
    const params = new URLSearchParams();
    if (filter.resource_id) params.set('resource_id', filter.resource_id);
    if (filter.actor_id)    params.set('actor_id',    filter.actor_id);
    if (filter.component)   params.set('component',   filter.component);
    if (filter.action)      params.set('action',      filter.action);
    if (filter.page)        params.set('page',        String(filter.page));
    if (filter.page_size)   params.set('page_size',   String(filter.page_size));

    const qs = params.toString();
    return api.get<ActivityFeedResponse>(`/logs${qs ? `?${qs}` : ''}`);
  },
};
