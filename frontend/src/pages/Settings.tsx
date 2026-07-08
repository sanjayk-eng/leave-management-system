import { NavLink, Outlet, Navigate, useLocation } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Building2, FileText, Clock, GitMerge, Cake, Shield,
} from "lucide-react";


// ─── Nav item definitions ─────────────────────────────────────────────────────
// Each item drives: left-nav link, right-side header (title + description)
const NAV_ITEMS = [
  {
    to:          "/settings/company",
    label:       "Company",
    icon:        Building2,
    title:       "Company Settings",
    description: "Manage branding, working days, and general configuration",
  },
  {
    to:          "/settings/leave-policies",
    label:       "Leave Policies",
    icon:        FileText,
    title:       "Leave Policies",
    description: "Configure leave types, entitlements, and approval flows",
  },
  {
    to:          "/settings/leave-timing",
    label:       "Leave Timing",
    icon:        Clock,
    title:       "Leave Timing",
    description: "Set the time windows for first half, second half, and full day leave",
  },
  {
    to:          "/settings/approval-flow",
    label:       "Approval Flow",
    icon:        GitMerge,
    title:       "Approval Flow",
    description: "Define multi-stage approval chains for leave requests",
  },
  {
    to:          "/settings/birthday",
    label:       "Birthday",
    icon:        Cake,
    title:       "Birthday Settings",
    description: "Customize the birthday message template sent to employees",
  },
  {
    to:          "/settings/permissions",
    label:       "Permissions",
    icon:        Shield,
    title:       "Role Permissions",
    description: "Control what each role can do — toggle permissions on or off",
  },
] as const;

// ─── Settings layout ──────────────────────────────────────────────────────────
export default function Settings() {
  const { pathname } = useLocation();

  // Redirect /settings → /settings/company
  if (pathname === "/settings" || pathname === "/settings/") {
    return <Navigate to="/settings/company" replace />;
  }

  // Resolve the active nav item to drive the right-side header
  const activeItem = NAV_ITEMS.find((item) => pathname.startsWith(item.to));

  return (
    <div className="min-h-[calc(100vh-4rem)]">

      {/* ── Top page title ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your company configuration and access controls
        </p>
      </div>

      {/* ── Horizontal tab navigation ── */}
      <div className="border-b border-border mb-6">
        <nav className="flex gap-1 overflow-x-auto -mb-px">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* ── Content panel ── */}
      <div className="max-w-7xl">
        {/* Content area header — driven by active nav item */}
        {activeItem && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold tracking-tight">{activeItem.title}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{activeItem.description}</p>
            <Separator className="mt-4" />
          </div>
        )}

        {/* Sub-page outlet — renders only the form content, no own title */}
        <Outlet />
      </div>
    </div>
  );
}
