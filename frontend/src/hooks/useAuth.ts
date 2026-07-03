import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authService, LoginRequest } from '@/services';
import { toast } from 'sonner';
import { useApiErrorHandler } from './useApiErrorHandler';
import { useAuthContext } from '@/contexts/AuthContext';

export const useAuth = () => {
  const navigate = useNavigate();
  const handleError = useApiErrorHandler();
  const { currentUser, isAuthenticated } = useAuthContext();

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginRequest) => authService.login(credentials),
    onSuccess: (data) => {
      toast.success(data.message || 'Login successful!');
      navigate('/');
    },
    onError: handleError,
  });

  const googleLoginMutation = useMutation({
    mutationFn: (idToken: string) => authService.googleLogin(idToken),
    onSuccess: (data) => {
      toast.success(data.message || 'Login successful!');
      navigate('/');
    },
    onError: handleError,
  });

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      toast.success('Logged out successfully');
      navigate('/login');
    },
    onError: () => {
      toast.success('Logged out successfully');
      navigate('/login');
    },
  });

  return {
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    googleLogin: googleLoginMutation.mutate,
    isGoogleLoggingIn: googleLoginMutation.isPending,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    currentUser,
    isAuthenticated,
  };
};
