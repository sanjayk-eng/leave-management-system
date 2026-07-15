import { ActivityEntry } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ServerPagination } from '@/components/ServerPagination';
import { ActivityPagination } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import {
  User,
  Calendar,
  DollarSign,
  Settings,
  Briefcase,
  Sun,
  Shield,
  FileText,
  Package,
  Activity,
} from 'lucide-react';

// ─── Component icon map ───────────────────────────────────────────────────────

const COMPONENT_ICON: Record<string, React.ReactNode> = {
  designation:   <Briefcase  className="h-3.5 w-3.5" />,
  employee:      <User       className="h-3.5 w-3.5" />,
  leave:         <Calendar   className="h-3.5 w-3.5" />,
  leave_balance: <Calendar   className="h-3.5 w-3.5" />,
  leave_policy:  <FileText   className="h-3.5 w-3.5" />,
  holiday:       <Sun        className="h-3.5 w-3.5" />,
  settings:      <Settings   className="h-3.5 w-3.5" />,
  payroll:       <DollarSign className="h-3.5 w-3.5" />,
  asset:         <Package    className="h-3.5 w-3.5" />,
  permission:    <Shield     className="h-3.5 w-3.5" />,
};

const componentIcon = (c: string) =>
  COMPONENT_ICON[c.toLowerCase()] ?? <Activity className="h-3.5 w-3.5" />;

// ─── Action badge colour ──────────────────────────────────────────────────────

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

const actionVariant = (action: string): BadgeVariant => {
  if (action.endsWith('.created') || action.endsWith('.applied'))   return 'default';
  if (action.endsWith('.updated') || action.endsWith('.approved'))  return 'secondary';
  if (action.endsWith('.deleted') || action.endsWith('.rejected'))  return 'destructive';
  return 'outline';
};

// Pretty-print "designation.created" → "Created"
const actionLabel = (action: string) => {
  const parts = action.split('.');
  const verb = parts[parts.length - 1] ?? action;
  return verb.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

// Pretty-print component name
const componentLabel = (c: string) =>
  c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

// ─── Role badge colour ────────────────────────────────────────────────────────

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

// ─── Props ────────────────────────────────────────────────────────────────────

interface LogsTableProps {
  entries:    ActivityEntry[];
  pagination: ActivityPagination;
  loading?:   boolean;
  onPageChange:     (page: number)     => void;
  onPageSizeChange: (pageSize: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const LogsTable = ({
  entries,
  pagination,
  loading = false,
  onPageChange,
  onPageSizeChange,
}: LogsTableProps) => {

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!loading && entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Activity className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium">No activity found</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Try clearing the filters or come back after some actions have been recorded.
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
            {loading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            )}
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {pagination.total.toLocaleString()}{' '}
            {pagination.total === 1 ? 'entry' : 'entries'}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-4 w-[200px]">Actor</TableHead>
                <TableHead className="w-[130px]">Component</TableHead>
                <TableHead className="w-[110px]">Action</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[140px]">Resource</TableHead>
                <TableHead className="w-[150px] pr-4">Time</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {entries.map(entry => (
                <TableRow key={entry.id} className="group">
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
                        <span
                          className={`inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-medium leading-5 ${roleBadgeClass(entry.actor_role)}`}
                        >
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
                    <Badge variant={actionVariant(entry.action)} className="text-xs font-medium">
                      {actionLabel(entry.action)}
                    </Badge>
                  </TableCell>

                  {/* Description — the pre-rendered human-readable sentence */}
                  <TableCell className="max-w-xs">
                    <p className="text-sm text-foreground leading-snug line-clamp-2">
                      {entry.description}
                    </p>
                  </TableCell>

                  {/* Resource */}
                  <TableCell>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{entry.resource_name}</p>
                      <p className="text-xs text-muted-foreground">{entry.resource_type}</p>
                    </div>
                  </TableCell>

                  {/* Time */}
                  <TableCell className="pr-4">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        {new Date(entry.created_at).toLocaleString()}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination.total_pages > 0 && (
          <div className="px-4">
            <ServerPagination
              currentPage={pagination.page}
              pageSize={pagination.page_size}
              totalItems={pagination.total}
              totalPages={pagination.total_pages}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
              pageSizeOptions={[10, 20, 50, 100]}
              itemName="entries"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
