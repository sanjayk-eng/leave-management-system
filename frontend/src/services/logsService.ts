import { api } from '@/lib/api';
import { ActivityFeedFilter, ActivityFeedResponse, AuditMetaResponse } from '@/types';

export const logsService = {
  /**
   * Paginated activity feed.
   * All filter params are optional — omitting them returns everything.
   */
  getActivity: async (filter: ActivityFeedFilter = {}): Promise<ActivityFeedResponse> => {
    const params = new URLSearchParams();
    if (filter.resource_id) params.set('resource_id', filter.resource_id);
    if (filter.actor_id)    params.set('actor_id',    filter.actor_id);
    if (filter.component)   params.set('component',   filter.component);
    if (filter.action)      params.set('action',      filter.action);
    if (filter.search)      params.set('search',      filter.search);
    if (filter.page)        params.set('page',        String(filter.page));
    if (filter.page_size)   params.set('page_size',   String(filter.page_size));

    const qs = params.toString();
    return api.get<ActivityFeedResponse>(`/logs${qs ? `?${qs}` : ''}`);
  },

  /**
   * Returns the live catalogue of every registered component and action.
   * The frontend filter dropdowns are driven entirely by this response —
   * no hardcoded lists on the client.  Adding a new action on the backend
   * makes it appear here automatically.
   */
  getMeta: async (): Promise<AuditMetaResponse> => {
    return api.get<AuditMetaResponse>('/logs/meta');
  },
};
