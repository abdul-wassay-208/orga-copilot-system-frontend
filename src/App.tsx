import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ChatProvider } from "@/contexts/ChatContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import AcceptInvitation from "./pages/AcceptInvitation";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import SuperAdmin from "./pages/SuperAdmin";
import ManageSubscription from "./pages/ManageSubscription";
import UpdatePaymentMethod from "./pages/UpdatePaymentMethod";
import SharedConversation from "./pages/SharedConversation";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/LandingPage";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

// Component to handle /index.html redirects from Render
// This happens when Render uses a redirect instead of a rewrite
function IndexHtmlHandler() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // If we're on /index.html, try to restore the original route
    if (location.pathname === '/index.html') {
      const params = new URLSearchParams(location.search);
      const token = params.get('token');
      
      if (token) {
        // Has invitation token, go to accept-invitation
        navigate(`/accept-invitation?token=${token}`, { replace: true });
        return;
      }

      // Check if user is authenticated
      const authToken = localStorage.getItem('token') || localStorage.getItem('authToken');
      if (authToken) {
        // User is logged in - try to go back to where they were
        // Since we can't know the original URL with a redirect, default to chat
        navigate('/chat', { replace: true });
      } else {
        // User is not logged in, go to login
        navigate('/login', { replace: true });
      }
    }
  }, [location, navigate]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-muted-foreground">Loading...</div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <ChatProvider>
              <Routes>
          {/* Handle /index.html from Render redirects */}
          <Route path="/index.html" element={<IndexHtmlHandler />} />
          
          {/* Public routes - no auth required */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/home" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/accept-invitation" element={<AcceptInvitation />} />
          <Route path="/share/:token" element={<SharedConversation />} />
          
          {/* Protected routes - require authentication */}
          <Route 
            path="/chat" 
            element={
              <ProtectedRoute requireSubscription={true}>
                <Index />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['TENANT_ADMIN', 'SUPER_ADMIN']}>
                <Admin />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/super-admin" 
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <SuperAdmin />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/billing" 
            element={
              <ProtectedRoute allowedRoles={['TENANT_ADMIN', 'SUPER_ADMIN']}>
                <ManageSubscription />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/billing/payment-method" 
            element={
              <ProtectedRoute allowedRoles={['TENANT_ADMIN', 'SUPER_ADMIN']}>
                <UpdatePaymentMethod />
              </ProtectedRoute>
            } 
          />
          
          {/* 404 - must be last */}
          <Route path="*" element={<NotFound />} />
            </Routes>
          </ChatProvider>
        </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
