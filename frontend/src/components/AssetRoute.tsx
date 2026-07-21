import { Navigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { canManageAssets } from '@/lib/permissions';

interface AssetRouteProps {
  children: React.ReactNode;
}

export const AssetRoute = ({ children }: AssetRouteProps) => {
  const { currentUser } = useAuthContext();

  // Don't show loading state, just check permissions directly
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const canAccess = canManageAssets(currentUser.role);
  
  if (!canAccess) {
    return <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
};