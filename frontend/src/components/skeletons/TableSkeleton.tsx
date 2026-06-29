import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showActions?: boolean;
}

export function TableSkeleton({ rows = 10, columns = 8, showActions = true }: TableSkeletonProps) {
  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex gap-3 py-3 border-b bg-background">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={`header-${i}`} className={i === 0 ? "flex-1 min-w-[180px]" : "flex-1"}>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
        {showActions && (
          <div className="w-20">
            <Skeleton className="h-4 w-16" />
          </div>
        )}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-3 py-4 border-b">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={`cell-${rowIndex}-${colIndex}`} className={colIndex === 0 ? "flex-1 min-w-[180px]" : "flex-1"}>
              {colIndex === 2 ? (
                // Badge skeleton for Role column
                <Skeleton className="h-6 w-24 rounded-full" />
              ) : colIndex === columns - 1 ? (
                // Badge skeleton for Status column
                <Skeleton className="h-6 w-16 rounded-full" />
              ) : (
                <Skeleton className="h-4 w-full" />
              )}
            </div>
          ))}
          {showActions && (
            <div className="w-20 flex justify-center">
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
