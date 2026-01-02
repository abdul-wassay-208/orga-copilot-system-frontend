import axios from 'axios';
import { TOKEN_KEY } from '../constants';

export const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'https://orga-copilot-system-java.onrender.com';

// Get token from localStorage
const getToken = () => {
  return localStorage.getItem('token') || localStorage.getItem('authToken');
};

// Create axios instance for general API calls (auth, etc.)
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling on apiClient
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log error for debugging
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Create axios instance for chat API
export const chatClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token for chat client
chatClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Chat request with token:', config.url, 'Token present:', !!token);
    } else {
      console.warn('Chat request without token:', config.url);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
chatClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Chat API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      headers: error.config?.headers
    });
    
    if (error.response?.status === 401) {
      // Token expired or invalid - redirect to login
      console.warn('Unauthorized - redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      // Forbidden - likely missing or invalid token
      console.error('Forbidden - check token:', getToken());
      // Redirect to login if token is missing
      if (!getToken()) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Create axios instance for admin API calls
export const adminClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token for admin client
adminClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling on admin client
adminClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

