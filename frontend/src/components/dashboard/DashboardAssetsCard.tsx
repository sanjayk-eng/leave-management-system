import { Button }     from '@/components/ui/button';
import { Skeleton }   from '@/components/ui/skeleton';
import { Separator }  from '@/components/ui/separator';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { Eye, Package } from 'lucide-react';
import { useEmployeeEquipment } from '@/hooks/useEmployeeEquipment';

interface DashboardAssetsCardProps {
  employeeId:   string;
  employeeName?: string;
  onViewAssets: () => void;
}

const MicroLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
    {children}
  </p>
);

export const DashboardAssetsCard = ({
  employeeId, employeeName, onViewAssets,
}: DashboardAssetsCardProps) => {
  const { assignments, loading, error, refetch } = useEmployeeEquipment(employeeId);

  const totalQty = assignments.reduce((s, a) => s + (a.quantity ?? 0), 0);

  return (
    <div className="rounded-xl border bg-card shadow-sm flex flex-col">

      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Assigned Assets</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {employeeName ? `${employeeName}'s equipment` : 'Your equipment'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 h-8 text-xs text-muted-foreground hover:text-foreground"
          onClick={onViewAssets}
          disabled={loading}
        >
          <Eye className="h-3.5 w-3.5" />
          Details
        </Button>
      </div>

      {/* Body */}
      <div className="px-5 py-4 flex-1">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3.5 w-8" />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorDisplay error={error} onRetry={refetch} compact />
        ) : assignments.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Package className="h-7 w-7 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">No assets assigned</p>
          </div>
        ) : (
          <>
            {/* Summary numbers */}
            <div className="grid grid-cols-2 divide-x text-center mb-4">
              <div className="pr-3">
                <MicroLabel>Items</MicroLabel>
                <p className="text-2xl font-bold tabular-nums mt-1">{assignments.length}</p>
              </div>
              <div className="pl-3">
                <MicroLabel>Total Units</MicroLabel>
                <p className="text-2xl font-bold tabular-nums mt-1">{totalQty}</p>
              </div>
            </div>

            <Separator className="mb-3" />

            {/* Asset mini list — up to 3 */}
            <div className="space-y-2">
              {assignments.slice(0, 3).map((a, i) => (
                <div key={i} className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground truncate flex-1 mr-3">
                    {a.equipment_name}
                  </p>
                  <span className="text-xs font-semibold tabular-nums shrink-0">
                    ×{a.quantity}
                  </span>
                </div>
              ))}
              {assignments.length > 3 && (
                <p className="text-[11px] text-muted-foreground text-right">
                  +{assignments.length - 3} more · click Details
                </p>
              )}
            </div>
          </>
        )}
      </div>

    </div>
  );
};
