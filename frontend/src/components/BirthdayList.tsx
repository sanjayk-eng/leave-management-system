import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUpcomingBirthdays } from "@/hooks/useBirthday";
import { useAuth } from "@/hooks/useAuth";
import { Cake, Clock, Sparkles } from "lucide-react";
import type { UpcomingBirthdayEmployee } from "@/services/settingsService";

interface BirthdayListProps {
  /** "current_month" for leave calendar, undefined/omitted for upcoming 30 days */
  filterType?: string;
  title?: string;
  description?: string;
  /** Max height for the scroll area (default 320px) */
  maxHeight?: number;
}

const statusConfig: Record<string, { badge: string; label: string; icon: string; rowClass: string }> = {
  today: {
    badge: "bg-pink-500 text-white",
    label: "Today 🎉",
    icon: "🎂",
    rowClass:
      "bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 border border-pink-200 dark:border-pink-800",
  },
  upcoming: {
    badge: "bg-blue-500 text-white",
    label: "",
    icon: "🎈",
    rowClass: "",
  },
  past: {
    badge: "bg-muted text-muted-foreground",
    label: "Passed",
    icon: "📅",
    rowClass: "opacity-60",
  },
};

// normalise backend status (may be uppercase)
const normaliseStatus = (s: string) => s?.toLowerCase() as "today" | "upcoming" | "past";

function RemainingLabel({ emp }: { emp: UpcomingBirthdayEmployee }) {
  const status = normaliseStatus(emp.status);

  if (status === "past") {
    return <span className="text-xs text-muted-foreground">{emp.remaining_days}d ago</span>;
  }

  if (status === "today") {
    return (
      <span className="text-xs text-pink-600 dark:text-pink-400 font-medium flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {emp.remaining_hours}h {emp.remaining_minutes}m left today
      </span>
    );
  }

  // upcoming — show days + hours/minutes
  return (
    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
      <Clock className="h-3 w-3" />
      {emp.remaining_days}d {emp.remaining_hours}h {emp.remaining_minutes}m
    </span>
  );
}

function BirthdayRow({ emp, currentUserId }: { emp: UpcomingBirthdayEmployee; currentUserId?: string }) {
  const isMe = currentUserId === emp.id;
  const status = normaliseStatus(emp.status);
  const cfg = statusConfig[status] ?? statusConfig.upcoming;

  const formattedDate = emp.birth_date
    ? new Date(emp.birth_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  return (
    <div
      className={`flex items-center gap-3 p-2.5 rounded-lg transition-all ${cfg.rowClass} ${isMe ? "ring-1 ring-pink-300" : ""}`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
        {isMe ? "🎉" : cfg.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-semibold truncate">{emp.name}</p>
          {isMe && (
            <span className="flex items-center gap-0.5 text-xs font-bold text-pink-600 dark:text-pink-400">
              <Sparkles className="h-3 w-3" /> You!
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <p className="text-xs text-muted-foreground truncate max-w-[140px]">{emp.email}</p>
          {formattedDate && (
            <span className="text-xs text-muted-foreground shrink-0">· {formattedDate}</span>
          )}
          <RemainingLabel emp={emp} />
        </div>
      </div>
      <Badge className={`text-xs shrink-0 self-start ${cfg.badge}`}>
        {cfg.label || `${emp.remaining_days}d ${emp.remaining_hours}h`}
      </Badge>
    </div>
  );
}

export const BirthdayList = ({
  filterType,
  title,
  description,
  maxHeight = 320,
}: BirthdayListProps) => {
  const { birthdays, isLoading, error, refetch } = useUpcomingBirthdays(filterType);
  const { currentUser } = useAuth();

  const defaultTitle = filterType === 'current_month' ? "This Month's Birthdays" : "Upcoming Birthdays";
  const defaultDesc = filterType === 'current_month'
    ? "All birthdays in the current month"
    : "Birthdays in the next 30 days";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Cake className="h-5 w-5 text-pink-500" />
          {title ?? defaultTitle}
        </CardTitle>
        <CardDescription>{description ?? defaultDesc}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-5 w-10 rounded-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-6 space-y-2">
            <p className="text-sm text-destructive">Failed to load birthdays</p>
            <Button onClick={() => refetch()} variant="outline" size="sm">Retry</Button>
          </div>
        ) : birthdays.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No birthdays {filterType === 'current_month' ? 'this month' : 'in the next 30 days'} 🎂
          </p>
        ) : (
          <ScrollArea style={{ maxHeight }} className="pr-2">
            <div className="space-y-2">
              {birthdays.map((emp) => (
                <BirthdayRow key={emp.id} emp={emp} currentUserId={currentUser?.id} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
