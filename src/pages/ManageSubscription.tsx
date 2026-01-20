import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, CreditCard, Calendar, Tag, AlertCircle, Users, Building2, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SubscriptionPlans } from "@/components/SubscriptionPlans";
import { adminClient } from "@/lib/api-client";
import { toast } from "sonner";

type SubscriptionType = "individual" | "organization";

interface IndividualSubscription {
  type: "individual";
  plan: string;
  billingCycle: string;
  status: "active" | "trial" | "past_due" | "canceled";
  renewalDate: Date;
  coupon: string | null;
  usage: {
    current: number;
    limit: number;
  };
}

interface OrganizationSubscription {
  type: "organization";
  organizationName: string;
  plan: string;
  pricePerUser: number;
  activeUsers: number;
  billingCycle: string;
  status: "active" | "trial" | "past_due" | "canceled";
  renewalDate: Date;
  coupon: string | null;
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
  
  useEffect(() => {
    checkAccess();
    
    // Handle Stripe checkout redirect
    const sessionId = searchParams.get("session_id");
    const canceled = searchParams.get("canceled");
    
    if (sessionId) {
      toast.success("Payment successful! Your subscription is now active.");
      // Reload subscription data
      setTimeout(() => {
        if (!checkingRole) {
          loadSubscription();
        }
      }, 1000);
    } else if (canceled) {
      toast.info("Payment was canceled. You can try again anytime.");
    }
  }, []);

  const checkAccess = async () => {
    try {
      const response = await adminClient.get("/api/auth/me");
      const role = response.data?.role;
      setUserRole(role);
      
      // Only allow TENANT_ADMIN or SUPER_ADMIN to access billing
      // Employees should be redirected
      if (role !== "TENANT_ADMIN" && role !== "SUPER_ADMIN") {
        toast.error("Access denied. Billing is only available to administrators.");
        navigate("/chat", { replace: true });
        return;
      }
    } catch (error: any) {
      console.error("Failed to verify access:", error);
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        toast.error("Please log in to continue.");
        navigate("/login", { replace: true });
      } else {
        toast.error("Access denied. Billing is only available to administrators.");
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
  const loadingRef = useRef(false);
  
  useEffect(() => {
    if (!checkingRole && userRole && !loadingRef.current) {
      loadSubscription();
    }
  }, [checkingRole, userRole]);
  
  // Handle searchParams separately to avoid duplicate calls
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (sessionId && !loadingRef.current) {
      loadSubscription();
    }
  }, [searchParams]);
  
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
      
      if (status && status.hasSubscription) {
        const isOrg = status.type === "organization";
        setSubscription(isOrg ? {
          type: "organization",
          organizationName: me.tenantName || status.organizationName || "Organization",
          plan: status.plan.displayName,
          pricePerUser: status.plan.isPerUser ? status.plan.price : 0,
          activeUsers: metrics.currentUsers || 0,
          billingCycle: "Monthly",
          status: status.status.toLowerCase() as any,
          renewalDate: status.renewalDate ? new Date(status.renewalDate) : new Date(),
          coupon: null,
          usage: {
            current: metrics.messagesThisMonth || 0,
            limit: status.plan.maxMessagesPerMonth || 0,
          },
        } : {
          type: "individual",
          plan: status.plan.displayName,
          billingCycle: "Monthly",
          status: status.status.toLowerCase() as any,
          renewalDate: status.renewalDate ? new Date(status.renewalDate) : new Date(),
          coupon: null,
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

  const handlePlanUpgrade = async (planName: string) => {
    if (planName === "FREE") {
      toast.info("You're already on the Free plan or can downgrade by canceling your current subscription.");
      return;
    }
    
    try {
      const response = await adminClient.post("/api/subscription/create-checkout-session", {
        planName: planName,
      });
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error: any) {
      console.error("Failed to create checkout session:", error);
      toast.error(error?.response?.data?.message || "Failed to upgrade plan");
    }
  };

  const handleManageSubscription = async () => {
    try {
      // Open Stripe customer portal for managing existing subscription
      const response = await adminClient.post("/api/subscription/create-checkout-session", {
        planName: subscription?.plan === "Free Plan" ? "STANDARD" : 
                 subscription?.plan === "Standard Plan" ? "STANDARD" : "ENTERPRISE",
      });
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error: any) {
      console.error("Failed to create checkout session:", error);
      toast.error(error?.response?.data?.message || "Failed to manage subscription");
    }
  };
  
  if (checkingRole || loading || !subscription) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statusDisplay = getStatusDisplay(subscription.status);
  const isOrg = subscription.type === "organization";
  const monthlyEstimate = isOrg ? subscription.pricePerUser * subscription.activeUsers : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => {
              // Try to go back in history, otherwise go to chat
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate("/chat");
              }
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
        {/* Subscription Plans - Only show when user wants to change plan */}
        {showPlans && (
          <div className="space-y-4">
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
            <SubscriptionPlans 
              onSelectPlan={(planName) => {
                setSelectedPlanForUpgrade(planName);
                handlePlanUpgrade(planName);
              }}
              selectedPlanName={selectedPlanForUpgrade}
            />
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
              {isOrg && (
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

              {/* Active Users (Org only) */}
              {isOrg && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-muted">
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Active users</p>
                    <p className="text-sm font-medium text-foreground">{subscription.activeUsers} users</p>
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

              {/* Renewal Date */}
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-md bg-muted">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {subscription.status === "canceled" ? "Ends On" : "Renews On"}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {subscription.renewalDate.toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
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

            {/* Monthly Estimate (Org only) */}
            {isOrg && monthlyEstimate !== null && (
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Monthly estimated cost</p>
                  <p className="text-lg font-semibold text-foreground">${monthlyEstimate.toFixed(2)}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {subscription.activeUsers} users × ${subscription.pricePerUser}/user
                </p>
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
          </div>

          {/* Footer Note */}
          <p className="text-xs text-muted-foreground text-center">
            Subscription management is handled securely through Stripe.
          </p>
        </section>
      </main>
    </div>
  );
}
