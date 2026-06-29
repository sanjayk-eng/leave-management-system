import { SystemLog, LogAction, LogComponent } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { User, Calendar, DollarSign, Settings, Briefcase, Sun, Shield, FileText } from 'lucide-react';

interface LogsTableProps {
  logs: SystemLog[];
  totalCount: number;
  daysFilter: number;
  dateFrom: string;
  loading?: boolean;
}

const getActionBadgeVariant = (action: LogAction) => {
  switch (action) {
    case 'CREATE':
      return 'default'; // Green
    case 'UPDATE':
      return 'secondary'; // Yellow/Orange
    case 'DELETE':
      return 'destructive'; // Red
    case 'LOGIN':
      return 'outline'; // Blue
    case 'LOGOUT':
      return 'outline'; // Blue
    default:
      return 'outline';
  }
};

const getComponentIcon = (component: LogComponent) => {
  const iconProps = { className: 'h-4 w-4' };
  
  switch (component) {
    case 'EMPLOYEE':
      return <User {...iconProps} />;
    case 'LEAVE':
      return <Calendar {...iconProps} />;
    case 'PAYROLL':
      return <DollarSign {...iconProps} />;
    case 'SETTINGS':
      return <Settings {...iconProps} />;
    case 'DESIGNATION':
      return <Briefcase {...iconProps} />;
    case 'HOLIDAY':
      return <Sun {...iconProps} />;
    case 'AUTH':
      return <Shield {...iconProps} />;
    default:
      return <FileText {...iconProps} />;
  }
};

const getComponentDisplayName = (component: LogComponent) => {
  switch (component) {
    case 'EMPLOYEE':
      return 'Employee';
    case 'LEAVE':
      return 'Leave';
    case 'PAYROLL':
      return 'Payroll';
    case 'SETTINGS':
      return 'Settings';
    case 'DESIGNATION':
      return 'Designation';
    case 'HOLIDAY':
      return 'Holiday';
    case 'AUTH':
      return 'Authentication';
    default:
      return component;
  }
};

export const LogsTable = ({ logs, totalCount, daysFilter, dateFrom, loading = false }: LogsTableProps) => {
  if (logs.length === 0) {
    const isToday = daysFilter === 1;
    const dateRangeText = isToday 
      ? 'today' 
      : `in the last ${daysFilter} ${daysFilter === 1 ? 'day' : 'days'}`;
    
    const fromDateText = dateFrom 
      ? ` (from ${new Date(dateFrom).toLocaleDateString()})` 
      : '';

    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No system activities found</h3>
          <div className="space-y-2 text-muted-foreground">
            <p>
              No logs were recorded {dateRangeText}{fromDateText}.
            </p>
            {isToday && (
              <p className="text-sm">
                This could mean no users were active today, or try selecting a longer time period.
              </p>
            )}
            {daysFilter > 1 && (
              <p className="text-sm">
                Try selecting a different time period or check if the system was active during this time.
              </p>
            )}
          </div>
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Tip:</strong> System logs include user logins, data changes, and administrative actions.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            System Logs
            {loading && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            )}
          </span>
          <div className="text-sm font-normal text-muted-foreground">
            {totalCount} {totalCount === 1 ? 'entry' : 'entries'} • Last {daysFilter} {daysFilter === 1 ? 'day' : 'days'}
            {dateFrom && (
              <span className="ml-2">
                (from {new Date(dateFrom).toLocaleDateString()})
              </span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Component</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {log.user_name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getActionBadgeVariant(log.action)}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getComponentIcon(log.component)}
                      <span>{getComponentDisplayName(log.component)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="flex flex-col">
                      <span>
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </span>
                      <span className="text-xs">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};