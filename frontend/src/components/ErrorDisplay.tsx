import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Lock, WifiOff, ServerCrash, SearchX, Timer } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ErrorDisplayProps {
  error: Error | unknown | null;
  /** Override the auto-derived title */
  title?: string;
  /** Override the auto-derived description */
  description?: string;
  onRetry?: () => void;
  className?: string;
  /** Compact inline variant — just text + optional retry, no alert box */
  compact?: boolean;
}

// ─── Per-status config ────────────────────────────────────────────────────────

interface StatusConfig {
  icon: React.ElementType;
  title: string;
  hint: string;
  /** Whether to show a retry button by default when onRetry is provided */
  canRetry: boolean;
}

function getStatusConfig(status: number | undefined): StatusConfig {
  switch (status) {
    case 403:
      return {
        icon: Lock,
        title: "Access Denied",
        hint: "You don't have permission to view this. Contact your administrator.",
        canRetry: false,
      };
    case 401:
      return {
        icon: Lock,
        title: "Session Expired",
        hint: "Your session has expired. Please log in again.",
        canRetry: false,
      };
    case 404:
      return {
        icon: SearchX,
        title: "Not Found",
        hint: "The requested resource could not be found.",
        canRetry: false,
      };
    case 429:
      return {
        icon: Timer,
        title: "Too Many Requests",
        hint: "You're sending requests too fast. Please wait a moment and try again.",
        canRetry: true,
      };
    case 0:
      return {
        icon: WifiOff,
        title: "No Connection",
        hint: "Unable to reach the server. Check your internet connection.",
        canRetry: true,
      };
    case 500:
    case 502:
    case 503:
    case 504:
      return {
        icon: ServerCrash,
        title: "Server Error",
        hint: "Something went wrong on the server. Please try again later.",
        canRetry: true,
      };
    default:
      return {
        icon: AlertCircle,
        title: "Something went wrong",
        hint: "An unexpected error occurred. Please try again.",
        canRetry: true,
      };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ErrorDisplay = ({
  error,
  title,
  description,
  onRetry,
  className,
  compact = false,
}: ErrorDisplayProps) => {
  if (!error) return null;

  // Normalise to Error so we always have .message
  const err = error instanceof Error ? error : new Error(String(error));
  const status = err instanceof ApiError ? err.status : undefined;
  const config  = getStatusConfig(status);

  const displayTitle       = title       ?? config.title;
  // Use the backend message when it adds context (not just a status repeat);
  // fall back to the friendly hint otherwise.
  const backendMessage     = err.message?.trim();
  const displayDescription = description ?? backendMessage ?? config.hint;
  const Icon               = config.icon;

  // ── Compact variant ────────────────────────────────────────────────────────
  if (compact) {
    return (
      <div className={cn("flex flex-col items-center gap-1.5 py-2 text-center", className)}>
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm text-destructive font-medium">{displayTitle}</p>
        <p className="text-xs text-muted-foreground">{displayDescription}</p>
        {onRetry && config.canRetry && (
          <Button onClick={onRetry} variant="ghost" size="sm" className="mt-1">
            <RefreshCw className="mr-1.5 h-3 w-3" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  // ── Full alert variant ─────────────────────────────────────────────────────
  return (
    <Alert
      variant={status === 403 || status === 401 || status === 429 ? "default" : "destructive"}
      className={cn(
        "rounded-xl",
        status === 403 || status === 401
          ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
          : status === 429
            ? "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-200"
            : undefined,
        className,
      )}
    >
      <Icon className={cn(
        "h-4 w-4",
        status === 403 || status === 401 ? "text-amber-600 dark:text-amber-400" : undefined,
        status === 429 ? "text-orange-500 dark:text-orange-400" : undefined,
      )} />
      <AlertTitle className="font-semibold">{displayTitle}</AlertTitle>
      <AlertDescription className="space-y-2 mt-1">
        <p className="text-sm">{displayDescription}</p>
        {/* Show the friendly hint separately when backend message differs */}
        {backendMessage && backendMessage !== config.hint && (
          <p className="text-xs opacity-70">{config.hint}</p>
        )}
        {onRetry && config.canRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};
