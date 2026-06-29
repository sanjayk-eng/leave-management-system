import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate } from "@/lib/dateUtils";
import { useQuery } from "@tanstack/react-query";
import { employeeService } from "@/services";
import { Search, Users, Mail, Briefcase, Calendar, User } from "lucide-react";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

const MyTeam = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: teamMembers = [], isLoading } = useQuery({
    queryKey: ['myTeam'],
    queryFn: () => employeeService.getMyTeam(),
  });

  const filteredTeam = (teamMembers && Array.isArray(teamMembers)) 
    ? teamMembers.filter(member =>
        member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      SUPERADMIN: "bg-purple-500 text-white",
      ADMIN: "bg-blue-500 text-white",
      MANAGER: "bg-green-500 text-white",
      EMPLOYEE: "bg-gray-500 text-white",
      HR: "bg-orange-500 text-white",
      INTERN: "bg-teal-500 text-white",
    };
    return colors[role as keyof typeof colors] || colors.EMPLOYEE;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          My Team
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          View and manage your team members
        </p>
      </div>

      {/* Stats Card */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-3 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg">Team Overview</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Total team members under your management</CardDescription>
            </div>
            <div className="text-3xl sm:text-4xl font-bold text-primary">
              {teamMembers?.length || 0}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Search and Team List */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Team Members</CardTitle>
          <CardDescription className="text-xs sm:text-sm">View your team member details</CardDescription>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search team members..."
              className="pl-9 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {isLoading ? (
            <TableSkeleton rows={5} columns={4} showActions={false} />
          ) : filteredTeam.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground font-medium">
                {searchQuery ? 'No team members found matching your search' : 'No team members assigned yet'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {filteredTeam.map((member) => (
                <Card 
                  key={member.id} 
                  className="overflow-hidden hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50"
                >
                  <CardHeader className="pb-3 bg-gradient-to-br from-primary/5 to-primary/10 p-4 sm:p-6">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-2 border-primary/20 shadow-md">
                        <AvatarFallback className="bg-primary text-primary-foreground font-bold text-base sm:text-lg">
                          {getInitials(member.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base sm:text-lg truncate">{member.full_name}</h3>
                        <Badge className={`${getRoleBadgeColor(member.role)} mt-1 text-[10px] sm:text-xs`}>
                          {member.role}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 space-y-3">
                    {/* Email */}
                    <div className="flex items-start gap-3 p-2 sm:p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-0.5">
                          Email
                        </p>
                        <p className="text-xs sm:text-sm font-medium truncate" title={member.email}>
                          {member.email}
                        </p>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-3 p-2 sm:p-3 bg-muted/50 rounded-lg">
                      <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-[10px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-0.5">
                          Status
                        </p>
                        <Badge 
                          className={`${
                            member.status === 'active' 
                              ? 'bg-green-500 text-white' 
                              : 'bg-gray-500 text-white'
                          } text-[10px] sm:text-xs`}
                        >
                          {member.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Joining Date */}
                    <div className="flex items-center gap-3 p-2 sm:p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-[10px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-0.5">
                          Joined
                        </p>
                        <p className="text-xs sm:text-sm font-medium">
                          {formatDate(member.joining_date)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyTeam;
