import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, CreditCard, Calendar, Tag, AlertCircle, Users, Building2, Info, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { SubscriptionPlans } from "@/components/SubscriptionPlans";
import { CouponCheckoutPrompt } from "@/components/CouponCheckoutPrompt";
import { adminClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type SubscriptionType = "individual" | "organization";

interface IndividualSubscription {
  type: "individual";
  plan: string;
  billingCycle: string;
  status: "active" | "trial" | "past_due" | "canceled";
  renewalDate: Date;
  coupon: string | null;
  couponPlan?: boolean; // true when plan is from coupon (1 month from apply, then fall back to Free)
  usage: {
    current: number;
    limit: number;
  };
}

interface ProratedRecord {
  addedAt: string;
  newQuantity: number;
  proratedAmountCents: number;
  cycleAmountCents: number;
}

interface OrganizationSubscription {
  type: "organization";
  organizationName: string;
  plan: string;
  pricePerUser: number;
  planPrice: number; // Fixed price for non-per-user plans
  activeUsers: number;
  totalUsers?: number; // For per-user billing display
  totalMonthlyCostCents?: number; // Total monthly cost in cents (per-user plans)
  upcomingInvoiceAmountCents?: number; // Next invoice amount in cents
  proratedBillingHistory?: ProratedRecord[];
  billingCycle: string;
  status: "active" | "trial" | "past_due" | "canceled";
  renewalDate: Date;
  coupon: string | null;
  couponPlan?: boolean;
  usage: {
    current: number;
    limit: number;
  };
}

type Subscription = IndividualSubscription | OrganizationSubscription;

export default function ManageSubscriptionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);
  const redirectedNonAdmin = useRef(false);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const response = await adminClient.get("/api/auth/me");
      const role = response.data?.role;
      setUserRole(role);
      
      if (role !== "TENANT_ADMIN" && role !== "SUPER_ADMIN") {
        if (!redirectedNonAdmin.current) {
          redirectedNonAdmin.current = true;
          toast.error("Billing is managed by your organization's administrator. Please contact them for payment or subscription questions.");
          navigate("/chat", { replace: true });
        }
        return;
      }
    } catch (error: any) {
      console.error("Failed to verify access:", error);
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        if (!redirectedNonAdmin.current) {
          redirectedNonAdmin.current = true;
          toast.error("Please log in to continue.");
          navigate("/login", { replace: true });
        }
      } else if (!redirectedNonAdmin.current) {
        redirectedNonAdmin.current = true;
        toast.error("Billing is managed by your organization's administrator.");
        navigate("/chat", { replace: true });
      }
    } finally {
      setCheckingRole(false);
    }
  };
  
  // Mock: In real app, this would come from auth context
  const isOrganizationAdmin = userRole === "TENANT_ADMIN" || userRole === "SUPER_ADMIN";
  
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPlans, setShowPlans] = useState(false);
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const loadingRef = useRef(false);
  const plansSectionRef = useRef<HTMLDivElement>(null);
  const [couponCode, setCouponCode] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponValid, setCouponValid] = useState<{ planName: string } | null>(null);
  const [isSuperAdminBilling, setIsSuperAdminBilling] = useState(false);
  
  // Handle Stripe checkout redirect first, then load data
  useEffect(() => {
    if (checkingRole) return; // Wait for role check
    
    const sessionId = searchParams.get("session_id");
    const canceled = searchParams.get("canceled");
    
    if (sessionId) {
      // Verify checkout session first, then load subscription
      verifyCheckoutSession(sessionId);
    } else if (canceled) {
      toast.info("Payment was canceled. You can try again anytime.");
      // Load subscription after cancel message
      if (userRole && !loadingRef.current) {
        loadSubscription();
      }
    } else if (userRole && !loadingRef.current) {
      // Only load subscription if no session_id (normal page load)
      loadSubscription();
    }
  }, [checkingRole, userRole, searchParams]);

  // When user clicks "Change Plan", scroll the plans section into view
  useEffect(() => {
    if (!showPlans) return;
    const id = requestAnimationFrame(() => {
      plansSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(id);
  }, [showPlans]);

  const verifyCheckoutSession = async (sessionId: string) => {
    if (loadingRef.current) return; // Prevent duplicate calls
    
    try {
      setLoading(true);
      const response = await adminClient.post("/api/subscription/verify-checkout", {
        sessionId: sessionId,
      });
      if (response.data.success) {
        toast.success("Payment successful! Your subscription is now active.");
      }
    } catch (error: any) {
      console.error("Failed to verify checkout:", error);
      // Still try to reload in case webhook already processed it
      toast.success("Payment successful! Verifying subscription...");
    }
    
    // Always reload subscription data after verification attempt
    // Reset loadingRef to allow loadSubscription to run
    loadingRef.current = false;
    await loadSubscription();
  };
  
  const loadSubscription = async () => {
    if (loadingRef.current) return; // Prevent duplicate calls
    loadingRef.current = true;
    
    try {
      setLoading(true);
      const [statusResponse, metricsResponse, meResponse] = await Promise.allSettled([
        adminClient.get("/api/subscription/status"),
        adminClient.get("/api/admin/tenant/usage/metrics"),
        adminClient.get("/api/auth/me"),
      ]);
      
      const status = statusResponse.status === 'fulfilled' ? statusResponse.value.data : null;
      const metrics = metricsResponse.status === 'fulfilled' ? metricsResponse.value.data : {};
      const me = meResponse.status === 'fulfilled' ? meResponse.value.data : {};
      
      // Super Admins manage subscriptions per-org from Super Admin dashboard; don't show a tenant's subscription
      if (status && status.isSuperAdmin === true) {
        setIsSuperAdminBilling(true);
        setSubscription({
          type: "organization",
          organizationName: "",
          plan: "Free Plan",
          pricePerUser: 0,
          planPrice: 0,
          activeUsers: 0,
          totalUsers: 0,
          billingCycle: "Monthly",
          status: "active",
          renewalDate: new Date(),
          coupon: null,
          usage: { current: 0, limit: 0 },
        });
        return;
      }
      
      if (status && status.hasSubscription) {
        const isOrg = status.type === "organization";
        const renewalDate = status.accessUntil ? new Date(status.accessUntil) : (status.renewalDate ? new Date(status.renewalDate) : new Date());
        const couponPlan = !!status.couponPlan;
        setSubscription(isOrg ? {
          type: "organization",
          organizationName: me.tenantName || status.organizationName || "Organization",
          plan: status.plan.displayName,
          pricePerUser: status.plan.isPerUser ? status.plan.price : 0,
          planPrice: status.plan.isPerUser ? 0 : (status.plan.price || 0),
          activeUsers: metrics.currentUsers || status.totalUsers || 0,
          totalUsers: status.totalUsers,
          totalMonthlyCostCents: status.totalMonthlyCostCents,
          upcomingInvoiceAmountCents: status.upcomingInvoiceAmountCents,
          proratedBillingHistory: status.proratedBillingHistory || [],
          billingCycle: "Monthly",
          status: status.status.toLowerCase() as any,
          renewalDate,
          coupon: null,
          couponPlan,
          usage: {
            current: metrics.messagesThisMonth || 0,
            limit: status.plan.maxMessagesPerMonth || 0,
          },
        } : {
          type: "individual",
          plan: status.plan.displayName,
          billingCycle: "Monthly",
          status: status.status.toLowerCase() as any,
          renewalDate,
          coupon: null,
          couponPlan,
          usage: {
            current: metrics.messagesThisMonth || 0,
            limit: status.plan.maxMessagesPerMonth || 0,
          },
        });
      } else {
        // No subscription - default to FREE
        setSubscription(isOrganizationAdmin ? {
          type: "organization",
          organizationName: me.tenantName || "Organization",
          plan: "Free Plan",
          pricePerUser: 0,
          planPrice: 0,
          activeUsers: metrics.currentUsers || 0,
          billingCycle: "Monthly",
          status: "active",
          renewalDate: new Date(),
          coupon: null,
          usage: {
            current: metrics.messagesThisMonth || 0,
            limit: 500,
          },
        } : {
          type: "individual",
          plan: "Free Plan",
          billingCycle: "Monthly",
          status: "active",
          renewalDate: new Date(),
          coupon: null,
          usage: {
            current: metrics.messagesThisMonth || 0,
            limit: 500,
          },
        });
      }
    } catch (error: any) {
      console.error("Failed to load subscription:", error);
      toast.error("Failed to load subscription information");
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const getStatusDisplay = (status: Subscription["status"]) => {
    switch (status) {
      case "active":
        return { label: "Active", className: "bg-green-500/10 text-green-600 dark:text-green-400" };
      case "trial":
        return { label: "Trial", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" };
      case "past_due":
        return { label: "Past Due", className: "bg-red-500/10 text-red-600 dark:text-red-400" };
      case "canceled":
        return { label: "Canceled", className: "bg-muted text-muted-foreground" };
      default:
        return { label: "Active", className: "bg-green-500/10 text-green-600 dark:text-green-400" };
    }
  };

  const handlePlanSelected = (planName: string) => {
    if (planName === "FREE") {
      toast.info("You're already on the Free plan or can downgrade by canceling your current subscription.");
      return;
    }
    if (planName === "ENTERPRISE") {
      toast.info("Contact us for Enterprise pricing and custom solutions.");
      return;
    }
    setSelectedPlanForUpgrade(planName);
  };

  const handleProceedToCheckout = async (couponCode?: string) => {
    if (!selectedPlanForUpgrade) return;
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const body: { planName: string; couponCode?: string; successUrl?: string; cancelUrl?: string } = { planName: selectedPlanForUpgrade };
      if (couponCode?.trim()) body.couponCode = couponCode.trim();
      if (origin) {
        body.successUrl = `${origin}/billing?session_id={CHECKOUT_SESSION_ID}`;
        body.cancelUrl = `${origin}/billing?canceled=true`;
      }
      const response = await adminClient.post("/api/subscription/create-checkout-session", body);
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error: any) {
      console.error("Failed to create checkout session:", error);
      toast.error(error?.response?.data?.message || "Failed to upgrade plan");
    }
  };

  const validateCouponForBilling = async (code: string) => {
    try {
      const res = await adminClient.get("/api/subscription/validate-coupon", { params: { code } });
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

  const handleManageSubscription = async () => {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const body: { planName: string; successUrl?: string; cancelUrl?: string } = {
        planName: subscription?.plan === "Free Plan" ? "STANDARD" : 
                 subscription?.plan === "Standard Plan" ? "STANDARD" : "ENTERPRISE",
      };
      if (origin) {
        body.successUrl = `${origin}/billing?session_id={CHECKOUT_SESSION_ID}`;
        body.cancelUrl = `${origin}/billing?canceled=true`;
      }
      const response = await adminClient.post("/api/subscription/create-checkout-session", body);
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error: any) {
      console.error("Failed to create checkout session:", error);
      toast.error(error?.response?.data?.message || "Failed to manage subscription");
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      await adminClient.post("/api/subscription/cancel");
      toast.success("Subscription canceled. You will have access until the end of your billing period.");
      setShowCancelDialog(false);
      await loadSubscription();
    } catch (error: any) {
      console.error("Failed to cancel subscription:", error);
      toast.error(error?.response?.data?.message || "Failed to cancel subscription");
    } finally {
      setCancelling(false);
    }
  };
  
  if (checkingRole || loading || !subscription) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Super Admin: subscriptions are managed per organization from the Super Admin dashboard
  if (isSuperAdminBilling) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
            <button
              onClick={() => navigate("/chat")}
              className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-chat-hover transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">Manage Subscription</h1>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="p-6 rounded-xl border border-border bg-card text-center space-y-4">
            <p className="text-foreground font-medium">You are a Super Admin.</p>
            <p className="text-sm text-muted-foreground">
              Subscriptions are managed per organization. Use the Super Admin dashboard to view and manage each organization&apos;s subscription and billing.
            </p>
            <Link
              to="/super-admin"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Go to Super Admin dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay(subscription.status);
  const isOrg = subscription.type === "organization";
  const monthlyEstimate = isOrg 
    ? (subscription.pricePerUser > 0 
        ? subscription.pricePerUser * subscription.activeUsers 
        : subscription.planPrice) 
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => {
              // Navigate to billing page (admin billing tab)
              navigate("/admin?tab=billing");
            }}
            className="p-2 -ml-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-chat-hover transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">
            {isOrg ? "Organization Subscription" : "Subscription"}
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Single, persistent message for admin when payment failed — no repeated toasts or reloads */}
        {subscription.status === "past_due" && (
          <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-200">
            <p className="text-sm font-medium">Your last payment failed. Please update your payment method to avoid service interruption.</p>
            <Link to="/billing/payment-method" className="text-sm font-medium underline mt-2 inline-block">Update payment method</Link>
          </div>
        )}

        {/* Subscription Plans - Only show when user wants to change plan */}
        {showPlans && (
          <div ref={plansSectionRef} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Change Plan</h2>
              <button
                onClick={() => {
                  setShowPlans(false);
                  setSelectedPlanForUpgrade(null);
                }}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
            {selectedPlanForUpgrade && selectedPlanForUpgrade !== "ENTERPRISE" && selectedPlanForUpgrade !== "FREE" ? (
              <CouponCheckoutPrompt
                planName={selectedPlanForUpgrade}
                onProceed={handleProceedToCheckout}
                onCancel={() => setSelectedPlanForUpgrade(null)}
                validateCoupon={validateCouponForBilling}
              />
            ) : (
              <SubscriptionPlans 
                onSelectPlan={handlePlanSelected}
                selectedPlanName={selectedPlanForUpgrade}
              />
            )}
          </div>
        )}

        {/* Current Subscription Details */}
        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground">Current Subscription</h2>

          {/* Organization Header (Org only) */}
          {isOrg && (
            <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card">
              <div className="p-2.5 rounded-lg bg-muted">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Organization</p>
                <p className="text-base font-semibold text-foreground">{subscription.organizationName}</p>
              </div>
            </div>
          )}

          {/* Subscription Details */}
          <div className="p-5 rounded-lg border border-border bg-card space-y-5">
            {/* Plan & Status */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Current Plan</p>
                <p className="text-xl font-semibold text-foreground">{subscription.plan}</p>
              </div>
              <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", statusDisplay.className)}>
                {statusDisplay.label}
              </span>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
              {/* Per-User Price (Org only) */}
              {/* Price Per User (Org only, per-user plans) */}
              {isOrg && subscription.pricePerUser > 0 && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-muted">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Price per user</p>
                    <p className="text-sm font-medium text-foreground">${subscription.pricePerUser}/month</p>
                  </div>
                </div>
              )}
              
              {/* Plan Price (Org only, fixed-price plans) */}
              {isOrg && subscription.pricePerUser === 0 && subscription.planPrice > 0 && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-muted">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Plan price</p>
                    <p className="text-sm font-medium text-foreground">${subscription.planPrice}/month</p>
                  </div>
                </div>
              )}

              {/* Active Users (Org only) */}
              {isOrg && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-muted">
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total users</p>
                    <p className="text-sm font-medium text-foreground">
                      {(subscription as OrganizationSubscription).totalUsers ?? subscription.activeUsers} users
                    </p>
                  </div>
                </div>
              )}

              {/* Upcoming invoice (per-user plans with Stripe) */}
              {isOrg && (subscription as OrganizationSubscription).upcomingInvoiceAmountCents != null && (subscription as OrganizationSubscription).upcomingInvoiceAmountCents! > 0 && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-muted">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Upcoming invoice</p>
                    <p className="text-sm font-medium text-foreground">
                      ${((subscription as OrganizationSubscription).upcomingInvoiceAmountCents! / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {/* Total monthly cost (per-user plans) */}
              {isOrg && (subscription as OrganizationSubscription).totalMonthlyCostCents != null && (subscription as OrganizationSubscription).totalMonthlyCostCents! > 0 && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-muted">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total monthly</p>
                    <p className="text-sm font-medium text-foreground">
                      ${((subscription as OrganizationSubscription).totalMonthlyCostCents! / 100).toFixed(2)}/month
                    </p>
                  </div>
                </div>
              )}

              {/* Billing Cycle */}
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-md bg-muted">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Billing Cycle</p>
                  <p className="text-sm font-medium text-foreground">{subscription.billingCycle}</p>
                </div>
              </div>

              {/* Renewal / Access until (coupon = 1 month from apply, then fall back to Free) */}
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-md bg-muted">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {subscription.status === "canceled"
                      ? "Ends On"
                      : subscription.couponPlan
                        ? "Access until"
                        : "Renews On"}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {subscription.renewalDate.toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  {subscription.couponPlan && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Upgrade before this date or you&apos;ll fall back to Free plan.
                    </p>
                  )}
                </div>
              </div>

              {/* Coupon (if applied) */}
              {subscription.coupon && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-muted">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Applied Coupon</p>
                    <p className="text-sm font-medium text-foreground">{subscription.coupon}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Prorated billing history (when users added mid-cycle) */}
            {isOrg && (subscription as OrganizationSubscription).proratedBillingHistory && (subscription as OrganizationSubscription).proratedBillingHistory!.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="text-sm font-medium text-foreground mb-3">Prorated charges (users added mid-cycle)</h3>
                <div className="space-y-2">
                  {(subscription as OrganizationSubscription).proratedBillingHistory!.map((r: ProratedRecord, i: number) => (
                    <div key={i} className="flex justify-between items-center py-2 px-3 rounded-lg bg-muted/50 text-sm">
                      <span className="text-muted-foreground">
                        {new Date(r.addedAt).toLocaleDateString()} — {r.newQuantity} users
                      </span>
                      {r.proratedAmountCents > 0 && (
                        <span className="font-medium">${(r.proratedAmountCents / 100).toFixed(2)} prorated</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

              {/* Apply coupon (plan upgrade) */}
              {(!subscription.coupon || subscription.plan === "Free Plan") && (
                <div className="pt-3 border-t border-border space-y-2">
                  <p className="text-xs font-medium text-foreground">Have a coupon code?</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value.toUpperCase());
                        setCouponError(null);
                        setCouponValid(null);
                      }}
                      placeholder="e.g. BASIC-XXXXXXXX"
                      className="flex-1 px-3 py-2 rounded-lg border border-chat-input-border bg-chat-input-bg text-sm outline-none focus:border-chat-input-focus"
                      disabled={applyingCoupon}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const code = couponCode.trim();
                        if (!code) {
                          setCouponError("Enter a coupon code");
                          return;
                        }
                        setApplyingCoupon(true);
                        setCouponError(null);
                        setCouponValid(null);
                        try {
                          const res = await adminClient.get("/api/subscription/validate-coupon", { params: { code } });
                          if (res.data?.valid) {
                            setCouponValid({ planName: res.data.planName || "Basic or Pro" });
                          } else {
                            setCouponError(res.data?.message || "Invalid coupon");
                          }
                        } catch (e: any) {
                          setCouponError(e?.response?.data?.message || "Could not validate coupon");
                        } finally {
                          setApplyingCoupon(false);
                        }
                      }}
                      disabled={applyingCoupon || !couponCode.trim()}
                      className="px-3 py-2 rounded-lg border border-chat-input-border text-sm font-medium hover:bg-chat-hover disabled:opacity-50"
                    >
                      Validate
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const code = couponCode.trim();
                        if (!code) {
                          setCouponError("Enter a coupon code");
                          return;
                        }
                        setApplyingCoupon(true);
                        setCouponError(null);
                        try {
                          await adminClient.post("/api/subscription/apply-coupon", { code });
                          toast.success("Coupon applied. Your plan has been updated.");
                          setCouponCode("");
                          setCouponValid(null);
                          await loadSubscription();
                        } catch (e: any) {
                          const msg = e?.response?.data?.message || "Failed to apply coupon";
                          setCouponError(msg);
                          toast.error(msg);
                        } finally {
                          setApplyingCoupon(false);
                        }
                      }}
                      disabled={applyingCoupon || !couponCode.trim()}
                      className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                    >
                      Apply
                    </button>
                  </div>
                  {couponError && <p className="text-xs text-destructive">{couponError}</p>}
                  {couponValid && <p className="text-xs text-green-600 dark:text-green-400">Valid for {couponValid.planName}. Click Apply to activate.</p>}
                </div>
              )}

            {/* Details Grid end - Prorated and Apply coupon are inside card, below grid */}

            {/* Monthly Estimate (Org only) */}
            {isOrg && monthlyEstimate !== null && (
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Monthly estimated cost</p>
                  <p className="text-lg font-semibold text-foreground">${monthlyEstimate.toFixed(2)}</p>
                </div>
                {subscription.pricePerUser > 0 ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    {subscription.activeUsers} users × ${subscription.pricePerUser}/user
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    Fixed monthly price
                  </p>
                )}
              </div>
            )}

            {/* Past Due Warning */}
            {subscription.status === "past_due" && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">
                  Your payment is past due. Please update your payment method to avoid service interruption.
                </p>
              </div>
            )}
          </div>

          {/* Billing Info Note (Org only) */}
          {isOrg && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm text-foreground">You are billed based on the number of active users.</p>
                <p className="text-xs text-muted-foreground">
                  Adding or removing users will automatically adjust your monthly bill.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {!showPlans && (
              <button
                onClick={() => setShowPlans(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Change Plan
              </button>
            )}
            <button
              onClick={handleManageSubscription}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-chat-input-border bg-chat-input-bg text-sm font-medium text-foreground hover:bg-chat-hover transition-colors"
            >
              Manage Subscription
              <ExternalLink className="h-4 w-4" />
            </button>

            <button
              onClick={() => navigate("/billing/payment-method")}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-chat-input-border bg-chat-input-bg text-sm font-medium text-foreground hover:bg-chat-hover transition-colors"
            >
              <CreditCard className="h-4 w-4" />
              Update Payment Method
            </button>

            {subscription.status !== "canceled" && subscription.plan !== "Free Plan" && (
              <button
                onClick={() => setShowCancelDialog(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 text-sm font-medium transition-colors"
              >
                <XCircle className="h-4 w-4" />
                Cancel Subscription
              </button>
            )}
          </div>

          {/* Cancel Subscription Confirmation */}
          <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
            <AlertDialogContent className="sm:max-w-[425px]">
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your subscription will be canceled at the end of your current billing period. You will continue to have access until {subscription?.renewalDate?.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="sm:justify-end">
                <AlertDialogCancel disabled={cancelling}>Keep Subscription</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    handleCancelSubscription();
                  }}
                  disabled={cancelling}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel Subscription"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Footer Note */}
          <p className="text-xs text-muted-foreground text-center">
            Subscription management is handled securely through Stripe.
          </p>
        </section>
      </main>
    </div>
  );
}
