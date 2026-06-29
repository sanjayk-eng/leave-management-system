import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useTodayBirthdays } from "@/hooks/useBirthday";
import { useAuth } from "@/hooks/useAuth";
import { Cake, Sparkles } from "lucide-react";

export const TodayBirthdays = () => {
  const { birthdays, total, isLoading, error, refetch } = useTodayBirthdays();
  const { currentUser } = useAuth();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cake className="h-5 w-5 text-pink-500" />
          Today's Birthdays
        </CardTitle>
        <CardDescription>
          {total > 0 ? `${total} employee${total > 1 ? 's' : ''} celebrating today` : "Birthdays today"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-4 space-y-2">
            <p className="text-sm text-destructive">Failed to load birthdays</p>
            <Button onClick={() => refetch()} variant="outline" size="sm">Retry</Button>
          </div>
        ) : birthdays.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No birthdays today 🎂
          </p>
        ) : (
          <div className="space-y-4">
            {birthdays.map((person) => {
              const isCurrentUser = currentUser?.id === person.id;
              
              return (
                <div 
                  key={person.id} 
                  className={`flex items-start gap-3 border-b pb-3 last:border-0 rounded-lg transition-all ${
                    isCurrentUser 
                      ? 'bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 p-3 border-pink-200 dark:border-pink-800 shadow-sm' 
                      : ''
                  }`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg ${
                    isCurrentUser 
                      ? 'bg-gradient-to-br from-pink-400 to-purple-500 animate-pulse' 
                      : 'bg-pink-100 dark:bg-pink-950'
                  }`}>
                    {isCurrentUser ? '🎉' : '🎂'}
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold truncate ${isCurrentUser ? 'text-pink-700 dark:text-pink-300' : ''}`}>
                        {person.name}
                      </p>
                      {isCurrentUser && (
                        <span className="flex items-center gap-1 text-xs font-bold text-pink-600 dark:text-pink-400 animate-pulse">
                          <Sparkles className="h-3 w-3" />
                          It's your birthday!
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{person.email}</p>
                    {isCurrentUser && (
                      <p className="text-xs leading-snug text-pink-700 dark:text-pink-300 font-medium">
                        {person.message}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
