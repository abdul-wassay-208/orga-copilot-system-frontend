import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Loader2, Play, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; twoFactorCode?: string }>({});
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from || "/chat";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (requiresTwoFactor) {
      // Validate 2FA code
      if (!twoFactorCode || twoFactorCode.trim().length !== 6) {
        setErrors({ twoFactorCode: "Please enter the 6-digit code" });
        return;
      }
    } else {
      // Validate email and password
      if (!validateForm()) return;
    }
    
    setIsLoading(true);
    setErrors({});
    
    try {
      const response = await apiClient.post("/api/auth/login", {
        email,
        password,
        twoFactorCode: requiresTwoFactor ? twoFactorCode.trim() : undefined,
      });
      
      // Check if 2FA is required
      if (response.data.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        toast.info("2FA code sent to your email");
        setIsLoading(false);
        return;
      }
      
      // Login successful
      const token = response.data.token;
      if (token) {
        await login(token, {
          email: response.data.email,
          role: response.data.role,
          twoFactorEnabled: response.data.twoFactorEnabled || false,
        });
        
        toast.success("Login successful!");
        
        // Navigate to intended destination or chat
        const from = (location.state as any)?.from || "/chat";
        navigate(from, { replace: true });
      }
    } catch (error: any) {
      console.error("Login error:", error);
      const errorMessage = error?.response?.data?.message || "Invalid email or password";
      
      if (requiresTwoFactor) {
        setErrors({ twoFactorCode: errorMessage });
        // If 2FA code is wrong, allow retry
        setTwoFactorCode("");
      } else {
        setErrors({ password: errorMessage });
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleResend2FA = async () => {
    try {
      // Resend 2FA code by attempting login again (without 2FA code)
      const response = await apiClient.post("/api/auth/login", {
        email,
        password,
      });
      
      if (response.data.requiresTwoFactor) {
        toast.success("2FA code resent to your email");
      }
    } catch (error: any) {
      toast.error("Failed to resend code. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          
          <h1 className="text-2xl font-semibold text-foreground">Welcome to Evo Associates</h1>
          <p className="text-sm text-muted-foreground">
            Your AI-powered enterprise assistant
          </p>
        </div>

       

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              className={cn(
                "w-full px-3.5 py-2.5 rounded-lg border bg-chat-input-bg text-sm outline-none transition-all",
                errors.email
                  ? "border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20"
                  : "border-chat-input-border focus:border-chat-input-focus focus:ring-2 focus:ring-chat-input-focus/20"
              )}
              placeholder="you@company.com"
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-xs text-destructive flex items-center gap-1">
                {errors.email}
              </p>
            )}
          </div>

          {/* Password - hide if 2FA is required */}
          {!requiresTwoFactor && (
            <>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    className={cn(
                      "w-full px-3.5 py-2.5 pr-10 rounded-lg border bg-chat-input-bg text-sm outline-none transition-all",
                      errors.password
                        ? "border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20"
                        : "border-chat-input-border focus:border-chat-input-focus focus:ring-2 focus:ring-chat-input-focus/20"
                    )}
                    placeholder="Enter your password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                    tabIndex={-1}
                  >
                    {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Forgot Password */}
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </>
          )}

          {/* 2FA Code Input */}
          {requiresTwoFactor && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-4 w-4 text-primary" />
                <label htmlFor="twoFactorCode" className="text-sm font-medium text-foreground">
                  Two-Factor Authentication Code
                </label>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Enter the 6-digit code sent to your email
              </p>
              <input
                id="twoFactorCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={twoFactorCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setTwoFactorCode(value);
                  if (errors.twoFactorCode) setErrors((prev) => ({ ...prev, twoFactorCode: undefined }));
                }}
                className={cn(
                  "w-full px-3.5 py-2.5 rounded-lg border bg-chat-input-bg text-sm outline-none transition-all text-center text-lg tracking-widest font-mono",
                  errors.twoFactorCode
                    ? "border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20"
                    : "border-chat-input-border focus:border-chat-input-focus focus:ring-2 focus:ring-chat-input-focus/20"
                )}
                placeholder="000000"
                disabled={isLoading}
                autoFocus
              />
              {errors.twoFactorCode && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  {errors.twoFactorCode}
                </p>
              )}
              <button
                type="button"
                onClick={handleResend2FA}
                className="text-sm text-primary hover:text-primary/80 transition-colors w-full text-center"
                disabled={isLoading}
              >
                Resend code
              </button>
              <button
                type="button"
                onClick={() => {
                  setRequiresTwoFactor(false);
                  setTwoFactorCode("");
                  setErrors({});
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-center"
                disabled={isLoading}
              >
                Back to login
              </button>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              "w-full py-2.5 rounded-lg font-medium text-sm transition-all",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background"
            )}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {requiresTwoFactor ? "Verifying..." : "Signing in..."}
              </span>
            ) : (
              requiresTwoFactor ? "Verify Code" : "Sign in"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        {/* Google */}
        {/* <button
          type="button"
          className="w-full py-2.5 rounded-lg border border-chat-input-border bg-chat-input-bg text-sm font-medium text-foreground hover:bg-chat-hover transition-colors flex items-center justify-center gap-2"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button> */}

        {/* Demo link */}
        {/* <a
          href="https://youtube.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Play className="h-4 w-4" />
          Watch a quick demo
        </a> */}

        {/* Sign up link */}
        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/signup" className="text-primary hover:text-primary/80 transition-colors font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
