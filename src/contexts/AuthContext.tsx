import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, adminClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface User {
  email: string;
  role: string;
  fullName?: string;
  twoFactorEnabled?: boolean;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  login: (token: string, userData?: Partial<User>) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'token';
const AUTH_TOKEN_KEY = 'authToken';
const USER_ROLE_KEY = 'userRole';
const USER_DATA_KEY = 'userData';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  const storeToken = (token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(AUTH_TOKEN_KEY, token); // For backward compatibility
  };

  const removeToken = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_ROLE_KEY);
    localStorage.removeItem(USER_DATA_KEY);
  };

  const getToken = () => {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(AUTH_TOKEN_KEY);
  };

  const login = useCallback(async (token: string, userData?: Partial<User>) => {
    storeToken(token);
    
    // If user data is provided, use it; otherwise fetch from backend
    if (userData) {
      const userInfo: User = {
        email: userData.email || '',
        role: userData.role || '',
        fullName: userData.fullName,
        twoFactorEnabled: userData.twoFactorEnabled,
      };
      setUser(userInfo);
      setIsAuthenticated(true);
      localStorage.setItem(USER_ROLE_KEY, userInfo.role);
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(userInfo));
    } else {
      // Fetch user data from backend
      await refreshUser();
    }
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setIsAuthenticated(false);
    setUser(null);
    toast.info("You have been logged out.");
    navigate("/login", { replace: true });
  }, [navigate]);

  const refreshUser = useCallback(async () => {
    const storedToken = getToken();
    if (!storedToken) {
      setIsAuthenticated(false);
      setUser(null);
      return;
    }

    try {
      const response = await adminClient.get('/api/auth/me');
      const userData = response.data;
      
      const userInfo: User = {
        email: userData.email || '',
        role: userData.role || '',
        fullName: userData.fullName,
        twoFactorEnabled: userData.twoFactorEnabled || false,
      };
      
      setUser(userInfo);
      setIsAuthenticated(true);
      localStorage.setItem(USER_ROLE_KEY, userInfo.role);
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(userInfo));
    } catch (error: any) {
      console.error("Auth check failed:", error);
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        removeToken();
        setIsAuthenticated(false);
        setUser(null);
      }
      throw error;
    }
  }, []);

  const checkAuth = useCallback(async () => {
    setLoading(true);
    const storedToken = getToken();
    
    if (!storedToken) {
      setIsAuthenticated(false);
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      await refreshUser();
    } catch (error) {
      // Token is invalid or expired
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [refreshUser]);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Set up Axios interceptors to handle token expiration
  useEffect(() => {
    const requestInterceptor = adminClient.interceptors.request.use((config) => {
      const token = getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    const responseInterceptor = adminClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          // Token expired or invalid
          if (isAuthenticated) {
            logout();
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      adminClient.interceptors.request.eject(requestInterceptor);
      adminClient.interceptors.response.eject(responseInterceptor);
    };
  }, [isAuthenticated, logout]);

  const value = {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    checkAuth,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
