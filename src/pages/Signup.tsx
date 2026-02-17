import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Check, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient, adminClient } from "@/lib/api-client";
import { toast } from "sonner";
import { CouponCheckoutPrompt } from "@/components/CouponCheckoutPrompt";

type SignupStep = "form" | "otp" | "plan" | "coupon";

export default function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<SignupStep>("form");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [otpVerified, setOtpVerified] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    organizationName: "",
    acceptTerms: false,
  });
  const [otpCode, setOtpCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load plans when plan step is shown
  useEffect(() => {
    if (step === "plan" && plans.length === 0) loadPlans();
  }, [step]);

  const loadPlans = async () => {
    try {
      setLoadingPlans(true);
      // Use adminClient if user has token (after OTP verification), otherwise use apiClient
      const token = localStorage.getItem("token") || localStorage.getItem("authToken");
      const client = token ? adminClient : apiClient;
      const response = await client.get("/api/subscription/plans");
      const backendPlans = response.data || [];
      
      const transformed = backendPlans.map((p: any) => ({
        id: p.id,
        name: p.name,
        displayName: p.displayName,
        price: p.price,
        priceUnit: p.priceUnit,
        description: p.description,
        maxMessagesPerMonth: p.maxMessagesPerMonth,
        maxUsers: p.maxUsers,
        isPerUser: p.isPerUser,
      }));
      
      setPlans(transformed);
    } catch (error: any) {
      console.error("Failed to load plans:", error);
      toast.error("Failed to load subscription plans");
    } finally {
      setLoadingPlans(false);
    }
  };

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

    if (!isSuperAdmin && !formData.organizationName.trim()) {
      newErrors.organizationName = "Organization name is required";
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
        // Regular user signup - requires OTP verification (plan selection comes after OTP)
        const response = await apiClient.post("/api/auth/signup", {
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          organizationName: formData.organizationName,
          planName: null, // Plan will be selected after OTP verification
        });

        if (response.data.requiresVerification) {
          toast.success("Account created! Please check your email for the verification code.");
          setStep("otp");
        } else {
          // Handle post-verification redirect
          if (response.data.token) {
            localStorage.setItem("token", response.data.token);
            localStorage.setItem("authToken", response.data.token);
            
            if (response.data.redirectTo === "checkout") {
              // Redirect to Stripe checkout for paid plans
              const origin = typeof window !== "undefined" ? window.location.origin : "";
              const checkoutBody: { planName: string; successUrl?: string; cancelUrl?: string } = { planName: selectedPlan };
              if (origin) {
                checkoutBody.successUrl = `${origin}/billing?session_id={CHECKOUT_SESSION_ID}`;
                checkoutBody.cancelUrl = `${origin}/billing?canceled=true`;
              }
              const checkoutResponse = await apiClient.post("/api/subscription/create-checkout-session", checkoutBody);
              if (checkoutResponse.data.url) {
                window.location.href = checkoutResponse.data.url;
                return;
              }
            } else {
              toast.success("Account created successfully!");
              navigate("/chat");
            }
          } else {
            toast.success("Account created! Please log in.");
            navigate("/login");
          }
        }
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      
      // Handle validation errors from backend
      const responseData = error?.response?.data;
      const newErrors: Record<string, string> = {};
      
      if (responseData?.errors) {
        // Backend returned field-specific validation errors
        Object.keys(responseData.errors).forEach((field) => {
          newErrors[field] = responseData.errors[field];
        });
        setErrors(newErrors);
        
        // Show first error in toast
        const firstError = Object.values(responseData.errors)[0] as string;
        toast.error(firstError);
      } else if (responseData?.message) {
        // Single error message
        const errorMessage = responseData.message;
        const errorField = responseData.field;
        
        // Use field from backend if provided, otherwise try to infer from message
        if (errorField) {
          newErrors[errorField] = errorMessage;
        } else if (errorMessage.toLowerCase().includes("email")) {
          newErrors.email = errorMessage;
        } else if (errorMessage.toLowerCase().includes("password")) {
          newErrors.password = errorMessage;
        } else if (errorMessage.toLowerCase().includes("full name") || errorMessage.toLowerCase().includes("fullname")) {
          newErrors.fullName = errorMessage;
        } else if (errorMessage.toLowerCase().includes("organization")) {
          newErrors.organizationName = errorMessage;
        } else {
          // Generic error - show in toast but don't block form
          toast.error(errorMessage);
        }
        
        setErrors(newErrors);
      } else {
        // Generic error
        toast.error("Failed to create account. Please check your information and try again.");
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
        setOtpVerified(true);
        
        // After OTP verification, show plan selection
        toast.success("Email verified! Please select your plan.");
        setStep("plan");
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

  const handlePlanSelected = (planName: string) => {
    if (planName === "ENTERPRISE") return;
    setSelectedPlan(planName);
    setStep("coupon");
  };

  const handleProceedToCheckout = async (couponCode?: string) => {
    if (!selectedPlan) return;
    setIsLoading(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const body: { planName: string; couponCode?: string; successUrl?: string; cancelUrl?: string } = { planName: selectedPlan };
      if (couponCode?.trim()) body.couponCode = couponCode.trim();
      if (origin) {
        body.successUrl = `${origin}/billing?session_id={CHECKOUT_SESSION_ID}`;
        body.cancelUrl = `${origin}/billing?canceled=true`;
      }
      const checkoutResponse = await adminClient.post("/api/subscription/create-checkout-session", body);
      if (checkoutResponse.data.url) {
        toast.success("Redirecting to payment...");
        window.location.href = checkoutResponse.data.url;
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error?.response?.data?.message || "Failed to start checkout. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipForNow = async () => {
    setIsLoading(true);
    try {
      const response = await adminClient.post("/api/subscription/create-free", {});
      if (response.data?.success) {
        toast.success("Free plan activated! Welcome.");
        navigate("/chat");
      }
    } catch (error: any) {
      console.error("Skip for now error:", error);
      toast.error(error?.response?.data?.message || "Failed to continue. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const validateCouponForSignup = async (code: string) => {
    try {
      const res = await apiClient.get("/api/subscription/validate-coupon-by-email", {
        params: { code, email: formData.email.trim() },
      });
      return {
        valid: !!res.data?.valid,
        planName: res.data?.planName,
        message: res.data?.message,
      };
    } catch (e: any) {
      return {
        valid: false,
        message: e?.response?.data?.message || "Could not validate coupon",
      };
    }
  };

  // Coupon prompt step (after plan selection)
  if (step === "coupon" && selectedPlan) {
    const plan = plans.find((p: any) => p.name === selectedPlan);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground">Almost there</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {plan?.displayName || selectedPlan} — {plan?.price === 0 ? "Free" : `$${plan?.price}/${plan?.priceUnit || "mo"}`}
            </p>
          </div>
          <CouponCheckoutPrompt
            planName={selectedPlan}
            planDisplayName={plan?.displayName}
            onProceed={handleProceedToCheckout}
            onCancel={() => setStep("plan")}
            validateCoupon={validateCouponForSignup}
            disabled={isLoading}
          />
          <p className="text-center text-sm text-muted-foreground">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-primary hover:text-primary/80"
            >
              Already have an account? Sign in
            </button>
          </p>
        </div>
      </div>
    );
  }

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
                "w-full py-2.5 rounded-full font-medium text-sm transition-all duration-200",
                "text-white hover:opacity-90",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              style={{ background: 'linear-gradient(to right, #FEBE40 0%, #E40B7B 100%)' }}
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

  // Plan Selection Step
  if (step === "plan" && !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-4xl space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">Choose your plan</h1>
            <p className="text-sm text-muted-foreground">
              Select a subscription plan to get started
            </p>
          </div>
          
          {loadingPlans ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground ml-2">Loading plans...</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No plans available. Please try again.</p>
              <button
                onClick={() => loadPlans()}
                className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
              >
                Retry
              </button>
            </div>
          ) : (() => {
              const signupPlans = (plans as any[]).filter((p: any) => ["BASIC", "PRO", "ENTERPRISE"].includes(p.name));
              if (signupPlans.length === 0) {
                return (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No plans available. Please try again.</p>
                    <button onClick={() => loadPlans()} className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">Retry</button>
                  </div>
                );
              }
              return (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {signupPlans.map((plan: any) => (
                  <div
                    key={plan.name}
                    onClick={() => plan.name !== "ENTERPRISE" && setSelectedPlan(plan.name)}
                    className={cn(
                      "relative flex flex-col p-5 rounded-xl border transition-all",
                      plan.name !== "ENTERPRISE" && "cursor-pointer",
                      selectedPlan === plan.name
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:border-primary/50"
                    )}
                  >
                    <div className="space-y-3 mb-4">
                      <h3 className="text-base font-semibold text-foreground">{plan.displayName}</h3>
                      {plan.name === "ENTERPRISE" ? (
                        <p className="text-sm text-muted-foreground">Contact us</p>
                      ) : (
                        <>
                          <p className="text-xs text-muted-foreground">{plan.description}</p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-foreground">
                              ${plan.price}
                            </span>
                            {plan.priceUnit && (
                              <span className="text-sm text-muted-foreground">/{plan.priceUnit}</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {plan.name === "ENTERPRISE" ? (
                      <div className="flex-1 mb-4" />
                    ) : (
                      <div className="flex-1 mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs text-foreground">
                            <Check className="h-4 w-4 text-primary flex-shrink-0" />
                            <span>{plan.maxMessagesPerMonth?.toLocaleString()} messages/month</span>
                          </div>
                          {plan.maxUsers != null && plan.maxUsers > 0 && (
                            <div className="flex items-center gap-2 text-xs text-foreground">
                              <Check className="h-4 w-4 text-primary flex-shrink-0" />
                              <span>Up to {plan.maxUsers} users</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {plan.name === "ENTERPRISE" ? (
                      <span
                        className="w-full py-2.5 rounded-lg font-medium text-sm text-center border border-chat-input-border bg-chat-input-bg text-muted-foreground inline-block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Contact us
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlanSelected(plan.name);
                        }}
                        disabled={isLoading}
                        className={cn(
                          "w-full py-2.5 rounded-lg font-medium text-sm transition-colors",
                          selectedPlan === plan.name
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "border border-chat-input-border bg-chat-input-bg text-foreground hover:bg-chat-hover",
                          isLoading && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {selectedPlan === plan.name ? "Selected" : "Select Plan"}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* <p className="text-center">
                <button
                  type="button"
                  onClick={handleSkipForNow}
                  disabled={isLoading}
                  className="text-sm text-primary underline underline-offset-2 hover:text-primary/80 transition-colors disabled:opacity-50"
                >
                  Skip for now
                </button>
              </p> */}
            </>
          );
          })()}
          
          <div className="text-center">
            <button
              onClick={() => navigate("/login")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Already have an account? Sign in
            </button>
          </div>
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
            {selectedPlan && `Selected: ${plans.find(p => p.name === selectedPlan)?.displayName || selectedPlan}`}
          </p>
          {selectedPlan && (
            <button
              onClick={() => setStep("plan")}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Change plan
            </button>
          )}
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

          {/* Organization Name - not required for super admin */}
          {!isSuperAdmin && (
            <div className="space-y-1.5">
              <label htmlFor="organizationName" className="text-sm font-medium text-foreground">
                Organization Name
              </label>
              <input
                id="organizationName"
                type="text"
                value={formData.organizationName}
                onChange={(e) => updateField("organizationName", e.target.value)}
                className={cn(
                  "w-full px-3 py-2.5 rounded-lg border bg-chat-input-bg text-sm outline-none transition-colors",
                  errors.organizationName
                    ? "border-destructive focus:border-destructive"
                    : "border-chat-input-border focus:border-chat-input-focus"
                )}
                placeholder="Acme Corporation"
                disabled={isLoading}
              />
              {errors.organizationName && (
                <p className="text-xs text-destructive">{errors.organizationName}</p>
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
                {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
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
                {showConfirmPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
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
                  <Link to="/terms-of-use" className="text-primary hover:text-primary/80">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy-policy" className="text-primary hover:text-primary/80">
                    Privacy Policy
                  </Link>
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
            disabled={isLoading}
            className={cn(
              "w-full py-2.5 rounded-full font-medium text-sm transition-all duration-200",
              "text-white hover:opacity-90",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            style={{ background: 'linear-gradient(to right, #FEBE40 0%, #E40B7B 100%)' }}
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
