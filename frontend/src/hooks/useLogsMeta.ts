import { useState, useEffect } from 'react';
import { logsService } from '@/services/logsService';
import { AuditComponentMeta, AuditActionMeta } from '@/types';

interface UseLogsMetaReturn {
  components: AuditComponentMeta[];
  actions: AuditActionMeta[];
  loading: boolean;
}

/**
 * Fetches the live audit meta catalogue from GET /api/logs/meta.
 *
 * Why a hook and not inline in LogsFilter:
 *  – The meta is static for the lifetime of the session (only changes on
 *    backend deploy).  Fetching it once at the hook level and passing it
 *    down prevents redundant network calls if LogsFilter ever unmounts/remounts.
 *  – If the request fails the filter still renders — it just shows no options,
 *    which is better than crashing the whole page.
 */
export const useLogsMeta = (): UseLogsMetaReturn => {
  const [components, setComponents] = useState<AuditComponentMeta[]>([]);
  const [actions, setActions]       = useState<AuditActionMeta[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    let cancelled = false;
    logsService
      .getMeta()
      .then(res => {
        if (!cancelled) {
          setComponents(res.data?.components ?? []);
          setActions(res.data?.actions ?? []);
        }
      })
      .catch(() => {
        // Silently fall back to empty — filter dropdowns show "All" only.
        // The activity feed itself is unaffected.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []); // fetch once — meta is stable for the session

  return { components, actions, loading };
};
