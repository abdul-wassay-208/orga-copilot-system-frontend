import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { adminClient } from '@/lib/api-client';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      
      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      try {
        const response = await adminClient.get('/api/auth/me');
        const role = response.data?.role;
        setUserRole(role);
        setIsAuthenticated(true);
      } catch (error: any) {
        // Token is invalid
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('authToken');
        }
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login, preserving the intended destination
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    // User doesn't have required role, redirect to chat
    return <Navigate to="/chat" replace />;
  }

  return children;
}
