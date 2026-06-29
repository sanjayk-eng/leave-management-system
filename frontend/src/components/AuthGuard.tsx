import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { LoadingState } from '@/components/LoadingState';
import { getAuthToken } from '@/lib/api';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const location = useLocation();
  const { isAuthenticated } = useAuthContext();
  const hasToken = !!getAuthToken();

  if (!hasToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (hasToken && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState message="Verifying your access..." />
      </div>
    );
  }

  return <>{children}</>;
};