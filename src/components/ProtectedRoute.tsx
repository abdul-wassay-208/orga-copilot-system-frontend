import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { adminClient } from '@/lib/api-client';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: string[];
  requireSubscription?: boolean; // For chat routes
}

export function ProtectedRoute({ children, allowedRoles, requireSubscription = false }: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, user, loading } = useAuth();
  const [subscriptionValid, setSubscriptionValid] = useState<boolean | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(false);

  useEffect(() => {
    // Check subscription status but don't block access - users can access chat regardless
    if (requireSubscription && isAuthenticated && !loading) {
      checkSubscription();
    } else {
      setSubscriptionValid(true);
    }
  }, [requireSubscription, isAuthenticated, loading]);

  const checkSubscription = async () => {
    if (!requireSubscription) {
      setSubscriptionValid(true);
      return;
    }

    try {
      setCheckingSubscription(true);
      const response = await adminClient.get("/api/subscription/status");
      const data = response.data;
      // Super Admins get hasSubscription: false so they don't see another org's billing; allow them to chat
      if (data.isSuperAdmin === true) {
        setSubscriptionValid(true);
        return;
      }
      if (!data.hasSubscription) {
        setSubscriptionValid(false);
        return;
      }
      
      const status = data.status?.toUpperCase();
      // Allow FREE, ACTIVE, PAST_DUE, and CANCELED (if still within paid period)
      if (status === "FREE" || status === "ACTIVE" || status === "PAST_DUE") {
        setSubscriptionValid(true);
        return;
      }
      
      // For CANCELED subscriptions, check if still within paid period
      if (status === "CANCELED") {
        const accessUntil = data.accessUntil;
        if (accessUntil) {
          const endDate = new Date(accessUntil);
          const now = new Date();
          // Allow access if currentPeriodEnd hasn't passed yet
          setSubscriptionValid(endDate >= now);
        } else {
          // No accessUntil date - allow access (fallback)
          setSubscriptionValid(true);
        }
        return;
      }
      
      setSubscriptionValid(false);
    } catch (error: any) {
      console.error("Failed to check subscription:", error);
      // On error, allow access but log it
      setSubscriptionValid(true);
    } finally {
      setCheckingSubscription(false);
    }
  };

  // Only show loading for auth check, not subscription check (subscription check happens in background)
  if (loading) {
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

  if (allowedRoles && user?.role && !allowedRoles.includes(user.role)) {
    // User doesn't have required role, redirect to chat
    return <Navigate to="/chat" replace />;
  }

  // Allow access to chat regardless of subscription status
  // Users can see usage limits and upgrade prompts within chat, but won't be forced to billing page
  // The chat interface will handle showing appropriate messages for free/unpaid users

  return children;
}
