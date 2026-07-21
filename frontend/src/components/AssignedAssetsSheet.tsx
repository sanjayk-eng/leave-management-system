/**
 * AssignedAssetsSheet — right-side slide-over showing an employee's
 * assigned assets/equipment.
 *
 * Improved UI:
 *  - Card-based asset rows with icon accent
 *  - Purchase date shown when available
 *  - Quantity rendered as a prominent pill
 *  - Summary stats in coloured tiles at top
 *  - Compact but spacious footer
 */
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Skeleton }      from '@/components/ui/skeleton';
import { ScrollArea }    from '@/components/ui/scroll-area';
import { Separator }     from '@/components/ui/separator';
import { Badge }         from '@/components/ui/badge';
import { ErrorDisplay }  from '@/components/ErrorDisplay';
import { useEmployeeEquipment } from '@/hooks/useEmployeeEquipment';
import { Package, CalendarDays, UserCheck, Layers } from 'lucide-react';

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

function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return null;
  }
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

const SkeletonCard = () => (
  <div className="rounded-lg border bg-card p-4 space-y-3">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3 flex-1">
        <Skeleton className="h-9 w-9 rounded-md shrink-0" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-7 w-14 rounded-full shrink-0" />
    </div>
  </div>
);

// ─── Stat tile ────────────────────────────────────────────────────────────────

const StatTile = ({
  label, value, icon: Icon, accent,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  accent: string;
}) => (
  <div className={`rounded-lg border p-3 flex flex-col gap-1 ${accent}`}>
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      <span className="text-[10px] font-semibold uppercase tracking-widest">{label}</span>
    </div>
    <p className="text-2xl font-bold tabular-nums leading-none">{value}</p>
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
  const hasData  = !loading && !error && assignments.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[460px] p-0 flex flex-col gap-0">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <SheetHeader className="px-6 pt-6 pb-5 shrink-0 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            {/* Monogram */}
            <div className="h-10 w-10 rounded-lg border bg-background shadow-sm flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-foreground tracking-tight">
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

            {/* Item count pill */}
            {!loading && !error && assignments.length > 0 && (
              <Badge variant="secondary" className="shrink-0 tabular-nums font-semibold">
                {assignments.length} item{assignments.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {/* ── Summary tiles (only when data available) ────────────── */}
          {hasData && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              <StatTile
                label="Asset Types"
                value={assignments.length}
                icon={Layers}
                accent="bg-background"
              />
              <StatTile
                label="Total Units"
                value={totalQty}
                icon={Package}
                accent="bg-background"
              />
            </div>
          )}
        </SheetHeader>

        {/* ── Body ──────────────────────────────────────────────────────── */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-4 space-y-3">

            {/* Loading skeletons */}
            {loading && Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}

            {/* Error state */}
            {!loading && error && (
              <div className="py-6 px-2">
                <ErrorDisplay error={error} onRetry={() => refetch()} />
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && assignments.length === 0 && (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                  <Package className="h-7 w-7 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="text-sm font-medium">No assets assigned</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                    Assets will appear here once they are assigned to this employee.
                  </p>
                </div>
              </div>
            )}

            {/* Asset cards */}
            {!loading && !error && assignments.map((a, i) => {
              const purchaseDate = formatDate(a.purchase_date);
              return (
                <div
                  key={i}
                  className="rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Icon + name */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="h-9 w-9 rounded-md bg-primary/8 border border-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                        <Package className="h-4 w-4 text-primary/70" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-tight truncate">
                          {a.equipment_name}
                        </p>
                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                          {a.approved_by_name && (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <UserCheck className="h-3 w-3 shrink-0" />
                              {a.approved_by_name}
                            </span>
                          )}
                          {purchaseDate && (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <CalendarDays className="h-3 w-3 shrink-0" />
                              {purchaseDate}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quantity pill */}
                    <div className="shrink-0 flex flex-col items-end gap-0.5">
                      <div className="flex items-baseline gap-1 bg-muted rounded-full px-3 py-1">
                        <span className="text-base font-bold tabular-nums leading-none">
                          {a.quantity}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {a.quantity === 1 ? 'unit' : 'units'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

          </div>
        </ScrollArea>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        {hasData && (
          <>
            <Separator />
            <div className="px-6 py-3.5 shrink-0 flex items-center justify-between bg-muted/20">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{assignments.length}</span>{' '}
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
