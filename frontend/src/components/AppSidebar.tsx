import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  ClipboardList, 
  DollarSign, 
  FileText, 
  Settings,
  LogOut,
  Briefcase,
  Activity,
  Package,
  History,
  Sun,
  BarChart3
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: ['SUPERADMIN', 'ADMIN', 'HR', 'MANAGER', 'EMPLOYEE', 'INTERN'] },
  { title: "Employees", url: "/employees", icon: Users, roles: ['SUPERADMIN', 'ADMIN', 'HR'] },
  { title: "My Team", url: "/my-team", icon: Users, roles: ['MANAGER'] },
  { title: "Designations", url: "/designations", icon: Briefcase, roles: ['SUPERADMIN', 'ADMIN'] },
  { title: "Assets", url: "/equipment", icon: Package, roles: ['SUPERADMIN', 'ADMIN'] },
  { title: "Apply Leave", url: "/apply-leave", icon: Calendar, roles: ['SUPERADMIN', 'ADMIN', 'HR', 'MANAGER', 'EMPLOYEE', 'INTERN'] },
  { title: "My Leave History", url: "/my-leave-history", icon: History, roles: ['SUPERADMIN', 'ADMIN', 'HR', 'MANAGER', 'EMPLOYEE', 'INTERN'] },
  { title: "Leave Approvals", url: "/approvals", icon: ClipboardList, roles: ['SUPERADMIN', 'ADMIN', 'HR', 'MANAGER'] },
  { title: "Leave Calendar", url: "/calendar", icon: Calendar, roles: ['SUPERADMIN', 'ADMIN', 'HR', 'MANAGER', 'EMPLOYEE', 'INTERN'] },
  { title: "Holidays", url: "/holidays", icon: Sun, roles: ['SUPERADMIN', 'ADMIN', 'HR'] },
  { title: "Payroll", url: "/payroll", icon: DollarSign, roles: ['SUPERADMIN', 'ADMIN'] },
  { title: "Payslips", url: "/payslips", icon: FileText, roles: ['SUPERADMIN', 'ADMIN', 'HR', 'MANAGER', 'EMPLOYEE', 'INTERN'] },
  { title: "System Logs", url: "/logs", icon: Activity, roles: ['SUPERADMIN'] },
  { title: "Leave Report", url: "/leave-monthly-report", icon: BarChart3, roles: ['SUPERADMIN', 'ADMIN', 'HR', 'MANAGER', 'EMPLOYEE', 'INTERN'] },
  { title: "Settings", url: "/settings", icon: Settings, roles: ['SUPERADMIN', 'ADMIN'] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { currentUser, logout, isLoggingOut } = useAuth();
  
  // Only show menu items that the user has access to
  const filteredItems = menuItems.filter(item => 
    currentUser && item.roles.includes(currentUser.role)
  );

  const handleLogout = () => {
    logout();
  };

  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        {isCollapsed ? (
          <a href="/dashboard" className="flex justify-center group">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <LayoutDashboard className="h-5 w-5 text-primary" />
            </div>
          </a>
        ) : (
          <a href="/dashboard" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <LayoutDashboard className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-sidebar-foreground group-hover:text-primary transition-colors">
                HR System
              </h2>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {currentUser?.email || 'User'}
              </p>
            </div>
          </a>
        )}
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-sidebar-accent transition-colors duration-200"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent transition-colors duration-200"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && (
            <span className="ml-2">
              {isLoggingOut ? "Logging out..." : "Logout"}
            </span>
          )}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
