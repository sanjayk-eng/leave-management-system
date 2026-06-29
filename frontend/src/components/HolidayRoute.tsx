import { useAuthContext } from "@/contexts/AuthContext";
import { canManageHolidays } from "@/lib/permissions";
import { Navigate } from "react-router-dom";

interface HolidayRouteProps {
  children: React.ReactNode;
}

export function HolidayRoute({ children }: HolidayRouteProps) {
  const { currentUser } = useAuthContext();

  if (!currentUser || !canManageHolidays(currentUser.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}