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
    if (requireSubscription && isAuthenticated && !loading) {
      checkSubscription();
    } else if (!requireSubscription) {
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
      // Allow FREE, ACTIVE, and PAST_DUE (with grace period)
      const valid = status === "FREE" || status === "ACTIVE" || status === "PAST_DUE";
      setSubscriptionValid(valid);
    } catch (error: any) {
      console.error("Failed to check subscription:", error);
      // On error, allow access but log it
      setSubscriptionValid(true);
    } finally {
      setCheckingSubscription(false);
    }
  };

  if (loading || (requireSubscription && checkingSubscription && subscriptionValid === null)) {
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

  // Check subscription for chat routes. Only admins are sent to billing; employees stay on chat to avoid redirect loop and repeated "access denied".
  if (requireSubscription && subscriptionValid === false) {
    const isBillingAdmin = user?.role === "TENANT_ADMIN" || user?.role === "SUPER_ADMIN";
    if (isBillingAdmin) {
      return <Navigate to="/billing" replace />;
    }
    // Employee: do not redirect to billing (they would see "access denied" and loop). Let them stay on chat.
  }

  return children;
}
