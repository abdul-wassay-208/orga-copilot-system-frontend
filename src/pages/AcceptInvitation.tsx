import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Loader2, ArrowLeft, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

export default function AcceptInvitationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [tokenError, setTokenError] = useState("");

  // Check for token in URL and verify it
  useEffect(() => {
    const urlToken = searchParams.get("token");
    if (urlToken) {
      setToken(urlToken);
      verifyToken(urlToken);
    } else {
      setTokenError("No invitation token found. Please use the link from your invitation email.");
      setIsVerifying(false);
    }
  }, [searchParams]);

  const verifyToken = async (invitationToken: string) => {
    setIsVerifying(true);
    setTokenError("");

    try {
      const response = await apiClient.get("/api/auth/verify-invitation", {
        params: { token: invitationToken },
      });

      if (response.data.valid) {
        setEmail(response.data.email);
        setIsVerifying(false);
      } else {
        setTokenError("Invalid or expired invitation token.");
        setIsVerifying(false);
      }
    } catch (error: any) {
      console.error("Token verification error:", error);
      const errorMsg =
        error?.response?.data?.message ||
        "Invalid or expired invitation token. Please contact the person who invited you.";
      setTokenError(errorMsg);
      setIsVerifying(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (!token) {
      setErrors({ password: "Invitation token is missing. Please use the link from your email." });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await apiClient.post("/api/auth/accept-invitation", {
        token: token,
        password: password,
      });

      // Success - account created and logged in
      const jwtToken = response.data.token;
      if (jwtToken) {
        // Store token in localStorage (both formats for compatibility)
        localStorage.setItem("token", jwtToken);
        localStorage.setItem("authToken", jwtToken);
        
        // Set success state
        setSuccess(true);
        const message = response.data.message || "Invitation accepted! Your account has been created.";
        toast.success(message);

        // Redirect after a short delay
        setTimeout(() => {
          // If backend indicates redirect to billing (e.g., Super Admin invitation), go to billing
          if (response.data.redirectToBilling) {
            navigate("/billing", { replace: true });
            return;
          }
          
          // Redirect based on role if available
          const role = response.data.role;
          if (role === "SUPER_ADMIN") {
            navigate("/super-admin", { replace: true });
          } else if (role === "TENANT_ADMIN") {
            navigate("/admin", { replace: true });
          } else {
            navigate("/chat", { replace: true });
          }
        }, 2000);
      } else {
        // No token returned, redirect to login
        setSuccess(true);
        toast.success("Invitation accepted! Please log in with your new password.");
        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 2000);
      }
    } catch (error: any) {
      console.error("Accept invitation error:", error);
      const errorMsg =
        error?.response?.data?.message ||
        "Failed to accept invitation. Please try again or contact support.";
      toast.error(errorMsg);
      setErrors({ password: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Verifying invitation token...</p>
        </div>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <div className="text-center space-y-2">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold">Invalid Invitation</h1>
            <p className="text-muted-foreground">{tokenError}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Link
              to="/login"
              className="w-full inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Go to Login
            </Link>
            <Link
              to="/"
              className="w-full inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold">Invitation Accepted!</h1>
          <p className="text-muted-foreground">
            Your account has been created successfully. Redirecting...
          </p>
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Accept Invitation</h1>
          <p className="text-muted-foreground">
            Set up your password to complete your account setup
          </p>
          {email && (
            <p className="text-sm text-muted-foreground">
              Email: <span className="font-medium">{email}</span>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  "w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  errors.password && "border-destructive"
                )}
                placeholder="Enter your password (min. 8 characters)"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={isLoading}
              >
                {showPassword ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={cn(
                  "w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  errors.confirmPassword && "border-destructive"
                )}
                placeholder="Confirm your password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              "Accept Invitation & Create Account"
            )}
          </button>
        </form>

        <div className="text-center">
          <Link
            to="/login"
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center"
          >
            <ArrowLeft className="mr-1 h-3 w-3" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
