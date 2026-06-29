import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const LoadingState = ({ 
  message = "Loading...", 
  className = "",
  size = "md"
}: LoadingStateProps) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8"
  };

  return (
    <div className={`flex items-center justify-center py-4 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin`} />
      {message && (
        <p className="ml-3 text-muted-foreground">{message}</p>
      )}
    </div>
  );
};
