import { Navigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { canManageSettings } from '@/lib/permissions';

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
  const { currentUser } = useAuthContext();

  // Don't show loading state, just check permissions directly
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = canManageSettings(currentUser.role);
  
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};