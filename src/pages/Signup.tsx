import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Check, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

type SignupStep = "form" | "otp";

export default function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<SignupStep>("form");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });
  const [otpCode, setOtpCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!isSuperAdmin && !formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }

    if (!formData.email) {
      newErrors.email = "Work email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!isSuperAdmin && !formData.acceptTerms) {
      newErrors.acceptTerms = "You must accept the terms to continue";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormValid =
    (!isSuperAdmin || formData.fullName.trim()) &&
    formData.email &&
    formData.password.length >= 8 &&
    formData.password === formData.confirmPassword &&
    (!isSuperAdmin || formData.acceptTerms);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      if (isSuperAdmin) {
        // Super admin signup via setup endpoint (no OTP required)
        const response = await apiClient.post("/api/admin/setup/create-super-admin", {
          email: formData.email,
          password: formData.password,
          tenantName: "Platform",
          tenantDomain: "platform",
        });

        toast.success("Super admin account created! Please log in.");
        navigate("/login");
      } else {
        // Regular user signup - requires OTP verification
        const response = await apiClient.post("/api/auth/signup", {
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
        });

        if (response.data.requiresVerification) {
          toast.success("Account created! Please check your email for the verification code.");
          setStep("otp");
        } else {
          // Fallback if OTP is not required
          if (response.data.token) {
            localStorage.setItem("token", response.data.token);
            localStorage.setItem("authToken", response.data.token);
            toast.success("Account created successfully!");
            navigate("/chat");
          } else {
            toast.success("Account created! Please log in.");
            navigate("/login");
          }
        }
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      const errorMessage = error?.response?.data?.message || "Failed to create account";
      
      if (errorMessage.includes("Email already in use")) {
        setErrors({ email: errorMessage });
      } else {
        setErrors({ email: errorMessage });
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otpCode || otpCode.length !== 6) {
      setErrors({ otp: "Please enter a valid 6-digit code" });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await apiClient.post("/api/auth/verify-otp", {
        email: formData.email,
        code: otpCode,
      });

      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("authToken", response.data.token);
        toast.success("Email verified! Welcome to Evo Associates.");
        navigate("/chat");
      } else {
        toast.error("Verification failed. Please try again.");
      }
    } catch (error: any) {
      console.error("OTP verification error:", error);
      const errorMessage = error?.response?.data?.message || "Invalid verification code";
      setErrors({ otp: errorMessage });
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    try {
      await apiClient.post("/api/auth/resend-otp", {
        email: formData.email,
      });
      toast.success("Verification code resent to your email");
      setOtpCode("");
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || "Failed to resend code";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // OTP Verification Step
  if (step === "otp") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">Verify your email</h1>
            <p className="text-sm text-muted-foreground">
              We've sent a 6-digit verification code to{" "}
              <span className="font-medium text-foreground">{formData.email}</span>
            </p>
          </div>

          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="otp" className="text-sm font-medium text-foreground">
                Verification Code
              </label>
              <input
                id="otp"
                type="text"
                value={otpCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setOtpCode(value);
                  if (errors.otp) setErrors((prev) => ({ ...prev, otp: "" }));
                }}
                className={cn(
                  "w-full px-3 py-2.5 rounded-lg border bg-chat-input-bg text-sm outline-none transition-colors text-center text-2xl tracking-widest",
                  errors.otp
                    ? "border-destructive focus:border-destructive"
                    : "border-chat-input-border focus:border-chat-input-focus"
                )}
                placeholder="000000"
                disabled={isLoading}
                maxLength={6}
                autoFocus
              />
              {errors.otp && (
                <p className="text-xs text-destructive">{errors.otp}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || otpCode.length !== 6}
              className={cn(
                "w-full py-2.5 rounded-lg font-medium text-sm transition-all",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </span>
              ) : (
                "Verify Email"
              )}
            </button>
          </form>

          <div className="space-y-3">
            <button
              onClick={handleResendOtp}
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg font-medium text-sm border border-chat-input-border bg-chat-input-bg text-foreground hover:bg-chat-hover transition-colors disabled:opacity-50"
            >
              Resend Code
            </button>
            <button
              onClick={() => setStep("form")}
              className="w-full py-2.5 rounded-lg font-medium text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to signup
            </button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:text-primary/80 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // Signup Form Step
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">Create your account</h1>
          <p className="text-sm text-muted-foreground">
            Get started with your workspace
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSignup} className="space-y-4">
          {/* Full Name - not required for super admin */}
          {!isSuperAdmin && (
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="text-sm font-medium text-foreground">
                Full Name
              </label>
            <input
              id="fullName"
              type="text"
              value={formData.fullName}
              onChange={(e) => updateField("fullName", e.target.value)}
              className={cn(
                "w-full px-3 py-2.5 rounded-lg border bg-chat-input-bg text-sm outline-none transition-colors",
                errors.fullName
                  ? "border-destructive focus:border-destructive"
                  : "border-chat-input-border focus:border-chat-input-focus"
              )}
              placeholder="Jane Smith"
              disabled={isLoading}
            />
            {errors.fullName && (
              <p className="text-xs text-destructive">{errors.fullName}</p>
            )}
          </div>
          )}

          {/* Work Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Work Email
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
              className={cn(
                "w-full px-3 py-2.5 rounded-lg border bg-chat-input-bg text-sm outline-none transition-colors",
                errors.email
                  ? "border-destructive focus:border-destructive"
                  : "border-chat-input-border focus:border-chat-input-focus"
              )}
              placeholder="you@company.com"
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => updateField("password", e.target.value)}
                className={cn(
                  "w-full px-3 py-2.5 pr-10 rounded-lg border bg-chat-input-bg text-sm outline-none transition-colors",
                  errors.password
                    ? "border-destructive focus:border-destructive"
                    : "border-chat-input-border focus:border-chat-input-focus"
                )}
                placeholder="At least 8 characters"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                className={cn(
                  "w-full px-3 py-2.5 pr-10 rounded-lg border bg-chat-input-bg text-sm outline-none transition-colors",
                  errors.confirmPassword
                    ? "border-destructive focus:border-destructive"
                    : "border-chat-input-border focus:border-chat-input-focus"
                )}
                placeholder="Confirm your password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Terms - not required for super admin */}
          {!isSuperAdmin && (
            <div className="space-y-1.5">
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    checked={formData.acceptTerms}
                    onChange={(e) => updateField("acceptTerms", e.target.checked)}
                    className="sr-only"
                    disabled={isLoading}
                  />
                  <div
                    className={cn(
                      "w-4 h-4 rounded border transition-colors flex items-center justify-center",
                      formData.acceptTerms
                        ? "bg-primary border-primary"
                        : "border-chat-input-border bg-chat-input-bg",
                      errors.acceptTerms && "border-destructive"
                    )}
                  >
                    {formData.acceptTerms && (
                      <Check className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>
                </div>
                <span className="text-sm text-muted-foreground leading-tight">
                  I agree to the{" "}
                  <a href="#" className="text-primary hover:text-primary/80">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="#" className="text-primary hover:text-primary/80">
                    Privacy Policy
                  </a>
                </span>
              </label>
              {errors.acceptTerms && (
                <p className="text-xs text-destructive">{errors.acceptTerms}</p>
              )}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || !isFormValid}
            className={cn(
              "w-full py-2.5 rounded-lg font-medium text-sm transition-all",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account...
              </span>
            ) : (
              "Create account"
            )}
          </button>
        </form>

        {/* Sign in link */}
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:text-primary/80 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
