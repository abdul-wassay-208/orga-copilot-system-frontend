import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
  ChevronLeft,
  Info,
  FileText,
  Upload,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import {  PrivacyBadge } from "@/components/UsageLimitStates";
import { adminClient } from "@/lib/api-client";
import { toast } from "sonner";

type Tab = "users" | "billing" | "transactions";

interface User {
  id: string | null;
  name: string;
  email: string;
  role: "admin" | "employee" | "super_admin";
  status: "active" | "pending";
  messagesUsed?: number;
  messagesLimit?: number;
  invitationTokenId?: number;
}

/** Backend uses Long.MAX_VALUE for unlimited; show ∞ in UI */
const UNLIMITED_LIMIT_THRESHOLD = 1e18;
function formatMessageLimit(limit: number): string {
  return limit >= UNLIMITED_LIMIT_THRESHOLD ? "∞" : limit.toLocaleString();
}
function isUnlimitedLimit(limit: number): boolean {
  return limit >= UNLIMITED_LIMIT_THRESHOLD;
}


export default function AdminPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const response = await adminClient.get("/api/auth/me");
      const role = response.data?.role; // Primary role for backward compatibility
      const roles = response.data?.roles || [role]; // All roles array
      setUserRole(role);
      setUserRoles(roles);
      
      // Redirect if not tenant admin or super admin
      const hasAdminAccess = roles.includes("TENANT_ADMIN") || roles.includes("SUPER_ADMIN");
      if (!hasAdminAccess) {
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

  if (checkingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Only show billing tab for admins (TENANT_ADMIN or SUPER_ADMIN), not employees
  const hasAdminAccess = userRoles.includes("TENANT_ADMIN") || userRoles.includes("SUPER_ADMIN");
  if (!hasAdminAccess) {
    return null; // Will redirect via checkAccess
  }

  const tabs = [
    { id: "users" as Tab, label: "Users", icon: Users },
    ...(hasAdminAccess
      ? [
          { id: "billing" as Tab, label: "Billing", icon: CreditCard },
          { id: "transactions" as Tab, label: "Transaction History", icon: Receipt },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/chat")}
              className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-chat-hover transition-colors flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-foreground">Admin</h1>
              <p className="text-xs text-muted-foreground">Manage your organization</p>
            </div>
          </div>
          
        </div>
      </header>

      {/* Privacy disclaimer */}
      {/* <div className="max-w-4xl mx-auto px-4 pt-4">
        <PrivacyDisclaimer />
      </div> */}

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
        {activeTab === "billing" && (userRole === "TENANT_ADMIN" || userRole === "SUPER_ADMIN") && <BillingTab />}
        {activeTab === "transactions" && (userRole === "TENANT_ADMIN" || userRole === "SUPER_ADMIN") && <TransactionHistoryTab />}
      </main>
    </div>
  );
}

function UsersTab() {
  const { theme } = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "employee">("employee");
  const [isInviting, setIsInviting] = useState(false);
  const [isFreePlan, setIsFreePlan] = useState(false);
  const [proratedPreview, setProratedPreview] = useState<{
    applicable: boolean;
    currentSeats?: number;
    newSeats?: number;
    estimatedProratedCents?: number;
    nextCycleTotalCents?: number;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchParam, setSearchParam] = useState("");
  const pageSize = 10;
  
  // Get tenant ID from URL query parameter (for super admin viewing specific tenant)
  const searchParams = new URLSearchParams(window.location.search);
  const tenantId = searchParams.get("tenant");

  useEffect(() => {
    const t = setTimeout(() => setSearchParam(searchQuery), 500);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    loadUsers(currentPage);
  }, [tenantId, currentPage, searchParam]);

  useEffect(() => {
    adminClient.get("/api/auth/me").then((r) => {
      if (r.data?.email) setCurrentUserEmail(r.data.email);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    adminClient.get("/api/subscription/status").then((r) => {
      const planName = r.data?.plan?.name;
      setIsFreePlan(planName === "FREE");
    }).catch(() => setIsFreePlan(false));
  }, []);

  useEffect(() => {
    if (showInviteDialog) {
      adminClient.get("/api/subscription/prorated-preview").then((r) => {
        setProratedPreview(r.data);
      }).catch(() => setProratedPreview(null));
    } else {
      setProratedPreview(null);
    }
  }, [showInviteDialog]);

  const loadUsers = async (page: number = 0) => {
    try {
      setLoading(true);
      const searchSegment = searchParam.trim() ? `&search=${encodeURIComponent(searchParam.trim())}` : "";
      const url = tenantId 
        ? `/api/admin/tenant/users?tenantId=${tenantId}&page=${page}&size=${pageSize}${searchSegment}`
        : `/api/admin/tenant/users?page=${page}&size=${pageSize}${searchSegment}`;
      const response = await adminClient.get(url);
      const responseData = response.data || {};
      const backendUsers = responseData.content || [];
      
      // Set pagination info
      setTotalPages(responseData.totalPages || 0);
      setTotalElements(responseData.totalElements || 0);
      
      const transformed: User[] = backendUsers.map((u: any) => {
        // Map backend role to frontend role
        let role: "admin" | "employee" | "super_admin" = "employee";
        if (u.role === "SUPER_ADMIN") {
          role = "super_admin";
        } else if (u.role === "TENANT_ADMIN") {
          role = "admin";
        }
        return {
          id: u.id ? String(u.id) : null,
          name: u.fullName || u.email.split("@")[0],
          email: u.email,
          role,
          status: u.status === "PENDING" ? "pending" : "active",
          messagesUsed: u.messagesUsed || 0,
          messagesLimit: u.messagesLimit ?? u.maxMessagesPerMonth ?? 0, // Use API value, default to 0 (FREE plan)
          invitationTokenId: u.invitationTokenId,
        };
      });
      
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
      await loadUsers(currentPage);
    } catch (error: any) {
      console.error("Failed to invite user:", error);
      toast.error(error?.response?.data?.message || "Failed to invite user");
    } finally {
      setIsInviting(false);
    }
  };

  const handleResendInvitation = async (email: string) => {
    try {
      await adminClient.post("/api/admin/tenant/users/resend-invitation", {
        email: email,
      });
      toast.success("Invitation resent successfully");
      await loadUsers(currentPage);
    } catch (error: any) {
      console.error("Failed to resend invitation:", error);
      toast.error(error?.response?.data?.message || "Failed to resend invitation");
    }
  };

  const handleRemove = async (id: string) => {
    if (!id) {
      toast.error("Cannot remove pending invitation. Please wait for it to expire.");
      return;
    }
    try {
      await adminClient.delete(`/api/admin/tenant/users/${id}`);
      toast.success("User removed successfully");
      setShowRemoveConfirm(null);
      await loadUsers(currentPage);
    } catch (error: any) {
      console.error("Failed to remove user:", error);
      toast.error(error?.response?.data?.message || "Failed to remove user");
    }
  };

  return (
    <div className="space-y-4">
      {/* Active Users Count & Billing Note */}
      <div className="p-4 rounded-xl bg-card border border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img
                src={"/assets/Invite-user-Light.svg"}
                alt="Invite user"
                className="h-14 w-14 object-contain"
              />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{activeUsersCount}</p>
              <p className="text-sm text-muted-foreground">
                Active users
                {totalElements > 0 && (
                  <span className="ml-1">
                    ({totalElements} {totalElements === 1 ? 'total' : 'total'}
                    {totalPages > 1 && ` · Page ${currentPage + 1} of ${totalPages}`})
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => !isFreePlan && setShowInviteDialog(true)}
            disabled={isFreePlan}
            title={isFreePlan ? "Upgrade to Basic or Pro to invite team members." : undefined}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-white text-sm font-medium hover:opacity-90 transition-all duration-200 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(to right, #FEBE40 0%, #E40B7B 100%)' }}
          >
            <Plus className="h-4 w-4" />
            Invite user
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5" />
          {isFreePlan ? "Upgrade to Basic or Pro to invite team members." : "Active users count affects billing"}
        </p>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
          <h3 className="text-sm font-medium text-foreground">All users</h3>
          {totalElements > 0 && (
            <span className="text-muted-foreground font-normal text-xs sm:text-sm">
              ({totalElements} total · Page {currentPage + 1} of {totalPages || 1})
            </span>
          )}
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(0);
            }}
            className="sm:ml-auto w-full sm:w-64 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading users…</span>
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground px-4 py-6">
            {searchParam.trim() ? "No users match your search." : "No users yet."}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left font-medium text-foreground px-4 py-3">Name</th>
                    <th className="text-left font-medium text-foreground px-4 py-3">Email</th>
                    <th className="text-left font-medium text-foreground px-4 py-3">Role</th>
                    <th className="text-left font-medium text-foreground px-4 py-3">Status</th>
                    <th className="text-right font-medium text-foreground px-4 py-3">Usage</th>
                    <th className="text-right font-medium text-foreground px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id || user.email} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 text-foreground">{user.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                      <td className="px-4 py-3">
                        <span 
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                            user.role === "super_admin"
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                              : user.role === "admin" 
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {user.role === "super_admin" ? "Super Admin" : user.role === "admin" ? "Admin" : "Employee"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                            user.status === "active"
                              ? "bg-green-500/10 text-green-600 dark:text-green-400"
                              : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                          )}
                        >
                          {user.status === "active" ? "Active" : "Pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">
                        {user.messagesUsed !== undefined && user.messagesLimit !== undefined ? (
                          <div className="flex items-center justify-end gap-2">
                            <span>{user.messagesUsed.toLocaleString()} / {formatMessageLimit(user.messagesLimit)}</span>
                            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div 
                                className="h-full rounded-full progress-gradient-fill" 
                                style={{ width: isUnlimitedLimit(user.messagesLimit) ? "0%" : `${Math.min((user.messagesUsed / user.messagesLimit) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {user.email !== currentUserEmail ? (
                          <div className="relative group inline-block">
                            <button className="p-1.5 rounded-lg hover:bg-chat-hover text-muted-foreground hover:text-foreground transition-colors">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            <div className="absolute right-0 bottom-full mb-1 w-44 py-1 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                              {user.status === "pending" && (
                                <button 
                                  onClick={() => handleResendInvitation(user.email)}
                                  className="w-full px-3 py-2 text-sm text-left hover:bg-chat-hover flex items-center gap-2 text-foreground"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                  Resend invite
                                </button>
                              )}
                              {user.id && (
                                <button
                                  onClick={() => setShowRemoveConfirm(user.id!)}
                                  className="w-full px-3 py-2 text-sm text-left hover:bg-chat-hover text-destructive flex items-center gap-2"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Remove user
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/10">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage((p) => Math.max(0, p - 1));
                  }}
                  disabled={currentPage === 0}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-chat-input-border text-sm font-medium hover:bg-chat-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4 mt-0.5" />
                  Previous
                </button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage + 1} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage((p) => Math.min(totalPages - 1, p + 1));
                  }}
                  disabled={currentPage >= totalPages - 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  style={{ background: 'linear-gradient(to right, #FEBE40 0%, #E40B7B 100%)' }}
                >
                  Next
                  <ChevronRight className="h-4 w-4 mt-0.5" />
                </button>
              </div>
            )}
          </>
        )}
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
              {isFreePlan && (
                <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  Upgrade to Basic or Pro to invite team members.
                </p>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  disabled={isFreePlan}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-chat-input-border bg-chat-input-bg text-sm outline-none focus:border-chat-input-focus focus:ring-2 focus:ring-chat-input-focus/20 transition-all disabled:opacity-60"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Role</label>
                <p className="text-xs text-muted-foreground">Invited users are added as Employees.</p>
              </div>
              {proratedPreview?.applicable && proratedPreview.estimatedProratedCents != null && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
                  <p className="text-xs font-medium text-foreground">Billing impact (per-user plan)</p>
                  <p className="text-xs text-muted-foreground">
                    Adding this user will charge approximately ${(proratedPreview.estimatedProratedCents / 100).toFixed(2)} prorated for the rest of the cycle.
                  </p>
                  {proratedPreview.nextCycleTotalCents != null && (
                    <p className="text-xs text-muted-foreground">
                      Next cycle: ${(proratedPreview.nextCycleTotalCents / 100).toFixed(2)}/month total ({proratedPreview.newSeats} users).
                    </p>
                  )}
                </div>
              )}
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
                disabled={!inviteEmail || isInviting || isFreePlan}
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

function TransactionHistoryTab() {
  const { theme } = useTheme();
  const [transactions, setTransactions] = useState<Array<{
    type: string;
    date: string;
    description: string;
    amountCents: number;
    currency?: string;
    status?: string;
    newQuantity?: number;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const res = await adminClient.get("/api/subscription/transaction-history");
      setTransactions(res.data?.transactions ?? []);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to load transaction history");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">Loading transactions...</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden">
          <img
            src={"/assets/Transaction%20history-Light.svg"}
            alt="Transaction history"
            className="h-14 w-14 object-contain"
          />
        </div>
        <div>
          <p className="text-foreground font-medium">No transactions yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Plan purchases and prorated charges (when users are added) will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-card border border-border">
        <h3 className="text-base font-semibold text-foreground mb-1">Transaction History</h3>
        <p className="text-sm text-muted-foreground">
          Monthly billing events: plan purchases, recurring payments, and prorated charges when users are added.
        </p>
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left font-medium text-foreground px-4 py-3">Date</th>
                <th className="text-left font-medium text-foreground px-4 py-3">Description</th>
                <th className="text-right font-medium text-foreground px-4 py-3">Amount</th>
                <th className="text-left font-medium text-foreground px-4 py-3">Type</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(t.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 text-foreground">{t.description}</td>
                  <td className="px-4 py-3 text-right font-medium text-foreground">
                    ${(t.amountCents / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                        t.type === "payment"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      )}
                    >
                      {t.type === "payment" ? "Payment" : "Prorated"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BillingTab() {
  const [searchParams] = useSearchParams();
  const [subscription, setSubscription] = useState({
    organizationName: "",
    plan: "FREE",
    pricePerUser: 0, // Show 0 until API loads; avoids showing $12 when on FREE after Stripe back
    planPrice: 0, // Fixed price for non-per-user plans
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
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const loadingRef = useRef(false);

  // Handle Stripe checkout redirect first, then load data
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      // Verify checkout first, then load data
      verifyCheckoutSession(sessionId);
    } else if (!loadingRef.current) {
      // Only load data if no session_id (normal page load)
      loadBillingData();
    }
  }, [searchParams]);

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
    
    // Always reload billing data after verification attempt
    // Reset loadingRef to allow loadBillingData to run
    loadingRef.current = false;
    await loadBillingData();
  };

  const loadBillingData = async () => {
    if (loadingRef.current) return; // Prevent duplicate calls
    loadingRef.current = true;
    
    try {
      setLoading(true);
      const [statusResponse, metricsResponse, meResponse, usageResponse] = await Promise.allSettled([
        adminClient.get("/api/subscription/status"),
        adminClient.get("/api/admin/tenant/usage/metrics"),
        adminClient.get("/api/auth/me"),
        adminClient.get("/chat/usage"), // Per-user usage so each user (including admin) sees their own
      ]);
      
      const status = statusResponse.status === 'fulfilled' ? statusResponse.value.data : null;
      const metrics = metricsResponse.status === 'fulfilled' ? metricsResponse.value.data : {};
      const me = meResponse.status === 'fulfilled' ? meResponse.value.data : {};
      const usage = usageResponse.status === 'fulfilled' ? usageResponse.value.data : null;
      
      // Check if user is super admin
      const roles = me.roles || [];
      const role = me.role || "";
      setIsSuperAdmin(roles.includes("SUPER_ADMIN") || role === "SUPER_ADMIN");
      
      const plan = status?.plan || {};
      // Prefer per-user usage for display so each user sees their own limit, not org total
      const displayUsage = usage
        ? { current: usage.messagesUsed ?? 0, limit: usage.messagesLimit ?? 0 }
        : { current: metrics.messagesThisMonth ?? 0, limit: metrics.maxMessagesPerMonth ?? plan.maxMessagesPerMonth ?? 0 };
      
      if (status && status.hasSubscription) {
        const planObj = status.plan || {};
        const subscriptionStatus = status.status?.toLowerCase() || "active";
        const isFreePlan = subscriptionStatus === "free" || planObj.name === "FREE";
        // Safely parse price: ensure it's a number, default to 0 if invalid
        const planPrice = planObj.price != null ? Number(planObj.price) : 0;
        const safePrice = isNaN(planPrice) || planPrice < 0 ? 0 : planPrice;
        setSubscription({
          organizationName: me.tenantName || status.organizationName || "Organization",
          plan: planObj.displayName || planObj.name || "Free Plan",
          pricePerUser: planObj.isPerUser ? safePrice : 0,
          planPrice: planObj.isPerUser ? 0 : safePrice,
          activeUsers: metrics.currentUsers || 0,
          status: isFreePlan ? "active" : subscriptionStatus,
          renewalDate: status.renewalDate ? new Date(status.renewalDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          graceDaysRemaining: 0,
          coupon: null,
          usage: displayUsage,
        });
      } else {
        setSubscription({
          organizationName: me.tenantName || "Organization",
          plan: "Free Plan",
          pricePerUser: 0,
          planPrice: 0,
          activeUsers: metrics.currentUsers || 0,
          status: "active",
          renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          graceDaysRemaining: 0,
          coupon: null,
          usage: displayUsage,
        });
      }
    } catch (error: any) {
      console.error("Failed to load billing data:", error);
      // Don't show error toast if it's just a 403 (user might not have admin access)
      if (error?.response?.status !== 403) {
        toast.error("Failed to load billing information");
      }
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const monthlyEstimate = subscription.pricePerUser > 0 
    ? subscription.pricePerUser * subscription.activeUsers 
    : subscription.planPrice; // Use fixed plan price if not per-user
  const usagePercent = !isUnlimitedLimit(subscription.usage.limit) && subscription.usage.limit > 0 
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
      {/* Single message for admin when payment failed — no repeated toasts or reloads */}
      {subscription.status === "past_due" && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-200">
          <p className="text-sm font-medium">Your last payment failed. Please update your payment method to avoid service interruption.</p>
          <Link to="/billing/payment-method" className="text-sm font-medium underline mt-2 inline-block">Update payment method</Link>
        </div>
      )}

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
          {subscription.pricePerUser > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">Price per user</p>
              <p className="text-lg font-semibold text-foreground mt-0.5">${Number(subscription.pricePerUser).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">/month</p>
            </div>
          )}
          {subscription.pricePerUser === 0 && subscription.planPrice === 0 && subscription.plan.toLowerCase().includes("free") && (
            <div>
              <p className="text-xs text-muted-foreground">Plan type</p>
              <p className="text-lg font-semibold text-foreground mt-0.5">Free</p>
              <p className="text-xs text-muted-foreground">Plan</p>
            </div>
          )}
          {subscription.pricePerUser === 0 && subscription.planPrice > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">Plan price</p>
              <p className="text-lg font-semibold text-foreground mt-0.5">${Number(subscription.planPrice).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">/month</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Active users</p>
            <p className="text-lg font-semibold text-foreground mt-0.5">{subscription.activeUsers}</p>
            <p className="text-xs text-muted-foreground">users</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Monthly cost</p>
            <p className="text-lg font-semibold text-foreground mt-0.5">${Number(monthlyEstimate).toFixed(2)}</p>
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
            {subscription.usage.current.toLocaleString()} / {formatMessageLimit(subscription.usage.limit)}
          </p>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              usagePercent >= 100 ? "bg-destructive" : "progress-gradient-fill"
            )}
            style={{ width: isUnlimitedLimit(subscription.usage.limit) ? "0%" : `${Math.min(usagePercent, 100)}%` }}
          />
        </div>
        {!isUnlimitedLimit(subscription.usage.limit) && usagePercent > 75 && (
          <p className={cn(
            "text-xs flex items-center gap-1.5",
            usagePercent >= 100 ? "text-destructive" : usagePercent > 90 ? "text-destructive" : "text-yellow-600 dark:text-yellow-400"
          )}>
            <AlertTriangle className="h-3.5 w-3.5" />
            {usagePercent >= 100 ? "Limit reached" : usagePercent > 90 ? "Approaching limit" : "You're approaching your monthly usage limit"}
          </p>
        )}
      </div>

      {/* Manage Billing Link - Hidden for super admins */}
      {!isSuperAdmin && (
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
      )}
    </div>
  );
}

function KnowledgeBaseTab() {
  const [files, setFiles] = useState<Array<{ id: number; fileName: string; uploadedAt: string; updatedAt: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [fileInput, setFileInput] = useState<HTMLInputElement | null>(null);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const response = await adminClient.get("/api/admin/tenant/knowledge-base");
      setFiles(response.data || []);
    } catch (error: any) {
      console.error("Failed to load KB files:", error);
      toast.error("Failed to load knowledge base files");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = () => {
    fileInput?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Allow text files and Word documents
    const allowedExtensions = ['.txt', '.md', '.doc', '.docx'];
    const allowedMimeTypes = ['text/', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    const hasValidExtension = allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    const hasValidMimeType = allowedMimeTypes.some(mime => file.type.startsWith(mime));
    
    if (!hasValidExtension && !hasValidMimeType) {
      toast.error("Please upload a text file (.txt, .md) or Word document (.doc, .docx)");
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      await adminClient.post("/api/admin/tenant/knowledge-base", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Knowledge base file uploaded successfully");
      await loadFiles();
      // Reset file input
      if (fileInput) {
        fileInput.value = "";
      }
    } catch (error: any) {
      console.error("Failed to upload file:", error);
      toast.error(error?.response?.data?.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (fileId: number) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      await adminClient.delete(`/api/admin/tenant/knowledge-base/${fileId}`);
      toast.success("File deleted successfully");
      await loadFiles();
    } catch (error: any) {
      console.error("Failed to delete file:", error);
      toast.error(error?.response?.data?.message || "Failed to delete file");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">Loading knowledge base files...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Privacy note */}
      <div className="flex items-start gap-2.5 p-4 rounded-xl bg-primary/5 border border-primary/10">
        <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-sm text-foreground/80">
          Upload text files to build your knowledge base. The AI will only use content from these files to answer questions. 
          Employees you invite will have access to your knowledge base.
        </p>
      </div>

      {/* Upload section */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Knowledge Base Files</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Upload text files (.txt, .md) or Word documents (.doc, .docx) to enhance AI responses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={(el) => setFileInput(el)}
            onChange={handleFileUpload}
            accept=".txt,.md,.doc,.docx,text/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
          />
          <button
            onClick={handleFileSelect}
            disabled={isUploading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload File
          </button>
        </div>
      </div>

      {/* Files list */}
      {files.length === 0 ? (
        <div className="p-8 rounded-xl border border-dashed border-border text-center">
          <FileText className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No knowledge base files uploaded</p>
          <p className="text-xs text-muted-foreground mt-1">Upload a text file to get started</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
          {files.map((file) => (
            <div key={file.id} className="flex items-center justify-between p-4 bg-card hover:bg-chat-hover/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{file.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    Updated {new Date(file.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(file.id)}
                className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
