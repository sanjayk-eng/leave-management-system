import { Navigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { canManagePayroll } from '@/lib/permissions';

interface PayrollRouteProps {
  children: React.ReactNode;
}

export const PayrollRoute = ({ children }: PayrollRouteProps) => {
  const { currentUser } = useAuthContext();

  // Don't show loading state, just check permissions directly
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const canAccess = canManagePayroll(currentUser.role);
  
  if (!canAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};