import { useState, useCallback } from "react";
import {
  Users, FileText, Wallet, Settings2, Briefcase,
  Package, Shield, BookOpen, BarChart3, AlertCircle,
  ChevronDown, ChevronUp, Users2, Lock,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useRolePermissions, useTogglePermissions } from "@/hooks/usePermissions";
import type { PermissionRow, ResourceGroup } from "@/services/permissionService";
import { cn } from "@/lib/utils";

// ─── Role tab definitions ─────────────────────────────────────────────────────
// Excludes SUPERADMIN (role_id=1) — immutable, backend enforces 403.
const ROLE_TABS = [
  { id: 2, label: "HR",       color: "text-violet-600" },
  { id: 3, label: "Admin",    color: "text-blue-600" },
  { id: 4, label: "Manager",  color: "text-cyan-600" },
  { id: 5, label: "Employee", color: "text-emerald-600" },
  { id: 6, label: "Intern",   color: "text-orange-500" },
] as const;

// ─── Resource visual config ───────────────────────────────────────────────────
const RESOURCE_META: Record<string, {
  icon: React.ElementType;
  label: string;
  description: string;
  accent: string;   // border-left color class
  bg: string;       // header bg class
}> = {
  employee: {
    icon: Users,
    label: "Employee Management",
    description: "Create, update and manage employee accounts, roles, and reporting structure.",
    accent: "border-l-blue-500",
    bg: "bg-blue-50/60 dark:bg-blue-950/20",
  },
  leave: {
    icon: FileText,
    label: "Leave Management",
    description: "Apply, approve, reject and manage leave requests across the organization.",
    accent: "border-l-green-500",
    bg: "bg-green-50/60 dark:bg-green-950/20",
  },
  leave_balance: {
    icon: BookOpen,
    label: "Leave Balance",
    description: "View and manually adjust employee leave balances.",
    accent: "border-l-teal-500",
    bg: "bg-teal-50/60 dark:bg-teal-950/20",
  },
  leave_report: {
    icon: BarChart3,
    label: "Leave Reports",
    description: "Access monthly, yearly or custom date-range leave reports.",
    accent: "border-l-indigo-500",
    bg: "bg-indigo-50/60 dark:bg-indigo-950/20",
  },
  payroll: {
    icon: Wallet,
    label: "Payroll",
    description: "Run, finalize and view payroll runs and employee payslips.",
    accent: "border-l-amber-500",
    bg: "bg-amber-50/60 dark:bg-amber-950/20",
  },
  settings: {
    icon: Settings2,
    label: "Settings",
    description: "Manage company configuration, branding, holidays, leave policies, and approval flows.",
    accent: "border-l-purple-500",
    bg: "bg-purple-50/60 dark:bg-purple-950/20",
  },
  designation: {
    icon: Briefcase,
    label: "Designations",
    description: "Create and manage job designation records.",
    accent: "border-l-orange-500",
    bg: "bg-orange-50/60 dark:bg-orange-950/20",
  },
  equipment: {
    icon: Package,
    label: "Equipment & Assets",
    description: "Manage equipment inventory, categories and employee assignments.",
    accent: "border-l-rose-500",
    bg: "bg-rose-50/60 dark:bg-rose-950/20",
  },
  permission: {
    icon: Shield,
    label: "Permissions",
    description: "View and edit role-based permission assignments.",
    accent: "border-l-slate-500",
    bg: "bg-slate-50/60 dark:bg-slate-950/20",
  },
};

// ─── Scope pill ───────────────────────────────────────────────────────────────
const SCOPE_STYLE: Record<string, string> = {
  own:  "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  team: "bg-sky-100   text-sky-700   dark:bg-sky-900   dark:text-sky-300",
  all:  "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
};
const SCOPE_LABEL: Record<string, string> = {
  own:  "Own",
  team: "Team",
  all:  "All",
};

function ScopePill({ scope }: { scope: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
      SCOPE_STYLE[scope] ?? SCOPE_STYLE.own,
    )}>
      {SCOPE_LABEL[scope] ?? scope}
    </span>
  );
}

// ─── Permission table row ─────────────────────────────────────────────────────
interface PermRowProps {
  perm: PermissionRow;
  disabled: boolean;
  onToggle: (id: number, enabled: boolean) => void;
  isLast: boolean;
}

function PermTableRow({ perm, disabled, onToggle, isLast }: PermRowProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-[1fr_auto_auto] items-start gap-4 px-4 py-3.5",
        "hover:bg-muted/40 transition-colors",
        !isLast && "border-b border-border/50",
      )}
    >
      {/* Left: label + description */}
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium text-foreground leading-snug">
          {perm.label}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {perm.description}
        </p>
        {perm.require_seniority && (
          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
            ⚠ Requires higher seniority than target
          </p>
        )}
      </div>

      {/* Center: scope pill */}
      <div className="flex items-center justify-center pt-0.5">
        <ScopePill scope={perm.scope} />
      </div>

      {/* Right: toggle */}
      <div className="flex items-center justify-end pt-0.5">
        <Switch
          checked={perm.is_enabled}
          onCheckedChange={(v) => onToggle(perm.permission_id, v)}
          disabled={disabled}
          aria-label={`${perm.is_enabled ? "Disable" : "Enable"} ${perm.label}`}
        />
      </div>
    </div>
  );
}

// ─── Resource section ─────────────────────────────────────────────────────────
interface ResourceSectionProps {
  group: ResourceGroup;
  disabled: boolean;
  onToggle: (id: number, enabled: boolean) => void;
}

function ResourceSection({ group, disabled, onToggle }: ResourceSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const meta = RESOURCE_META[group.resource];
  const Icon = meta?.icon ?? Shield;

  const total = group.permissions.length;
  const enabled = group.permissions.filter((p) => p.is_enabled).length;

  return (
    <div className={cn(
      "rounded-xl border border-border overflow-hidden border-l-4",
      meta?.accent ?? "border-l-slate-400",
    )}>
      {/* ── Section header — click to expand/collapse ── */}
      <button
        type="button"
        onClick={() => setExpanded((x) => !x)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3.5 text-left",
          "hover:brightness-95 transition-all",
          meta?.bg ?? "bg-muted/30",
        )}
      >
        {/* Icon + title + subtitle */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-background/70 shadow-sm shrink-0">
            <Icon className="h-4 w-4 text-foreground/70" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {meta?.label ?? group.resource}
            </p>
            <p className="text-xs text-muted-foreground truncate hidden sm:block">
              {meta?.description}
            </p>
          </div>
        </div>

        {/* Right: count badge + chevron */}
        <div className="flex items-center gap-2 shrink-0 ml-3">
          {disabled ? (
            <Badge className="text-[10px] bg-primary/10 text-primary border border-primary/20">
              Full Access
            </Badge>
          ) : enabled === total ? (
            <Badge className="text-[10px] bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300">
              All on
            </Badge>
          ) : enabled === 0 ? (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              All off
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] font-mono">
              {enabled}/{total}
            </Badge>
          )}
          {expanded
            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" />
          }
        </div>
      </button>

      {/* ── Column headers (only when expanded) ── */}
      {expanded && (
        <>
          {/* Column header row */}
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-2 bg-muted/20 border-t border-border/40">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              Permission
            </p>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              Scope
            </p>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              Enabled
            </p>
          </div>

          {/* Permission rows */}
          <div className="bg-background">
            {group.permissions.map((perm, i) => (
              <PermTableRow
                key={perm.permission_id}
                perm={perm}
                disabled={disabled}
                onToggle={onToggle}
                isLast={i === group.permissions.length - 1}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border overflow-hidden border-l-4 border-l-muted">
          <div className="flex items-center gap-3 px-4 py-3.5 bg-muted/30">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
          <div className="bg-background divide-y divide-border/50">
            {[1, 2, 3].map((j) => (
              <div key={j} className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3.5">
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-36" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-5 w-9 rounded" />
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RolePermissionsPanel — exported component
// ─────────────────────────────────────────────────────────────────────────────
export function RolePermissionsPanel() {
  const [activeRoleId, setActiveRoleId] = useState<number>(ROLE_TABS[0].id);
  const { data, isLoading, error } = useRolePermissions(activeRoleId);
  const { mutate: toggle, isPending } = useTogglePermissions(activeRoleId);

  const handleToggle = useCallback(
    (permissionId: number, enabled: boolean) => {
      toggle([{ permission_id: permissionId, is_enabled: enabled }]);
    },
    [toggle],
  );

  // Aggregate totals for the summary bar
  const totalEnabled = data?.resources.flatMap((r) => r.permissions).filter((p) => p.is_enabled).length ?? 0;
  const totalPerms = data?.resources.flatMap((r) => r.permissions).length ?? 0;

  return (
    <div className="space-y-5">

      {/* ── Role tab selector ── */}
      <Tabs value={String(activeRoleId)} onValueChange={(v) => setActiveRoleId(Number(v))}>
        <TabsList className="h-auto p-1 gap-0.5 flex flex-wrap w-full sm:w-auto">
          {ROLE_TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={String(tab.id)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-md data-[state=active]:shadow-sm"
            >
              <Users2 className="h-3.5 w-3.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* ── Role info bar ── */}
      {data && !isLoading && (
        <div className="flex items-center justify-between flex-wrap gap-2 rounded-lg border bg-muted/30 px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Editing</span>
            <span className="font-semibold text-foreground">{data.role_name}</span>
            <span className="text-muted-foreground">permissions</span>
          </div>
          <div className="flex items-center gap-2">
            {isPending && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse inline-block" />
                Saving…
              </span>
            )}
            <Badge variant="outline" className="text-xs font-mono">
              {totalEnabled} / {totalPerms} enabled
            </Badge>
          </div>
        </div>
      )}

      <Separator />

      {/* ── Content ── */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3.5">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-destructive">Failed to load permissions</p>
            <p className="text-xs text-muted-foreground mt-0.5">Check your connection or reload the page.</p>
          </div>
        </div>
      ) : data ? (
        <div className="space-y-3">
          {data.resources.map((group) => (
            <ResourceSection
              key={group.resource}
              group={group}
              disabled={false}
              onToggle={handleToggle}
            />
          ))}
        </div>
      ) : null}

      {/* ── Scope legend ── */}
      {data && !isLoading && (
        <div className="rounded-xl border bg-muted/20 px-4 py-3 space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Scope Reference
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-1.5">
            {(["own", "team", "all"] as const).map((scope) => (
              <div key={scope} className="flex items-center gap-2 text-xs text-muted-foreground">
                <ScopePill scope={scope} />
                <span>
                  {scope === "own"  && "Actor can only act on their own records"}
                  {scope === "team" && "Actor can act on records of employees they manage"}
                  {scope === "all"  && "Actor can act on any record in the system"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
