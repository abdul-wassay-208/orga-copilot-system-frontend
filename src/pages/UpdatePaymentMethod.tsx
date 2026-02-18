import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminClient } from "@/lib/api-client";
import { toast } from "sonner";

export default function UpdatePaymentMethodPage() {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);
  const [loading, setLoading] = useState(false);
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
          toast.error("Billing is managed by your organization's administrator.");
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

  const openStripePortal = async () => {
    if (loading) return;
    try {
      setLoading(true);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const res = await adminClient.post("/api/subscription/billing-portal", {
        returnUrl: origin ? `${origin}/billing` : undefined,
      });
      const url = res.data?.url;
      if (!url) throw new Error("No billing portal URL returned");
      window.location.href = url;
    } catch (e: any) {
      console.error("Failed to open Stripe billing portal:", e);
      toast.error(e?.response?.data?.message || "Failed to open Stripe billing portal");
    } finally {
      setLoading(false);
    }
  };

  if (checkingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (userRole !== "TENANT_ADMIN" && userRole !== "SUPER_ADMIN") {
    return null; // Will redirect via checkAccess
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            to="/billing"
            className="p-2 -ml-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-chat-hover transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold text-foreground">Update Payment Method</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-8">
        <div className="space-y-5">
          <div className="p-4 rounded-lg border border-border bg-card text-sm text-muted-foreground">
            Payment methods are stored and updated securely in Stripe. Click below to update your saved card.
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={openStripePortal}
              disabled={loading}
              className={cn(
                "w-full py-2.5 rounded-lg font-medium text-sm transition-all",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Opening Stripe…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Open Stripe to update card
                  <ExternalLink className="h-4 w-4" />
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate("/billing")}
              disabled={loading}
              className="w-full py-2.5 rounded-lg border border-chat-input-border text-sm font-medium hover:bg-chat-hover transition-colors disabled:opacity-50"
            >
              Back to Billing
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
