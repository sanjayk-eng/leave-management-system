/**
 * LogsTable — activity feed table with server-side pagination.
 *
 * Matches the asset-side pattern:
 *  - loading (initialLoading) → skeleton rows on first fetch.
 *  - fetching → opacity overlay + pointer-events-none on subsequent fetches,
 *    exactly like EquipmentCategories / EquipmentList.
 *  - ServerPagination bar at the bottom (always shown when total_pages >= 1).
 */
import { ActivityEntry } from '@/types';
import { LogsPagination } from '@/hooks/useLogs';
import { Badge }     from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ServerPagination } from '@/components/ServerPagination';
import { formatDistanceToNow } from 'date-fns';
import {
  User, Calendar, DollarSign, Settings,
  Briefcase, Sun, Shield, FileText, Package, Activity,
} from 'lucide-react';

// ─── Display helpers ──────────────────────────────────────────────────────────

const COMPONENT_ICON: Record<string, React.ReactNode> = {
  designation:          <Briefcase  className="h-3.5 w-3.5" />,
  employee:             <User       className="h-3.5 w-3.5" />,
  leave:                <Calendar   className="h-3.5 w-3.5" />,
  leave_balance:        <Calendar   className="h-3.5 w-3.5" />,
  leave_policy:         <FileText   className="h-3.5 w-3.5" />,
  leave_approval_flow:  <FileText   className="h-3.5 w-3.5" />,
  holiday:              <Sun        className="h-3.5 w-3.5" />,
  settings:             <Settings   className="h-3.5 w-3.5" />,
  payroll:              <DollarSign className="h-3.5 w-3.5" />,
  asset:                <Package    className="h-3.5 w-3.5" />,
  permission:           <Shield     className="h-3.5 w-3.5" />,
};
const componentIcon = (c: string) =>
  COMPONENT_ICON[c.toLowerCase()] ?? <Activity className="h-3.5 w-3.5" />;

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';
const actionVariant = (a: string): BadgeVariant => {
  if (a.endsWith('.created') || a.endsWith('.applied'))  return 'default';
  if (a.endsWith('.updated') || a.endsWith('.approved') || a.endsWith('.adjusted') || a.endsWith('.run')) return 'secondary';
  if (a.endsWith('.deleted') || a.endsWith('.rejected') || a.endsWith('.deactivated')) return 'destructive';
  return 'outline';
};
const actionLabel = (a: string) => {
  const verb = a.split('.').pop() ?? a;
  return verb.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};
const componentLabel = (c: string) =>
  c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

const roleBadgeClass = (role: string) => {
  switch (role.toUpperCase()) {
    case 'SUPERADMIN': return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'ADMIN':      return 'bg-blue-100   text-blue-700   border-blue-200';
    case 'HR':         return 'bg-cyan-100   text-cyan-700   border-cyan-200';
    case 'MANAGER':    return 'bg-amber-100  text-amber-700  border-amber-200';
    case 'EMPLOYEE':   return 'bg-green-100  text-green-700  border-green-200';
    case 'INTERN':     return 'bg-gray-100   text-gray-600   border-gray-200';
    default:           return 'bg-muted      text-muted-foreground border-border';
  }
};

// ─── Skeleton rows ────────────────────────────────────────────────────────────

const SkeletonRow = () => (
  <TableRow>
    {[200, 120, 100, 280, 130, 140].map((w, i) => (
      <TableCell key={i} className={i === 0 ? 'pl-4' : i === 5 ? 'pr-4' : ''}>
        <Skeleton className="h-4" style={{ width: w }} />
      </TableCell>
    ))}
  </TableRow>
);

// ─── Props ────────────────────────────────────────────────────────────────────

interface LogsTableProps {
  entries:          ActivityEntry[];
  pagination:       LogsPagination;
  loading:          boolean;   // initialLoading — show skeleton rows
  fetching:         boolean;   // subsequent fetch — show opacity overlay
  onPageChange:     (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const LogsTable = ({
  entries,
  pagination,
  loading,
  fetching,
  onPageChange,
  onPageSizeChange,
}: LogsTableProps) => {

  // ── Empty state (not initial load, no entries) ───────────────────────────
  if (!loading && entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Activity className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium">No activity found</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Try adjusting the filters or search term.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            Activity Log
            {/* Subtle spinner during refetch — matches asset fetching indicator */}
            {fetching && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            )}
          </span>
          {pagination.total > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              {pagination.total.toLocaleString()}{' '}
              {pagination.total === 1 ? 'entry' : 'entries'}
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        {/* Opacity overlay while re-fetching — identical to asset components */}
        <div className={fetching ? 'opacity-60 pointer-events-none transition-opacity duration-150' : ''}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4 w-[200px]">Actor</TableHead>
                  <TableHead className="w-[150px]">Component</TableHead>
                  <TableHead className="w-[130px]">Action</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[140px]">Resource</TableHead>
                  <TableHead className="w-[160px] pr-4">Time</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {/* Skeleton rows on first load */}
                {loading &&
                  Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                }

                {!loading && entries.map(entry => (
                  <TableRow key={entry.id} className="hover:bg-muted/30 transition-colors">

                    {/* Actor */}
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate leading-tight">
                            {entry.actor_name}
                          </p>
                          <span className={`inline-flex items-center rounded-full border px-1.5 text-[10px] font-medium leading-5 ${roleBadgeClass(entry.actor_role)}`}>
                            {entry.actor_role}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Component */}
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        {componentIcon(entry.component)}
                        <span>{componentLabel(entry.component)}</span>
                      </div>
                    </TableCell>

                    {/* Action */}
                    <TableCell>
                      <Badge variant={actionVariant(entry.action)} className="text-xs font-medium whitespace-nowrap">
                        {actionLabel(entry.action)}
                      </Badge>
                    </TableCell>

                    {/* Description */}
                    <TableCell className="max-w-xs">
                      <p className="text-sm leading-snug line-clamp-2">{entry.description}</p>
                    </TableCell>

                    {/* Resource */}
                    <TableCell>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{entry.resource_name}</p>
                        <p className="text-xs text-muted-foreground">{entry.resource_type}</p>
                      </div>
                    </TableCell>

                    {/* Time */}
                    <TableCell className="pr-4 text-right">
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">
                        {new Date(entry.created_at).toLocaleString()}
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* ServerPagination — always shown when there is at least 1 page */}
        {!loading && pagination.total_pages >= 1 && (
          <ServerPagination
            currentPage={pagination.page}
            pageSize={pagination.page_size}
            totalItems={pagination.total}
            totalPages={pagination.total_pages}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            pageSizeOptions={[20, 50, 100]}
            itemName="entries"
          />
        )}
      </CardContent>
    </Card>
  );
};
