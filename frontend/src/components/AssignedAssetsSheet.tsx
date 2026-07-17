/**
 * AssignedAssetsSheet — right-side slide-over showing an employee's
 * assigned assets/equipment.
 *
 * Same design language as LeaveBalanceSheet:
 *  - Neutral monogram, no colour gimmicks
 *  - Data-dense, compact rows
 *  - ScrollArea body, fixed header/footer
 */
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button }     from '@/components/ui/button';
import { Skeleton }   from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator }  from '@/components/ui/separator';
import { Badge }      from '@/components/ui/badge';
import { useEmployeeEquipment } from '@/hooks/useEmployeeEquipment';
import { AlertCircle, RefreshCw, Package } from 'lucide-react';

// ─── Props ────────────────────────────────────────────────────────────────────

interface AssignedAssetsSheetProps {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  employeeId:   string;
  employeeName: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

const MicroLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
    {children}
  </p>
);

// ─── Skeleton rows ────────────────────────────────────────────────────────────

const SkeletonRow = () => (
  <div className="border-b py-4 flex items-center gap-4">
    <div className="flex-1 space-y-1.5">
      <Skeleton className="h-3.5 w-36" />
      <Skeleton className="h-3 w-24" />
    </div>
    <Skeleton className="h-5 w-8 rounded" />
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

export const AssignedAssetsSheet = ({
  open, onOpenChange, employeeId, employeeName,
}: AssignedAssetsSheetProps) => {
  const { assignments, loading, error, refetch } = useEmployeeEquipment(
    open ? employeeId : '',
  );

  const totalQty = assignments.reduce((s, a) => s + (a.quantity ?? 0), 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[440px] p-0 flex flex-col">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <SheetHeader className="px-6 pt-6 pb-4 shrink-0 border-b">
          <div className="flex items-center gap-3">
            {/* Neutral monogram */}
            <div className="h-9 w-9 rounded-md border bg-muted flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-foreground tracking-tight">
                {getInitials(employeeName || 'NA')}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base font-semibold leading-tight truncate">
                {employeeName || '—'}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Assigned assets · equipment
              </SheetDescription>
            </div>

            {/* Summary pill — only when data loaded */}
            {!loading && !error && assignments.length > 0 && (
              <Badge variant="secondary" className="shrink-0 tabular-nums">
                {assignments.length} item{assignments.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </SheetHeader>

        {/* ── Body ──────────────────────────────────────────────────────── */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-2">

            {/* Loading */}
            {loading && Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}

            {/* Error */}
            {!loading && error && (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground/40" />
                <div>
                  <p className="text-sm font-medium">Could not load assets</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                    {(error as Error)?.message ?? 'An unexpected error occurred'}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 h-8">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry
                </Button>
              </div>
            )}

            {/* Empty */}
            {!loading && !error && assignments.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <Package className="h-8 w-8 text-muted-foreground/30" />
                <div>
                  <p className="text-sm font-medium">No assets assigned</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                    Assets will appear here once they are assigned to this employee.
                  </p>
                </div>
              </div>
            )}

            {/* Asset rows */}
            {!loading && !error && assignments.map((a, i) => (
              <div key={i} className="border-b last:border-0 py-4">

                {/* Row 1: asset name + qty badge */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-sm font-semibold leading-tight">{a.equipment_name}</p>
                  <div className="shrink-0 flex items-baseline gap-1">
                    <span className="text-lg font-bold tabular-nums">{a.quantity}</span>
                    <span className="text-[11px] text-muted-foreground">unit{a.quantity !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* Row 2: assigned-by */}
                {a.approved_by_name && (
                  <div className="flex items-center gap-2">
                    <MicroLabel>Assigned by</MicroLabel>
                    <p className="text-xs text-muted-foreground">{a.approved_by_name}</p>
                  </div>
                )}

              </div>
            ))}

          </div>
        </ScrollArea>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        {!loading && !error && assignments.length > 0 && (
          <>
            <Separator />
            <div className="px-6 py-3 shrink-0 flex items-center justify-between bg-muted/20">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{assignments.length}</span>{' '}
                asset {assignments.length === 1 ? 'type' : 'types'}
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{totalQty}</span> total units
              </p>
            </div>
          </>
        )}

      </SheetContent>
    </Sheet>
  );
};
