import { Navigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { canManageDesignations } from '@/lib/permissions';

interface DesignationRouteProps {
  children: React.ReactNode;
}

export const DesignationRoute = ({ children }: DesignationRouteProps) => {
  const { currentUser } = useAuthContext();

  // Don't show loading state, just check permissions directly
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const canAccess = canManageDesignations(currentUser.role);
  
  if (!canAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};