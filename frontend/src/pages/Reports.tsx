/**
 * Reports shell — mirrors the Settings layout pattern.
 * Renders a horizontal tab bar and an <Outlet> for sub-pages.
 * Adding a new report = add a nav item here + a route in App.tsx.
 */
import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { BarChart3, FileBarChart2 } from 'lucide-react';

interface ReportTab {
  title: string;
  url: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  description: string;
}

const REPORT_TABS: ReportTab[] = [
  {
    title: 'Leave Report',
    url: '/reports/leave',
    icon: BarChart3,
    description: 'Monthly, yearly, or range leave summary per employee',
  },
  {
    title: 'Policy Report',
    url: '/reports/policy',
    icon: FileBarChart2,
    description: 'Per-employee breakdown by each leave policy',
  },
];

export default function Reports() {
  const { pathname } = useLocation();

  // Redirect /reports → first tab
  if (pathname === '/reports' || pathname === '/reports/') {
    return <Navigate to={REPORT_TABS[0].url} replace />;
  }

  const activeTab = REPORT_TABS.find((t) => pathname.startsWith(t.url));

  return (
    <div className="min-h-[calc(100vh-4rem)]">

      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Leave analytics across different views and time windows
        </p>
      </div>

      {/* Horizontal tab bar */}
      <div className="border-b border-border mb-6">
        <nav className="flex gap-1 overflow-x-auto -mb-px">
          {REPORT_TABS.map((tab) => {
            const Icon   = tab.icon;
            const active = pathname.startsWith(tab.url);
            return (
              <NavLink
                key={tab.url}
                to={tab.url}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2',
                  active
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50',
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.title}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="max-w-7xl">
        {activeTab && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold tracking-tight">{activeTab.title}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{activeTab.description}</p>
            <Separator className="mt-4" />
          </div>
        )}
        <Outlet />
      </div>
    </div>
  );
}
