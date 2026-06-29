import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface ServerPaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemName?: string; // e.g., "employees", "categories", "equipment"
  showPageSizeSelector?: boolean;
  showItemCount?: boolean;
}

/**
 * Reusable Server-Side Pagination Component
 * 
 * Features:
 * - Previous/Next buttons
 * - Page number buttons (shows up to 5 pages)
 * - Page size selector
 * - Item count display
 * - Fully customizable
 * 
 * @example
 * <ServerPagination
 *   currentPage={currentPage}
 *   pageSize={pageSize}
 *   totalItems={totalCount}
 *   totalPages={totalPages}
 *   onPageChange={setPage}
 *   onPageSizeChange={setPageSize}
 *   itemName="employees"
 * />
 */
export const ServerPagination: React.FC<ServerPaginationProps> = ({
  currentPage,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  itemName = 'items',
  showPageSizeSelector = true,
  showItemCount = true,
}) => {
  // Calculate display range
  const startItem = totalItems === 0 ? 0 : ((currentPage - 1) * pageSize) + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers to display (max 5 pages)
  const generatePageNumbers = () => {
    const pages: number[] = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is less than max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else if (currentPage <= 3) {
      // Show first 5 pages if current page is near start
      for (let i = 1; i <= maxPagesToShow; i++) {
        pages.push(i);
      }
    } else if (currentPage >= totalPages - 2) {
      // Show last 5 pages if current page is near end
      for (let i = totalPages - 4; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show current page in middle with 2 pages on each side
      for (let i = currentPage - 2; i <= currentPage + 2; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  const pageNumbers = generatePageNumbers();

  return (
    <div 
      className="flex items-center justify-between pt-3 pb-3 border-t"
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingTop: '12px',
        paddingBottom: '12px',
        borderTop: '1px solid hsl(var(--border))'
      }}
    >
      {/* Left side: Item count and page size selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {showItemCount && (
          <div className="text-sm text-muted-foreground">
            Showing {startItem} to {endItem} of {totalItems} {itemName}
          </div>
        )}
        
        {showPageSizeSelector && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select 
              value={String(pageSize)} 
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Right side: Pagination controls */}
      <div className="flex items-center gap-2">
        {/* Previous Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1 || totalPages === 0}
        >
          Previous
        </Button>

        {/* Page Number Buttons */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((pageNum) => (
            <Button
              key={pageNum}
              variant={currentPage === pageNum ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(pageNum)}
              style={{ width: '36px', height: '36px', padding: 0 }}
            >
              {pageNum}
            </Button>
          ))}
        </div>

        {/* Next Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages || totalPages === 0}
        >
          Next
        </Button>
      </div>
    </div>
  );
};
