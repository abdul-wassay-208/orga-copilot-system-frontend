import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  CreditCard,
  Plus,
  MoreHorizontal,
  Trash2,
  RefreshCw,
  AlertTriangle,
  UserPlus,
  X,
  Loader2,
  ChevronRight,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PrivacyDisclaimer, PrivacyBadge } from "@/components/UsageLimitStates";
import { adminClient } from "@/lib/api-client";
import { toast } from "sonner";

type Tab = "users" | "billing";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "employee";
  status: "active" | "invited";
  messagesUsed?: number;
}


export default function AdminPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const response = await adminClient.get("/api/auth/me");
      const role = response.data?.role;
      setUserRole(role);
      
      // Redirect if not tenant admin or super admin
      if (role !== "TENANT_ADMIN" && role !== "SUPER_ADMIN") {
        toast.error("Access denied. Tenant admin access required.");
        navigate("/chat", { replace: true });
        return;
      }
    } catch (error: any) {
      console.error("Failed to verify access:", error);
      // Check if it's an auth error
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        toast.error("Please log in to continue.");
        navigate("/login", { replace: true });
      } else {
        toast.error("Access denied. Please log in with an admin account.");
        navigate("/chat", { replace: true });
      }
    } finally {
      setCheckingRole(false);
    }
  };

  const tabs = [
    { id: "users" as Tab, label: "Users", icon: Users },
    { id: "billing" as Tab, label: "Billing", icon: CreditCard },
  ];

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
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-chat-hover transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-foreground">Tenant Admin</h1>
                <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                  Organization
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Manage your organization</p>
            </div>
          </div>
          <PrivacyBadge />
        </div>
      </header>

      {/* Privacy disclaimer */}
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <PrivacyDisclaimer />
      </div>

      {/* Tabs */}
      <div className="border-b border-border sticky top-[73px] bg-background z-10">
        <div className="max-w-4xl mx-auto px-4">
          <nav className="flex gap-1 -mb-px overflow-x-auto scrollbar-thin">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  activeTab === tab.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === "users" && <UsersTab />}
        {activeTab === "billing" && <BillingTab />}
      </main>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "employee">("employee");
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminClient.get("/api/admin/tenant/users");
      const backendUsers = response.data || [];
      
      const transformed: User[] = backendUsers.map((u: any) => ({
        id: String(u.id),
        name: u.fullName || u.email.split("@")[0],
        email: u.email,
        role: u.role === "TENANT_ADMIN" ? "admin" : "employee",
        status: "active" as const, // All users from backend are active
        messagesUsed: u.messagesUsed || 0,
      }));
      
      setUsers(transformed);
    } catch (error: any) {
      console.error("Failed to load users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const activeUsersCount = users.filter((u) => u.status === "active").length;

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setIsInviting(true);
    
    try {
      await adminClient.post("/api/admin/tenant/users/invite", {
        email: inviteEmail,
        role: inviteRole === "admin" ? "TENANT_ADMIN" : "EMPLOYEE",
        fullName: inviteEmail.split("@")[0], // Default name from email
      });
      
      toast.success("User invited successfully");
      setShowInviteDialog(false);
      setInviteEmail("");
      setInviteRole("employee");
      await loadUsers();
    } catch (error: any) {
      console.error("Failed to invite user:", error);
      toast.error(error?.response?.data?.message || "Failed to invite user");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await adminClient.delete(`/api/admin/tenant/users/${id}`);
      toast.success("User removed successfully");
      setShowRemoveConfirm(null);
      await loadUsers();
    } catch (error: any) {
      console.error("Failed to remove user:", error);
      toast.error(error?.response?.data?.message || "Failed to remove user");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">Loading users...</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
          <Users className="h-7 w-7 text-muted-foreground/50" />
        </div>
        <div>
          <p className="text-foreground font-medium">No users added yet</p>
          <p className="text-sm text-muted-foreground mt-1">Invite team members to get started</p>
        </div>
        <button
          onClick={() => setShowInviteDialog(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Invite your first user
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Users Count & Billing Note */}
      <div className="p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{activeUsersCount}</p>
              <p className="text-sm text-muted-foreground">Active users</p>
            </div>
          </div>
          <button
            onClick={() => setShowInviteDialog(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Invite user
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5" />
          Active users count affects billing
        </p>
      </div>

      {/* Users list */}
      <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
        {users.map((user) => (
          <div key={user.id} className="flex items-center justify-between p-4 bg-card hover:bg-chat-hover/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <span className="text-sm font-medium text-muted-foreground">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Usage bar - numbers only, no content */}
              {user.messagesUsed !== undefined && (
                <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{user.messagesUsed}</span>
                  <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-primary/60" 
                      style={{ width: `${Math.min((user.messagesUsed / 500) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
              <span
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full font-medium",
                  user.status === "active"
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                )}
              >
                {user.status === "active" ? "Active" : "Invited"}
              </span>
              <span 
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full font-medium",
                  user.role === "admin" 
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {user.role === "admin" ? "Admin" : "Employee"}
              </span>
              <div className="relative group">
                <button className="p-2 rounded-lg hover:bg-chat-hover text-muted-foreground hover:text-foreground transition-colors">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                <div className="absolute right-0 mt-1 w-44 py-1 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  {user.status === "invited" && (
                    <button className="w-full px-3 py-2 text-sm text-left hover:bg-chat-hover flex items-center gap-2 text-foreground">
                      <RefreshCw className="h-3.5 w-3.5" />
                      Resend invite
                    </button>
                  )}
                  <button
                    onClick={() => setShowRemoveConfirm(user.id)}
                    className="w-full px-3 py-2 text-sm text-left hover:bg-chat-hover text-destructive flex items-center gap-2"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove user
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Invite Dialog */}
      {showInviteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
            onClick={() => setShowInviteDialog(false)}
          />
          <div className="relative bg-card border border-border rounded-xl shadow-lg p-6 max-w-sm mx-4 w-full space-y-5 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Invite user</h3>
              <button
                onClick={() => setShowInviteDialog(false)}
                className="p-1.5 rounded-lg hover:bg-chat-hover text-muted-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-chat-input-border bg-chat-input-bg text-sm outline-none focus:border-chat-input-focus focus:ring-2 focus:ring-chat-input-focus/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Role</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setInviteRole("employee")}
                    className={cn(
                      "flex-1 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all",
                      inviteRole === "employee"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-chat-input-border text-muted-foreground hover:border-chat-input-focus"
                    )}
                  >
                    Employee
                  </button>
                  <button
                    onClick={() => setInviteRole("admin")}
                    className={cn(
                      "flex-1 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all",
                      inviteRole === "admin"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-chat-input-border text-muted-foreground hover:border-chat-input-focus"
                    )}
                  >
                    Admin
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setShowInviteDialog(false)}
                className="px-4 py-2.5 rounded-lg border border-chat-input-border text-sm font-medium hover:bg-chat-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={!inviteEmail || isInviting}
                className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send invite"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Confirmation Dialog */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
            onClick={() => setShowRemoveConfirm(null)}
          />
          <div className="relative bg-card border border-border rounded-xl shadow-lg p-6 max-w-sm mx-4 w-full space-y-4 animate-scale-in">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Remove user?</h3>
              <p className="text-sm text-muted-foreground">
                This will revoke their access to the platform immediately.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRemoveConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-chat-input-border text-sm font-medium hover:bg-chat-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemove(showRemoveConfirm)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function BillingTab() {
  const [subscription, setSubscription] = useState({
    organizationName: "",
    plan: "BASIC",
    pricePerUser: 12,
    activeUsers: 0,
    status: "active" as "active" | "trial" | "past_due" | "grace",
    renewalDate: new Date(),
    graceDaysRemaining: 0,
    coupon: null as string | null,
    usage: {
      current: 0,
      limit: 0,
    },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      const [metricsResponse, meResponse] = await Promise.allSettled([
        adminClient.get("/api/admin/tenant/usage/metrics"),
        adminClient.get("/api/auth/me"),
      ]);
      
      const metrics = metricsResponse.status === 'fulfilled' ? metricsResponse.value.data : {};
      const me = meResponse.status === 'fulfilled' ? meResponse.value.data : {};
      
      setSubscription({
        organizationName: me.tenantName || "Organization",
        plan: metrics.subscriptionPlan || "BASIC",
        pricePerUser: 12, // Default pricing
        activeUsers: metrics.currentUsers || 0,
        status: "active",
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        graceDaysRemaining: 0,
        coupon: null,
        usage: {
          current: metrics.messagesThisMonth || 0,
          limit: metrics.maxMessagesPerMonth || 0,
        },
      });
    } catch (error: any) {
      console.error("Failed to load billing data:", error);
      // Don't show error toast if it's just a 403 (user might not have admin access)
      if (error?.response?.status !== 403) {
        toast.error("Failed to load billing information");
      }
    } finally {
      setLoading(false);
    }
  };

  const monthlyEstimate = subscription.pricePerUser * subscription.activeUsers;
  const usagePercent = subscription.usage.limit > 0 
    ? (subscription.usage.current / subscription.usage.limit) * 100 
    : 0;

  if (loading) {
    return (
      <div className="text-center py-16">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">Loading billing information...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Subscription Card */}
      <div className="p-5 rounded-xl border border-border bg-card space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{subscription.organizationName}</p>
            <p className="text-xl font-semibold text-foreground mt-0.5">{subscription.plan}</p>
          </div>
          <span
            className={cn(
              "text-xs px-2.5 py-1 rounded-full font-medium",
              subscription.status === "active"
                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                : subscription.status === "trial"
                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                : subscription.status === "grace"
                ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                : "bg-red-500/10 text-red-600 dark:text-red-400"
            )}
          >
            {subscription.status === "active"
              ? "Active"
              : subscription.status === "trial"
              ? "Trial"
              : subscription.status === "grace"
              ? "Grace Period"
              : "Past Due"}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground">Price per user</p>
            <p className="text-lg font-semibold text-foreground mt-0.5">${subscription.pricePerUser}</p>
            <p className="text-xs text-muted-foreground">/month</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Active users</p>
            <p className="text-lg font-semibold text-foreground mt-0.5">{subscription.activeUsers}</p>
            <p className="text-xs text-muted-foreground">users</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Monthly cost</p>
            <p className="text-lg font-semibold text-foreground mt-0.5">${monthlyEstimate}</p>
            <p className="text-xs text-muted-foreground">estimated</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Renewal date</p>
            <p className="text-lg font-semibold text-foreground mt-0.5">
              {subscription.renewalDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
            <p className="text-xs text-muted-foreground">
              {subscription.renewalDate.getFullYear()}
            </p>
          </div>
        </div>

        {subscription.coupon && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <span className="text-xs text-green-600 dark:text-green-400">
              Coupon applied: {subscription.coupon}
            </span>
          </div>
        )}
      </div>

      {/* Billing Info Note */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border border-border">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm text-foreground">You are billed based on the number of active users.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Adding or removing users will automatically adjust your monthly bill.
          </p>
        </div>
      </div>

      {/* Usage Summary - Numbers only */}
      <div className="p-5 rounded-xl border border-border bg-card space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Usage this period</p>
          <p className="text-sm font-semibold text-foreground">
            {subscription.usage.current.toLocaleString()} / {subscription.usage.limit.toLocaleString()}
          </p>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              usagePercent > 90 ? "bg-destructive" : usagePercent > 75 ? "bg-yellow-500" : "bg-primary"
            )}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
        {usagePercent > 75 && (
          <p className={cn(
            "text-xs flex items-center gap-1.5",
            usagePercent > 90 ? "text-destructive" : "text-yellow-600 dark:text-yellow-400"
          )}>
            <AlertTriangle className="h-3.5 w-3.5" />
            {usagePercent > 90 ? "Approaching limit" : "You're approaching your monthly usage limit"}
          </p>
        )}
      </div>

      {/* Manage Billing Link */}
      <Link
        to="/billing"
        className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-chat-hover transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Manage Subscription</p>
            <p className="text-xs text-muted-foreground">Update plan, payment method, and more</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </Link>
    </div>
  );
}
