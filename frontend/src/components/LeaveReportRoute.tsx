import { Navigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { hasPermission, ROLES } from '@/lib/permissions';

interface LeaveReportRouteProps {
  children: React.ReactNode;
}

export const LeaveReportRoute = ({ children }: LeaveReportRouteProps) => {
  const { currentUser } = useAuthContext();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const canView = hasPermission(currentUser.role, [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.HR]);

  if (!canView) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
