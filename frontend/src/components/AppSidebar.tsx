import { useMemo } from 'react';
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
  BarChart3,
  Sun,
  Moon,
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
import { useMyPermissions } from "@/hooks/usePermissions";
import {
  PAGE_MENU_ITEMS,
  canAccessMenuItem,
} from "@/lib/pagePermissions";
import { useTheme } from "@/contexts/ThemeProvider";

export function AppSidebar() {
  const { state } = useSidebar();
  const { currentUser, logout, isLoggingOut } = useAuth();
  const { data: permissionData } = useMyPermissions();
  const { resolvedTheme, toggleTheme } = useTheme();

  const visibleItems = useMemo(
    () =>
      currentUser
        ? PAGE_MENU_ITEMS.filter((item) =>
            canAccessMenuItem(item, {
              currentUserRole: currentUser.role,
              resources: permissionData?.resources,
            }),
          )
        : [],
    [currentUser, permissionData?.resources],
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
              {visibleItems.map((item) => (
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

      <SidebarFooter className="border-t border-sidebar-border p-3 space-y-1">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent transition-colors duration-200"
          onClick={toggleTheme}
        >
          {resolvedTheme === "dark" ? (
            <Sun className="h-4 w-4 shrink-0" />
          ) : (
            <Moon className="h-4 w-4 shrink-0" />
          )}
          {!isCollapsed && (
            <span className="ml-2">
              {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
            </span>
          )}
        </Button>

        {/* Logout */}
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent transition-colors duration-200"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!isCollapsed && (
            <span className="ml-2">
              {isLoggingOut ? "Logging out…" : "Logout"}
            </span>
          )}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
