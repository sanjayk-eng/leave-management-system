import { api, getAuthToken, setAuthToken, setCurrentUser, removeAuthToken, removeCurrentUser } from '@/lib/api';

export type AuthProvider = 'local' | 'google';

export interface LoginRequest {
  provider: AuthProvider;
  email?: string;    // required for local login
  password?: string; // required for local login
  token?: string;    // required for google login (id_token from Google)
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

export interface RoleEntry {
  id: number;
  type: string;
  priority: number;
}

export const authService = {
  // Local login: { provider: "local", email, password }
  // Google login: { provider: "google", token: "<google_id_token>" }
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    setAuthToken(response.token);
    setCurrentUser(response.user);
    return response;
  },

  // Convenience wrapper for Google login
  googleLogin: async (idToken: string): Promise<LoginResponse> => {
    return authService.login({ provider: 'google', token: idToken });
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

  getRoles: async (): Promise<{ message: string; data: RoleEntry[] }> => {
    return api.get<{ message: string; data: RoleEntry[] }>('/auth/roles');
  },
};
