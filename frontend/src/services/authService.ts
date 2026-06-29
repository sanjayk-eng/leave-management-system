import { api, getAuthToken, setAuthToken, setCurrentUser, removeAuthToken, removeCurrentUser } from '@/lib/api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

export interface VerifyTokenResponse {
  success: boolean;
  message: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

export const authService = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    
    // Store token and user info
    setAuthToken(response.token);
    setCurrentUser(response.user);
    
    return response;
  },

  verifyToken: async (): Promise<VerifyTokenResponse> => {
    const token = getAuthToken();

    if (!token) {
      throw new Error('No authentication token found');
    }

    try {
      const response = await api.get<VerifyTokenResponse>('/auth/verify');

      if (response.success && response.user) {
        setCurrentUser(response.user);
      } else {
        throw new Error('Invalid verification response');
      }

      return response;
    } catch (error: unknown) {
      removeCurrentUser();
      throw error;
    }
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch {
      // If backend logout fails, still clear local storage
    } finally {
      removeAuthToken();
      removeCurrentUser();
    }
  },
};
