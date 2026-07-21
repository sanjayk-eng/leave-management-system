/**
 * RolePermissionsPanel
 * Enterprise RBAC editor — flat, minimal, table-based.
 *
 * Batch-save flow:
 *  - Switches update local draft state only (no API call per toggle)
 *  - "Save changes" button sends all dirty permissions in one PATCH call
 *  - "Discard" resets draft back to server state
 */

import { useState, useCallback, useMemo } from "react";
import { ChevronRight, ChevronDown, Info, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { useRolePermissions, useTogglePermissions } from "@/hooks/usePermissions";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { authService, type RoleEntry } from "@/services/authService";
import { useAuth } from "@/hooks/useAuth";
import type { PermissionRow, ResourceGroup } from "@/services/permissionService";
import { cn } from "@/lib/utils";

// ─── Resource label map ───────────────────────────────────────────────────────
const RESOURCE_LABEL: Record<string, string> = {
  employee:      "Employee Management",
  leave:         "Leave Management",
  leave_balance: "Leave Balance",
  leave_report:  "Leave Reports",
  payroll:       "Payroll",
  settings:      "Settings",
  designation:   "Designations",
  equipment:     "Equipment & Assets",
  asses:         "Equipment & Assets",
  asset:         "Equipment & Assets",
  permission:    "Permissions",
};

function resourceLabel(key: string): string {
  return (
    RESOURCE_LABEL[key] ??
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

// ─── Scope badge ──────────────────────────────────────────────────────────────
const SCOPE_LABEL: Record<string, string> = {
  own: "Own", team: "Team", all: "All",
};

function ScopeBadge({ scope }: { scope: string }) {
  return (
    <span className="text-xs text-muted-foreground">
      {SCOPE_LABEL[scope] ?? scope}
    </span>
  );
}

// ─── Shared grid columns ──────────────────────────────────────────────────────
// 1fr = permission label | 96px = scope | 88px = enabled toggle
const GRID_COLS = "grid-cols-[1fr_96px_88px]";

// ─── Permission row ───────────────────────────────────────────────────────────
interface PermissionRowProps {
  perm: PermissionRow;
  /** local draft override — undefined means use perm.is_enabled */
  draftEnabled: boolean | undefined;
  onToggle: (id: number, enabled: boolean) => void;
}

function PermissionRow({ perm, draftEnabled, onToggle }: PermissionRowProps) {
  const checked  = draftEnabled ?? perm.is_enabled;
  const isDirty  = draftEnabled !== undefined && draftEnabled !== perm.is_enabled;

  return (
    <div className={cn(
      "grid border-b border-border last:border-0 hover:bg-muted/40",
      GRID_COLS,
      isDirty && "bg-muted/20",
    )}>
      {/* Label + description */}
      <div className="py-2.5 pl-4 pr-2 flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "text-sm",
            isDirty ? "text-foreground font-medium" : "text-foreground",
          )}>
            {perm.label}
          </span>

          {isDirty && (
            <span className="text-[10px] text-muted-foreground">
              (unsaved)
            </span>
          )}

          {perm.require_seniority && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label="Seniority required"
                    className="text-amber-400 hover:text-amber-500 outline-none"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  ⚠ Requires higher seniority than target
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {perm.description && (
          <span className="text-xs text-muted-foreground leading-snug">
            {perm.description}
          </span>
        )}
      </div>

      {/* Scope */}
      <div className="py-2.5 px-4 flex items-start justify-center">
        <ScopeBadge scope={perm.scope} />
      </div>

      {/* Switch — small, gray */}
      <div className="py-2.5 px-4 flex items-start justify-center">
        <Switch
          checked={checked}
          onCheckedChange={(val) => onToggle(perm.permission_id, val)}
          aria-label={perm.label}
          className="h-4 w-7 data-[state=checked]:bg-zinc-900 data-[state=unchecked]:bg-zinc-300 dark:data-[state=checked]:bg-zinc-100 dark:data-[state=unchecked]:bg-zinc-600 [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-3"
        />
      </div>
    </div>
  );
}

// ─── Resource block ───────────────────────────────────────────────────────────
interface ResourceBlockProps {
  group: ResourceGroup;
  /** map of permission_id → draft is_enabled (only dirty entries) */
  drafts: Map<number, boolean>;
  onToggle: (id: number, enabled: boolean) => void;
}

function ResourceBlock({ group, drafts, onToggle }: ResourceBlockProps) {
  const [open, setOpen] = useState(false);

  const total   = group.permissions.length;
  const enabled = group.permissions.filter((p) => {
    const draft = drafts.get(p.permission_id);
    return draft !== undefined ? draft : p.is_enabled;
  }).length;
  const allOn  = enabled === total;

  return (
    <div className="border border-border rounded-md overflow-hidden">

      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors bg-background"
      >
        {open
          ? <ChevronDown  className="h-4 w-4 shrink-0 text-muted-foreground" />
          : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        }
        <span className="text-sm font-medium text-foreground">
          {resourceLabel(group.resource)}
        </span>
        <span className="text-xs text-muted-foreground font-normal">
          {enabled === 0 ? "None enabled" : allOn ? "All enabled" : `${enabled} / ${total}`}
        </span>
      </button>

      {/* Permission grid */}
      {open && (
        <div className="border-t border-border">
          {/* Header row — same GRID_COLS as data rows */}
          <div className={cn("grid bg-muted/50 border-b border-border", GRID_COLS)}>
            <div className="py-2 pl-4 pr-2 text-xs font-medium text-muted-foreground">
              Permission
            </div>
            <div className="py-2 px-4 text-xs font-medium text-muted-foreground text-center whitespace-nowrap">
              Scope
            </div>
            <div className="py-2 px-4 text-xs font-medium text-muted-foreground text-center whitespace-nowrap">
              Enabled
            </div>
          </div>

          {/* Data rows */}
          <div>
            {group.permissions.map((perm) => (
              <PermissionRow
                key={perm.permission_id}
                perm={perm}
                draftEnabled={drafts.get(perm.permission_id)}
                onToggle={onToggle}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="border border-border rounded-md px-3 py-2.5 flex items-center gap-3">
          <Skeleton className="h-4 w-4 rounded-sm" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-16 ml-auto" />
        </div>
      ))}
    </div>
  );
}

// ─── Role selector ────────────────────────────────────────────────────────────
function RoleSelector({
  roles,
  activeId,
  onChange,
}: {
  roles: RoleEntry[];
  activeId: number;
  onChange: (id: number) => void;
}) {
  return (
    <div className="flex items-center border border-border rounded-md overflow-hidden w-fit">
      {roles.map((role) => (
        <button
          key={role.id}
          type="button"
          onClick={() => onChange(role.id)}
          className={cn(
            "px-4 py-1.5 text-sm font-medium transition-colors",
            "border-r border-border last:border-r-0",
            activeId === role.id
              ? "bg-foreground text-background"
              : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {role.type.charAt(0) + role.type.slice(1).toLowerCase()}
        </button>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function RolePermissionsPanel() {
  const { currentUser } = useAuth();

  // ── Fetch all roles with priority from API ──────────────────────────────────
  const { data: rolesData, isLoading: isLoadingRoles } = useQuery({
    queryKey: ["roles"],
    queryFn: () => authService.getRoles(),
    staleTime: 10 * 60 * 1000,
  });

  // ── Filter to only roles strictly below the current user's priority ──────────
  // SUPERADMIN sees all; others see only what they outrank.
  const manageableRoles = useMemo<RoleEntry[]>(() => {
    if (!rolesData?.data || !currentUser) return [];
    const callerRole = rolesData.data.find((r) => r.type === currentUser.role);
    if (!callerRole) return [];
    return rolesData.data
      .filter((r) => r.priority < callerRole.priority)
      .sort((a, b) => b.priority - a.priority); // highest first in tabs
  }, [rolesData, currentUser]);

  const [activeRoleId, setActiveRoleId] = useState<number>(0);

  // Auto-select first available tab once roles are loaded
  const resolvedActiveId = activeRoleId > 0
    ? activeRoleId
    : (manageableRoles[0]?.id ?? 0);

  const { data, isLoading, error, refetch } = useRolePermissions(resolvedActiveId);
  const { mutate: toggle, isPending } = useTogglePermissions(resolvedActiveId);

  // Draft overrides: permission_id → new is_enabled value
  // Only contains entries that differ from server state
  const [drafts, setDrafts] = useState<Map<number, boolean>>(new Map());

  const hasDrafts = drafts.size > 0;

  // ── Permission dependency rules ──────────────────────────────────────────
  // Rule 1: Enabling any non-read action → also force-enable "read" in that resource
  // Rule 2: Disabling "read" → also force-disable ALL other permissions in that resource
  const handleToggle = useCallback((permissionId: number, enabled: boolean) => {
    if (!data) return;

    // Find which resource group this permission belongs to
    const group = data.resources.find((g) =>
      g.permissions.some((p) => p.permission_id === permissionId),
    );
    if (!group) return;

    const toggled = group.permissions.find((p) => p.permission_id === permissionId);
    if (!toggled) return;

    const updates = new Map<number, boolean>();
    updates.set(permissionId, enabled);

    if (enabled && toggled.action !== "read") {
      // Rule 1 — enabling any action requires read to also be on
      const readPerm = group.permissions.find((p) => p.action === "read");
      if (readPerm) {
        const readCurrently = drafts.get(readPerm.permission_id) ?? readPerm.is_enabled;
        if (!readCurrently) {
          updates.set(readPerm.permission_id, true);
        }
      }
    }

    if (!enabled && toggled.action === "read") {
      // Rule 2 — disabling read disables everything else in the resource
      for (const p of group.permissions) {
        if (p.permission_id !== permissionId) {
          updates.set(p.permission_id, false);
        }
      }
    }

    setDrafts((prev) => {
      const next = new Map(prev);
      for (const [id, val] of updates) {
        next.set(id, val);
      }
      return next;
    });
  }, [data, drafts]);

  // Save — batch all dirty entries in one API call
  const handleSave = useCallback(() => {
    if (drafts.size === 0) return;
    const payload = Array.from(drafts.entries()).map(([permission_id, is_enabled]) => ({
      permission_id,
      is_enabled,
    }));
    toggle(payload, {
      onSuccess: () => setDrafts(new Map()),
    });
  }, [drafts, toggle]);

  // Discard — clear all drafts
  const handleDiscard = useCallback(() => {
    setDrafts(new Map());
  }, []);

  // Switch role tab — clear pending drafts first
  const handleRoleChange = useCallback((id: number) => {
    setDrafts(new Map());
    setActiveRoleId(id);
  }, []);

  const totalEnabled = useMemo(() => {
    if (!data) return 0;
    return data.resources.flatMap((r) => r.permissions).filter((p) => {
      const draft = drafts.get(p.permission_id);
      return draft !== undefined ? draft : p.is_enabled;
    }).length;
  }, [data, drafts]);

  const totalPerms = data?.resources.flatMap((r) => r.permissions).length ?? 0;
  const activeRole = manageableRoles.find((r) => r.id === resolvedActiveId);

  // ── Loading roles ──────────────────────────────────────────────────────────
  if (isLoadingRoles) {
    return (
      <div className="flex items-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading roles…</span>
      </div>
    );
  }

  if (manageableRoles.length === 0) {
    return (
      <p className="py-8 text-sm text-muted-foreground">
        No roles available to manage.
      </p>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <RoleSelector roles={manageableRoles} activeId={resolvedActiveId} onChange={handleRoleChange} />

        <div className="flex items-center gap-2">

          {/* Status text */}
          {data && !isLoading && (
            <span className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{activeRole?.type}</span>
              {" — "}
              {totalEnabled} / {totalPerms} enabled
            </span>
          )}

          {/* Saving indicator */}
          {isPending && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Saving…
            </span>
          )}

          {/* Discard + Save — only when dirty */}
          {hasDrafts && !isPending && (
            <>
              <button
                type="button"
                onClick={handleDiscard}
                className="px-3 py-1.5 text-sm text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-3 py-1.5 text-sm font-medium bg-foreground text-background rounded-md hover:opacity-90 transition-opacity"
              >
                Save {drafts.size} change{drafts.size !== 1 ? "s" : ""}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-border" />

      {/* ── Content ── */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorDisplay error={error} onRetry={refetch} />
      ) : data ? (
        <div className="space-y-3">
          {data.resources.map((group) => (
            <ResourceBlock
              key={group.resource}
              group={group}
              drafts={drafts}
              onToggle={handleToggle}
            />
          ))}
        </div>
      ) : null}

      {/* ── Scope legend ── */}
      {data && !isLoading && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 pt-1 text-xs text-muted-foreground border-t border-border">
          <span className="font-medium text-foreground">Scope:</span>
          <span><strong className="text-foreground">Own</strong> — own records only</span>
          <span><strong className="text-foreground">Team</strong> — records of managed employees</span>
          <span><strong className="text-foreground">All</strong> — any record in the system</span>
        </div>
      )}
    </div>
  );
}
