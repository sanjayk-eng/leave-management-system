import { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Search,
  X,
  CornerDownLeft,
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
  SETTINGS_NAV_ITEMS,
  canAccessMenuItem,
} from "@/lib/pagePermissions";
import { useTheme } from "@/contexts/ThemeProvider";

export function AppSidebar() {
  const { state } = useSidebar();
  const { currentUser, logout, isLoggingOut } = useAuth();
  const { data: permissionData } = useMyPermissions();
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

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

  const visibleSettingsItems = useMemo(
    () =>
      currentUser
        ? SETTINGS_NAV_ITEMS.filter((item) =>
            canAccessMenuItem(item, {
              currentUserRole: currentUser.role,
              resources: permissionData?.resources,
            }),
          )
        : [],
    [currentUser, permissionData?.resources],
  );

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visibleItems;

    const topLevel = visibleItems.filter((item) =>
      item.title.toLowerCase().includes(q),
    );

    const subLevel = visibleSettingsItems
      .filter((item) => item.title.toLowerCase().includes(q))
      .map((item) => ({ ...item, _parent: 'Settings' as const }));

    return [...topLevel, ...subLevel];
  }, [visibleItems, visibleSettingsItems, search]);

  // Navigate to first result on Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredItems.length > 0) {
      e.preventDefault();
      navigate(filteredItems[0].url);
      setSearch('');
      searchRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setSearch('');
      searchRef.current?.blur();
    }
  };

  const handleLogout = () => {
    logout();
  };

  const isCollapsed = state === 'collapsed';
  const isSearching = search.trim().length > 0;
  const topResult = isSearching && filteredItems.length > 0 ? filteredItems[0] : null;

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

          {/* Search bar */}
          {!isCollapsed && (
            <div className="px-2 pb-3 space-y-1.5">
              {/* Input row */}
              <div
                className={`
                  flex items-center gap-2 rounded-md px-2.5 h-9
                  border transition-all duration-200
                  ${searchFocused
                    ? 'border-primary/60 bg-sidebar-accent shadow-sm shadow-primary/10 ring-2 ring-primary/15'
                    : 'border-sidebar-border bg-sidebar-accent/40 hover:bg-sidebar-accent/70 hover:border-sidebar-border/80'
                  }
                `}
              >
                <Search
                  className={`h-3.5 w-3.5 shrink-0 transition-colors duration-200 ${
                    searchFocused ? 'text-primary' : 'text-sidebar-foreground/40'
                  }`}
                />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search pages…"
                  className="flex-1 bg-transparent text-sm text-sidebar-foreground placeholder:text-sidebar-foreground/35 outline-none min-w-0"
                />
                {isSearching ? (
                  <button
                    onMouseDown={(e) => e.preventDefault()} // keep focus on input
                    onClick={() => {
                      setSearch('');
                      searchRef.current?.focus();
                    }}
                    className="shrink-0 rounded-full p-0.5 text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-foreground/10 transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </div>

              {/* "Press Enter" hint showing the top match */}
              {topResult && (
                <div className="flex items-center justify-between rounded-md px-2 py-1 bg-primary/8 border border-primary/15">
                  <span className="text-[11px] text-sidebar-foreground/60 truncate max-w-[120px]">
                    → <span className="font-medium text-sidebar-foreground/80">{topResult.title}</span>
                  </span>
                  <span className="flex items-center gap-0.5 shrink-0 text-[10px] text-sidebar-foreground/40 font-mono">
                    <CornerDownLeft className="h-2.5 w-2.5" />
                    Enter
                  </span>
                </div>
              )}

              {/* Result count */}
              {isSearching && (
                <p className="px-1 text-[11px] text-sidebar-foreground/40">
                  {filteredItems.length === 0
                    ? 'No results'
                    : `${filteredItems.length} result${filteredItems.length !== 1 ? 's' : ''}`}
                </p>
              )}
            </div>
          )}

          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item, index) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      onClick={() => setSearch('')}
                      className={`hover:bg-sidebar-accent transition-colors duration-200 ${
                        // highlight the top result while searching
                        isSearching && index === 0
                          ? 'ring-1 ring-inset ring-primary/25 bg-primary/5'
                          : ''
                      }`}
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!isCollapsed && (
                        <span className="flex flex-col leading-tight min-w-0">
                          <span className="truncate">{item.title}</span>
                          {'_parent' in item && (
                            <span className="text-[10px] text-sidebar-foreground/45 font-normal">
                              {item._parent} ›
                            </span>
                          )}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Empty state */}
              {!isCollapsed && isSearching && filteredItems.length === 0 && (
                <li className="flex flex-col items-center gap-1.5 py-6 px-2 text-center">
                  <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center">
                    <Search className="h-4 w-4 text-sidebar-foreground/30" />
                  </div>
                  <p className="text-xs text-sidebar-foreground/50 font-medium">No pages found</p>
                  <p className="text-[11px] text-sidebar-foreground/35">Try a different keyword</p>
                </li>
              )}
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
