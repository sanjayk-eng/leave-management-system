import { createContext, useContext } from 'react';
import { CurrentUser } from '@/lib/api';
import { LoginRequest } from '@/services';

export interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: CurrentUser | null;
  login: (credentials: LoginRequest) => void;
  googleLogin: (idToken: string) => void;
  logout: () => void;
  isLoggingIn: boolean;
  isGoogleLoggingIn: boolean;
  isLoggingOut: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};