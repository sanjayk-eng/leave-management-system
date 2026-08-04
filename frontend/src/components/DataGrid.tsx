/**
 * DataGrid — lightweight shadcn/ui Table wrapper.
 * Drop-in replacement for the former AG Grid wrapper.
 * Supports optional client-side pagination.
 */
import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Column definition (mirrors the AG Grid ColDef surface we used) ───────────
export interface ColDef<T = unknown> {
  field?: keyof T & string;
  headerName?: string;
  /** Custom cell renderer — receives the row data object */
  cellRenderer?: (data: T) => React.ReactNode;
  /** Simple value formatter — receives the raw field value */
  valueFormatter?: (value: unknown, data: T) => string;
  className?: string;
  headerClassName?: string;
  /** 'left' | 'right' — kept for API compat, currently unused visually */
  pinned?: 'left' | 'right';
}

interface DataGridProps<T = unknown> {
  rowData: T[];
  columnDefs: ColDef<T>[];
  className?: string;
  pagination?: boolean;
  paginationPageSize?: number;
  /** Kept for API compat — unused */
  domLayout?: string;
  /** Kept for API compat — unused */
  rowHeight?: number;
  /** Kept for API compat — unused */
  gridOptions?: unknown;
  /** Kept for API compat — unused */
  onGridReady?: unknown;
}

export function DataGrid<T extends { id?: string | number }>({
  rowData,
  columnDefs,
  className,
  pagination = false,
  paginationPageSize = 10,
}: DataGridProps<T>) {
  const [page, setPage] = useState(1);

  // Reset to page 1 whenever data changes
  const pageCount = pagination ? Math.ceil(rowData.length / paginationPageSize) : 1;

  const visibleRows = useMemo(() => {
    if (!pagination) return rowData;
    const start = (page - 1) * paginationPageSize;
    return rowData.slice(start, start + paginationPageSize);
  }, [rowData, pagination, page, paginationPageSize]);

  const renderCell = (col: ColDef<T>, row: T) => {
    const rawValue = col.field ? (row as Record<string, unknown>)[col.field] : undefined;

    if (col.cellRenderer) {
      return col.cellRenderer(row);
    }
    if (col.valueFormatter) {
      return col.valueFormatter(rawValue, row);
    }
    if (rawValue === null || rawValue === undefined) {
      return <span className="text-muted-foreground italic text-xs">—</span>;
    }
    return String(rawValue);
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              {columnDefs.map((col, i) => (
                <TableHead
                  key={col.field ?? i}
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3',
                    col.headerClassName,
                  )}
                >
                  {col.headerName ?? col.field ?? ''}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columnDefs.length}
                  className="text-center py-10 text-muted-foreground"
                >
                  No data
                </TableCell>
              </TableRow>
            ) : (
              visibleRows.map((row, ri) => (
                <TableRow
                  key={(row as Record<string, unknown>).id as string ?? ri}
                  className="border-b last:border-0 hover:bg-accent/30 transition-colors"
                >
                  {columnDefs.map((col, ci) => (
                    <TableCell
                      key={col.field ?? ci}
                      className={cn('px-4 py-3 align-middle text-sm', col.className)}
                    >
                      {renderCell(col, row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pageCount > 1 && (
        <div className="flex items-center justify-between px-2 py-3 border-t mt-0">
          <span className="text-sm text-muted-foreground">
            Page {page} of {pageCount} &nbsp;·&nbsp; {rowData.length} total
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page === pageCount}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
