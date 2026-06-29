import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ApiError } from "@/lib/api";

interface ErrorDisplayProps {
  error: Error | null;
  title?: string;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

export const ErrorDisplay = ({ 
  error, 
  title = "Error Loading Data", 
  onRetry,
  className = "",
  compact = false
}: ErrorDisplayProps) => {
  if (!error) return null;

  const errorStatus = error instanceof ApiError ? error.status : undefined;
  const errorEndpoint = error instanceof ApiError ? error.endpoint : undefined;

  if (compact) {
    return (
      <div className={`text-center ${className}`}>
        <p className="text-sm text-destructive mb-2">{error.message}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="ghost" size="sm">
            <RefreshCw className="mr-2 h-3 w-3" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{error.message}</p>
        {errorStatus !== undefined && errorStatus !== 0 && (
          <p className="text-xs opacity-80">Error Code: {errorStatus}</p>
        )}
        {errorEndpoint && (
          <p className="text-xs opacity-80 font-mono">Endpoint: {errorEndpoint}</p>
        )}
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm" className="mt-2">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};