/**
 * LogsFilter — search + component/action filter bar for the Activity Log.
 *
 * • Free-text search input (debounced 350 ms in useLogs) — searches actor name,
 *   description, and resource name via the backend ?search= param.
 * • Component + Action dropdowns use SearchableSelect (the same component used
 *   on the asset/employee pages) fed from GET /api/logs/meta — zero hardcoding.
 * • Selecting a component narrows the Action dropdown to that component's actions.
 * • All filter options come from the API; adding a new action on the backend
 *   makes it appear here automatically.
 */
import { useMemo } from 'react';
import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchableSelect } from '@/components/SearchableSelect';
import { RefreshCw, X, Search, SlidersHorizontal } from 'lucide-react';
import { AuditComponentMeta, AuditActionMeta } from '@/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface LogsFilterProps {
  // Current values
  searchRaw:  string;
  component:  string;
  action:     string;
  // Meta catalogue from GET /api/logs/meta
  components:   AuditComponentMeta[];
  actions:      AuditActionMeta[];
  metaLoading:  boolean;
  // Handlers
  onSearch:          (v: string) => void;
  onComponentChange: (v: string) => void;
  onActionChange:    (v: string) => void;
  onClear:           () => void;
  onRefresh:         () => void;
  loading:           boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const LogsFilter = ({
  searchRaw,
  component,
  action,
  components,
  actions,
  metaLoading,
  onSearch,
  onComponentChange,
  onActionChange,
  onClear,
  onRefresh,
  loading,
}: LogsFilterProps) => {

  // Convert meta → SearchableSelect option shape
  const componentOptions = useMemo(
    () => components.map(c => ({ value: c.value, label: c.label })),
    [components],
  );

  // Narrow actions to selected component; show all if none selected
  const actionOptions = useMemo(() => {
    const base = component
      ? actions.filter(a => a.component === component)
      : actions;
    return base.map(a => ({ value: a.action, label: a.label }));
  }, [actions, component]);

  // If selected action no longer belongs to the new component, treat as "all"
  const safeAction = useMemo(
    () => (action && actionOptions.some(o => o.value === action) ? action : 'all'),
    [action, actionOptions],
  );

  const activeFilters =
    (component ? 1 : 0) + (action ? 1 : 0) + (searchRaw.trim() ? 1 : 0);

  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">

      {/* ── Row 1: free-text search ─────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          value={searchRaw}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search by actor, description or resource…"
          className="h-8 text-sm flex-1 max-w-sm"
          disabled={loading}
        />
      </div>

      {/* ── Row 2: dropdowns + actions ──────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-3">

        {/* Label */}
        <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground self-end mb-0.5">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
        </div>

        {/* Component */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Component</Label>
          {metaLoading ? (
            <Skeleton className="h-8 w-44" />
          ) : (
            <SearchableSelect
              options={componentOptions}
              value={component || 'all'}
              onValueChange={v => {
                onActionChange(''); // clear action on component change
                onComponentChange(v === 'all' ? '' : v);
              }}
              placeholder="All components"
              searchPlaceholder="Search components…"
              allOptionLabel="All components"
              showAllOption
              disabled={loading}
              className="w-44 h-8 text-sm"
            />
          )}
        </div>

        {/* Action */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Action</Label>
          {metaLoading ? (
            <Skeleton className="h-8 w-52" />
          ) : (
            <SearchableSelect
              options={actionOptions}
              value={safeAction}
              onValueChange={v => onActionChange(v === 'all' ? '' : v)}
              placeholder="All actions"
              searchPlaceholder="Search actions…"
              allOptionLabel={`All actions${component ? ` (${actionOptions.length})` : ''}`}
              showAllOption
              disabled={loading || actionOptions.length === 0}
              emptyMessage="No matching actions"
              className="w-52 h-8 text-sm"
            />
          )}
        </div>

        {/* Clear */}
        {activeFilters > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={loading}
            className="h-8 gap-1.5 text-muted-foreground hover:text-foreground self-end"
          >
            <X className="h-3.5 w-3.5" />
            Clear ({activeFilters})
          </Button>
        )}

        {/* Refresh */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="h-8 gap-1.5 ml-auto self-end"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
    </div>
  );
};
