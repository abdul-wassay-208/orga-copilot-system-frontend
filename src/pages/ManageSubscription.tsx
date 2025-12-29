import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, CreditCard, Calendar, Tag, AlertCircle, Users, Building2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { SubscriptionPlans } from "@/components/SubscriptionPlans";

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
  
  // Mock: In real app, this would come from auth context
  const isOrganizationAdmin = true;
  
  const [subscription] = useState<Subscription>(
    isOrganizationAdmin
      ? {
          type: "organization",
          organizationName: "Acme Inc",
          plan: "Per-User Plan",
          pricePerUser: 12,
          activeUsers: 8,
          billingCycle: "Monthly",
          status: "active",
          renewalDate: new Date("2024-04-15"),
          coupon: null,
          usage: {
            current: 4500,
            limit: 10000,
          },
        }
      : {
          type: "individual",
          plan: "Professional",
          billingCycle: "Monthly",
          status: "active",
          renewalDate: new Date("2024-04-15"),
          coupon: null,
          usage: {
            current: 847,
            limit: 1000,
          },
        }
  );

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
    }
  };

  const statusDisplay = getStatusDisplay(subscription.status);

  const handleManageSubscription = () => {
    window.open("https://billing.stripe.com/p/login/test", "_blank");
  };

  const isOrg = subscription.type === "organization";
  const monthlyEstimate = isOrg ? subscription.pricePerUser * subscription.activeUsers : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            to="/admin"
            className="p-2 -ml-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-chat-hover transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold text-foreground">
            {isOrg ? "Organization Subscription" : "Subscription"}
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Subscription Plans */}
        <SubscriptionPlans />

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
            <button
              onClick={handleManageSubscription}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
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
