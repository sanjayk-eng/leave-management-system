import { Navigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';

interface SuperAdminRouteProps {
  children: React.ReactNode;
}

export const SuperAdminRoute = ({ children }: SuperAdminRouteProps) => {
  const { currentUser } = useAuthContext();

  // Don't show loading state, just check permissions directly
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has SUPERADMIN or SUPER_ADMIN role
  const isSuperAdmin = currentUser.role === 'SUPERADMIN' || currentUser.role === 'SUPER_ADMIN';
  
  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};