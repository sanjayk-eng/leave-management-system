import { useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridOptions, GridReadyEvent, ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { cn } from '@/lib/utils';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

interface DataGridProps<T = unknown> {
  rowData: T[];
  columnDefs: ColDef<T>[];
  onGridReady?: (event: GridReadyEvent) => void;
  className?: string;
  gridOptions?: GridOptions<T>;
  pagination?: boolean;
  paginationPageSize?: number;
  domLayout?: 'normal' | 'autoHeight' | 'print';
  rowHeight?: number;
}

export function DataGrid<T = unknown>({
  rowData,
  columnDefs,
  onGridReady,
  className,
  gridOptions,
  pagination = false,
  paginationPageSize = 10,
  domLayout = 'autoHeight',
  rowHeight,
}: DataGridProps<T>) {
  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    minWidth: 80,
  }), []);

  // When pagination is on with autoHeight, the horizontal scrollbar overlaps the pagination panel.
  // Fix: switch to domLayout="normal" with a calculated fixed height so the pagination panel
  // renders inside the grid's own layout flow — fully visible below the scroll area.
  const effectiveDomLayout = pagination && domLayout === 'autoHeight' ? 'normal' : domLayout;
  const effectiveHeight =
    pagination && domLayout === 'autoHeight'
      ? `${(paginationPageSize * (rowHeight ?? 60)) + 108}px` // data rows + header (48px) + pagination bar (60px)
      : '100%';

  const defaultGridOptions = useMemo<GridOptions<T>>(() => ({
    animateRows: true,
    rowSelection: 'single',
    suppressCellFocus: true,
    enableCellTextSelection: true,
    suppressHorizontalScroll: false,
    domLayout: effectiveDomLayout,
    ...gridOptions,
  }), [gridOptions, effectiveDomLayout]);

  const handleGridReady = useCallback((event: GridReadyEvent) => {
    if (onGridReady) {
      onGridReady(event);
    }
  }, [onGridReady]);

  return (
    <div
      className={cn('ag-theme-alpine', className)}
      style={{ width: '100%', height: effectiveHeight }}
    >
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        gridOptions={defaultGridOptions}
        onGridReady={handleGridReady}
        pagination={pagination}
        paginationPageSize={paginationPageSize}
        domLayout={effectiveDomLayout}
        getRowId={(params) => params.data.id}
        rowHeight={rowHeight}
      />
    </div>
  );
}
