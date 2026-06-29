import React, { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { authService, LoginRequest } from '@/services';
import { getCurrentUser, getAuthToken, removeAuthToken, removeCurrentUser } from '@/lib/api';
import { LoadingState } from '@/components/LoadingState';
import { useApiErrorHandler } from '@/hooks/useApiErrorHandler';
import { AuthContext } from './AuthContext';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const handleError = useApiErrorHandler();

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginRequest) => authService.login(credentials),
    onError: handleError,
  });

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onError: () => {},
  });

  const tokenVerificationQuery = useQuery({
    queryKey: ['verifyToken'],
    queryFn: () => authService.verifyToken(),
    enabled: !!getAuthToken(),
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (!getAuthToken()) return;
    const interval = setInterval(() => {
      tokenVerificationQuery.refetch();
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [tokenVerificationQuery]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setIsInitializing(false);
      return;
    }
    setIsInitializing(false);
  }, []);

  useEffect(() => {
    if (tokenVerificationQuery.isError) {
      removeAuthToken();
      removeCurrentUser();
    }
  }, [tokenVerificationQuery.isError, tokenVerificationQuery.isSuccess]);

  const currentUser = getCurrentUser();
  const hasToken = !!getAuthToken();

  if (isInitializing || (hasToken && tokenVerificationQuery.isLoading && !tokenVerificationQuery.data)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState message="Verifying authentication..." />
      </div>
    );
  }

  const isAuthenticated = hasToken && !!currentUser && (tokenVerificationQuery.isSuccess || !!tokenVerificationQuery.data);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        currentUser,
        login: loginMutation.mutate,
        logout: logoutMutation.mutate,
        isLoggingIn: loginMutation.isPending,
        isLoggingOut: logoutMutation.isPending,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};