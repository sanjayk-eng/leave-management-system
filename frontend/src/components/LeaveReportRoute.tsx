import { Navigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';

interface LeaveReportRouteProps {
  children: React.ReactNode;
}

// All authenticated roles can access the leave report page.
// The backend RBAC middleware enforces scope:
//   own   → user sees only their own row
//   team  → manager sees their team
//   all   → HR / Admin / SuperAdmin see everyone
export const LeaveReportRoute = ({ children }: LeaveReportRouteProps) => {
  const { currentUser } = useAuthContext();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
