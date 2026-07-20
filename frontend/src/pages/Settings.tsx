import { NavLink, Outlet, Navigate, useLocation } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useMyPermissions } from "@/hooks/usePermissions";
import { canAccessMenuItem, SETTINGS_NAV_ITEMS } from "@/lib/pagePermissions";

export default function Settings() {
  const { pathname } = useLocation();
  const { currentUser } = useAuth();
  const { data: permissionData } = useMyPermissions();

  const visibleNavItems = SETTINGS_NAV_ITEMS.filter((item) =>
    canAccessMenuItem(item, {
      currentUserRole: currentUser?.role,
      resources: permissionData?.resources,
    }),
  );

  // Redirect /settings → first visible settings page or fallback to company settings.
  if (pathname === "/settings" || pathname === "/settings/") {
    const redirectTo = visibleNavItems[0]?.url ?? "/settings/company";
    return <Navigate to={redirectTo} replace />;
  }

  // Resolve the active nav item to drive the right-side header
  const activeItem = visibleNavItems.find((item) => pathname.startsWith(item.url));

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
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.url);
            return (
              <NavLink
                key={item.url}
                to={item.url}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label ?? item.title}
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
