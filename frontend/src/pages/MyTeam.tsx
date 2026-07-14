import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { employeeService } from "@/services";
import { getCurrentUser, ApiError } from "@/lib/api";
import { useDebounce } from "@/hooks/useDebounce";
import { SortableTableHead } from "@/components/equipment/shared";
import { ServerPagination } from "@/components/ServerPagination";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import {
  Search,
  Users,
  Mail,
  Calendar,
  Briefcase,
  Loader2,
  Cake,
  IndianRupee,
} from "lucide-react";

// ── Role badge colours ────────────────────────────────────────────────────────
const roleBadgeClass: Record<string, string> = {
  SUPERADMIN: "bg-primary text-primary-foreground",
  ADMIN:      "bg-secondary text-secondary-foreground",
  MANAGER:    "bg-warning text-warning-foreground",
  EMPLOYEE:   "bg-muted text-muted-foreground",
  HR:         "bg-info text-info-foreground",
  INTERN:     "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
};

function formatDate(iso?: string | null) {
  if (!iso) return <span className="text-muted-foreground italic">—</span>;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const AVATAR_COLOURS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500",  "bg-sky-500",   "bg-orange-500",  "bg-indigo-500",
];
function avatarColour(index: number) {
  return AVATAR_COLOURS[index % AVATAR_COLOURS.length];
}

// ── Sortable columns (mirrors /employee API sort_by values) ───────────────────
type SortCol = 'name' | 'email' | 'role' | 'salary' | 'joining_date' | 'birth_date' | 'status';

// ─────────────────────────────────────────────────────────────────────────────

const MyTeam = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  const [sortBy,      setSortBy]      = useState<SortCol | "">("");
  const [sortDir,     setSortDir]     = useState<"asc" | "desc">("asc");

  // Debounce the search — fires API only after 500 ms of no typing
  const debouncedSearch = useDebounce(searchQuery, 500);

  const currentUser = getCurrentUser();

  // Unified sort handler — same pattern as Employees page
  const handleSort = useCallback((col: string) => {
    const c = col as SortCol;
    setSortBy(prev => {
      if (prev === c) {
        setSortDir(d => d === "asc" ? "desc" : "asc");
        return prev;
      }
      setSortDir("asc");
      return c;
    });
    setCurrentPage(1);
  }, []);

  // Step 1 — fetch current user's profile to get full_name (needed as manager filter)
  const { data: myProfile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ["employeeProfile", currentUser?.id],
    queryFn:  () => employeeService.getById(currentUser!.id),
    enabled:  !!currentUser?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Step 2 — server-side paginated + sorted fetch of direct reports
  const { data: teamData, isLoading: teamLoading, isFetching, error: teamError } = useQuery({
    queryKey: ["myTeam", myProfile?.full_name, currentPage, pageSize, debouncedSearch, sortBy, sortDir],
    queryFn:  () =>
      employeeService.getAll({
        manager:    myProfile!.full_name,
        page:       currentPage,
        page_size:  pageSize,
        search:     debouncedSearch || undefined,
        sort_by:    sortBy || undefined,
        sort_order: sortBy ? sortDir : undefined,
      }),
    enabled:         !!myProfile?.full_name,
    staleTime:       3 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const fetchError    = (profileError ?? teamError) as Error | null;
  const isAccessDenied = fetchError instanceof ApiError && (fetchError.status === 403 || fetchError.status === 401);

  const showSkeleton  = profileLoading || (teamLoading && !teamData);
  const isSoftLoading = isFetching && !teamLoading;

  const members    = teamData?.employees   ?? [];
  const totalCount = teamData?.total_count ?? 0;
  const totalPages = teamData?.total_pages ?? 0;

  const isTyping = searchQuery !== debouncedSearch;

  const activeCount   = members.filter((m) => m.status === "active").length;
  const inactiveCount = members.filter((m) => m.status !== "active").length;

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // shared props for SortableTableHead
  const sh = { sortBy: sortBy as string, sortDir, onSort: handleSort };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Page header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">My Team</h1>
          <p className="text-sm text-muted-foreground">
            Direct reports under your management
          </p>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCount}</p>
              <p className="text-xs text-muted-foreground">Total Members</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Active (this page)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-muted-foreground">{inactiveCount}</p>
              <p className="text-xs text-muted-foreground">Inactive (this page)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Table card ── */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>All employees reporting directly to you</CardDescription>

          {/* Search — hidden when access is denied */}
          {!isAccessDenied && (
            <div className="relative mt-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, role or designation…"
                className="pl-9 pr-9"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
              {(isTyping || isFetching) && (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          )}

          {/* Active filter chip */}
          {searchQuery && !isAccessDenied && (
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Showing</span>
              <Badge variant="secondary">
                {totalCount} result{totalCount !== 1 ? "s" : ""}
              </Badge>
              <span className="text-muted-foreground">for "{searchQuery}"</span>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {showSkeleton ? (
            <TableSkeleton rows={pageSize} columns={8} showActions={false} />
          ) : fetchError ? (
            <ErrorDisplay
              error={fetchError}
              onRetry={isAccessDenied ? undefined : () => window.location.reload()}
            />
          ) : (
            <>
              <div
                className={`rounded-lg border overflow-x-auto transition-opacity duration-150 ${
                  isSoftLoading ? "opacity-60 pointer-events-none" : "opacity-100"
                }`}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead column="name"         label="Employee"    {...sh} className="min-w-[200px]" />
                      <SortableTableHead column="email"        label="Email"       {...sh} className="min-w-[200px] hidden sm:table-cell" />
                      <SortableTableHead column="role"         label="Role"        {...sh} className="min-w-[120px]" />
                      <TableHead className="min-w-[160px] hidden md:table-cell">Designation</TableHead>
                      <SortableTableHead column="salary"       label="Salary"      {...sh} className="min-w-[110px] hidden md:table-cell" />
                      <SortableTableHead column="joining_date" label="Joined"      {...sh} className="min-w-[130px] hidden lg:table-cell" />
                      <SortableTableHead column="birth_date"   label="Birthday"    {...sh} className="min-w-[130px] hidden xl:table-cell" />
                      <SortableTableHead column="status"       label="Status"      {...sh} className="min-w-[90px]" />
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {members.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-12 text-center">
                          <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                          <p className="font-medium text-muted-foreground">
                            {searchQuery
                              ? "No team members match your search"
                              : "No team members assigned yet"}
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      members.map((member, idx) => (
                        <TableRow key={member.id}>
                          {/* Name + avatar */}
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 shrink-0">
                                <AvatarFallback
                                  className={`${avatarColour(idx)} text-white text-xs font-bold`}
                                >
                                  {getInitials(member.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium leading-tight">
                                {member.full_name}
                              </span>
                            </div>
                          </TableCell>

                          {/* Email */}
                          <TableCell className="hidden sm:table-cell">
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Mail className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate max-w-[180px]" title={member.email}>
                                {member.email}
                              </span>
                            </div>
                          </TableCell>

                          {/* Role */}
                          <TableCell>
                            <Badge className={roleBadgeClass[member.role] ?? roleBadgeClass.EMPLOYEE}>
                              {member.role}
                            </Badge>
                          </TableCell>

                          {/* Designation */}
                          <TableCell className="hidden md:table-cell">
                            {member.designation_name ? (
                              <div className="flex items-center gap-1.5 text-sm">
                                <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                {member.designation_name}
                              </div>
                            ) : (
                              <span className="italic text-muted-foreground text-sm">Not Assigned</span>
                            )}
                          </TableCell>

                          {/* Salary */}
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-1 text-sm">
                              <IndianRupee className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              {(member.salary || 0).toLocaleString("en-IN")}
                            </div>
                          </TableCell>

                          {/* Joining date */}
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5 shrink-0" />
                              {formatDate(member.joining_date)}
                            </div>
                          </TableCell>

                          {/* Birthday */}
                          <TableCell className="hidden xl:table-cell">
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Cake className="h-3.5 w-3.5 shrink-0" />
                              {formatDate(member.birth_date)}
                            </div>
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            <Badge
                              className={
                                member.status === "active"
                                  ? "bg-success text-success-foreground"
                                  : "bg-muted text-muted-foreground"
                              }
                            >
                              {member.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* ── Pagination ── */}
              <ServerPagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={totalCount}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
                itemName="members"
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyTeam;
