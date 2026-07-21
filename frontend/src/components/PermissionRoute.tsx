import { Navigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useMyPermissions } from '@/hooks/usePermissions';
import { hasAllPermissions, hasAnyPermission, PermissionRequirement } from '@/lib/pagePermissions';
import { LoadingState } from '@/components/LoadingState';
import { AccessDenied } from '@/components/AccessDenied';

interface PermissionRouteProps {
  children: React.ReactNode;
  permissionAll?: PermissionRequirement[];
  permissionAny?: PermissionRequirement[];
}

export const PermissionRoute = ({ children, permissionAll, permissionAny }: PermissionRouteProps) => {
  const { currentUser } = useAuthContext();
  const { data, isLoading, error } = useMyPermissions();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState message="Checking access permissions..." />
      </div>
    );
  }

  if (error || !data) {
    return <AccessDenied />;
  }

  const canAccess = permissionAll
    ? hasAllPermissions(data.resources, permissionAll)
    : permissionAny
      ? hasAnyPermission(data.resources, permissionAny)
      : true;

  if (!canAccess) {
    return <AccessDenied />;
  }

  return <>{children}</>;
};
