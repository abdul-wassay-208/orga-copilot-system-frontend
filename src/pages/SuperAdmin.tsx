import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  BarChart3,
  FileText,
  Settings,
  Plus,
  MoreHorizontal,
  Trash2,
  Upload,
  Loader2,
  ChevronRight,
  Users,
  MessageSquare,
  X,
  AlertTriangle,
  Globe,
  Lock,
  ChevronLeft,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { adminClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type Tab = "tenants" | "usage" | "coupons" | "users" | "knowledge" | "limits";

interface Tenant {
  id: string;
  name: string;
  status: "active" | "trial" | "inactive" | "grace";
  usersCount: number;
  messagesUsed: number;
  messagesLimit: number;
  plan: string;
  admin?: {
    id: string;
    email: string;
    fullName: string;
  } | null;
  totalEmployees: number;
  createdAt?: string;
}

interface GlobalKnowledgeFile {
  id: string;
  name: string;
  uploadedAt: Date;
  scope: "global" | "tenant";
  tenantName?: string;
}

export default function SuperAdminPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("tenants");
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
      
      // Redirect if not super admin
      if (!roles.includes("SUPER_ADMIN")) {
        toast.error("Access denied. Super admin access required.");
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
        toast.error("Access denied. Please log in with a super admin account.");
        navigate("/chat", { replace: true });
      }
    } finally {
      setCheckingRole(false);
    }
  };

  const tabs = [
    { id: "tenants" as Tab, label: "Tenants", icon: Building2 },
    { id: "usage" as Tab, label: "Usage Overview", icon: BarChart3 },
    { id: "coupons" as Tab, label: "Coupons", icon: FileText },
    { id: "users" as Tab, label: "Users", icon: Users },
  ];

  if (checkingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!userRoles.includes("SUPER_ADMIN")) {
    return null; // Will redirect via checkAccess
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/chat")}
              className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-chat-hover transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Super Admin</h1>
              <p className="text-xs text-muted-foreground">Manage all organizations</p>
            </div>
          </div>
        </div>
      </header>

      {/* Privacy disclaimer */}
      {/* <div className="max-w-5xl mx-auto px-4 pt-4">
        <PrivacyDisclaimer />
      </div> */}

      {/* Tabs */}
      <div className="border-b border-border sticky top-[73px] bg-background z-10">
        <div className="max-w-5xl mx-auto px-4">
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
      <main className="max-w-5xl mx-auto px-4 py-6">
        {activeTab === "tenants" && <TenantsTab />}
        {activeTab === "usage" && <UsageOverviewTab />}
        {activeTab === "coupons" && <CouponsTab />}
        {activeTab === "users" && <SuperAdminUsersTab />}
        {activeTab === "knowledge" && <GlobalKnowledgeTab />}
        {activeTab === "limits" && <DefaultLimitsTab />}
      </main>
    </div>
  );
}

function TenantsTab() {
  const { theme } = useTheme();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTenantName, setNewTenantName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [limitModalTenant, setLimitModalTenant] = useState<Tenant | null>(null);
  const [limitModalValue, setLimitModalValue] = useState("");
  const [savingLimit, setSavingLimit] = useState(false);
  const pageSize = 10;

  useEffect(() => {
    loadTenants(currentPage);
  }, [currentPage]);

  const loadTenants = async (page: number = 0) => {
    try {
      setLoading(true);
      const response = await adminClient.get(`/api/admin/super/tenants?page=${page}&size=${pageSize}`);
      const responseData = response.data || {};
      const backendTenants = responseData.content || [];
      
      // Set pagination info
      setTotalPages(responseData.totalPages || 0);
      setTotalElements(responseData.totalElements || 0);
      
      // Also get metrics to calculate user counts and message usage
      const metricsResponse = await adminClient.get("/api/admin/super/metrics");
      
      const transformed: Tenant[] = backendTenants.map((t: any) => {
        // Determine status based on isActive
        let status: "active" | "trial" | "inactive" | "grace" = "inactive";
        if (t.isActive) {
          status = t.subscriptionPlan === "TRIAL" ? "trial" : "active";
        }
        
        return {
          id: String(t.id),
          name: t.name,
          status,
          usersCount: 0, // Will be calculated separately
          messagesUsed: Number(t.messagesUsed ?? 0),
          messagesLimit: Number(t.messagesLimit ?? t.maxMessagesPerMonth ?? 500),
          plan: t.subscriptionPlan || "FREE",
          admin: t.admin ? {
            id: String(t.admin.id),
            email: t.admin.email,
            fullName: t.admin.fullName,
          } : null,
          totalEmployees: t.totalEmployees || 0,
          createdAt: t.createdAt,
        };
      });
      
      setTenants(transformed);
    } catch (error: any) {
      console.error("Failed to load tenants:", error);
      toast.error("Failed to load tenants");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTenant = async () => {
    if (!newTenantName.trim()) return;
    setIsAdding(true);
    
    try {
      const response = await adminClient.post("/api/admin/super/tenants", {
        name: newTenantName.trim(),
      });
      
      toast.success("Tenant created successfully");
      setShowAddDialog(false);
      setNewTenantName("");
      await loadTenants(currentPage);
    } catch (error: any) {
      console.error("Failed to create tenant:", error);
      toast.error(error?.response?.data?.message || "Failed to create tenant");
    } finally {
      setIsAdding(false);
    }
  };

  const getStatusColor = (status: Tenant["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-600 dark:text-green-400";
      case "trial":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      case "grace":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
      case "inactive":
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: Tenant["status"]) => {
    switch (status) {
      case "active": return "Active";
      case "trial": return "Trial";
      case "grace": return "Grace Period";
      case "inactive": return "Inactive";
    }
  };

  const openLimitModal = (tenant: Tenant, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setLimitModalTenant(tenant);
    setLimitModalValue(String(tenant.messagesLimit ?? 500));
  };

  const handleSaveLimit = async () => {
    if (!limitModalTenant) return;
    const val = parseInt(limitModalValue, 10);
    if (isNaN(val) || val <= 0) {
      toast.error("Enter a valid positive number");
      return;
    }
    setSavingLimit(true);
    try {
      await adminClient.put(`/api/admin/super/tenants/${limitModalTenant.id}/usage-limit`, {
        monthlyMessageLimit: val,
      });
      toast.success("Limit updated. Tenant admin has been notified.");
      setLimitModalTenant(null);
      setLimitModalValue("");
      await loadTenants(currentPage);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to update limit");
    } finally {
      setSavingLimit(false);
    }
  };

  const [metrics, setMetrics] = useState({
    totalTenants: 0,
    activeTenants: 0,
    totalUsers: 0,
  });

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const response = await adminClient.get("/api/admin/super/metrics");
      setMetrics(response.data);
    } catch (error: any) {
      console.error("Failed to load metrics:", error);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">Loading tenants...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 rounded-lg flex items-center justify-center overflow-hidden">
              <img
                src={theme === "dark" ? "/assets/Tenants.svg" : "/assets/Tenants-dark.svg"}
                alt="Total Tenants"
                className="h-14 w-14 object-contain"
              />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{metrics.totalTenants || tenants.length}</p>
              <p className="text-xs text-muted-foreground">Total Tenants</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 rounded-lg flex items-center justify-center overflow-hidden">
              <img
                src={theme === "dark" ? "/assets/Active.svg" : "/assets/Active-Light.svg"}
                alt="Active"
                className="h-14 w-14 object-contain"
              />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">
                {metrics.activeTenants || tenants.filter((t) => t.status === "active").length}
              </p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 rounded-lg flex items-center justify-center overflow-hidden">
              <img
                src={theme === "dark" ? "/assets/Total-users.svg" : "/assets/Total-users-dark.svg"}
                alt="Total Users"
                className="h-14 w-14 object-contain"
              />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">
                {metrics.totalUsers || tenants.reduce((acc, t) => acc + t.usersCount, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 rounded-lg  flex items-center justify-center overflow-hidden">
              <img
                src={theme === "dark" ? "/assets/Start-chat.svg" : "/assets/Start-chat-dark.svg"}
                alt="Messages Used"
                className="h-14 w-14 object-contain"
              />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">
                {tenants.reduce((acc, t) => acc + t.messagesUsed, 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Messages Used</p>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalElements} {totalElements === 1 ? 'organization' : 'organizations'}
          {totalPages > 1 && ` (Page ${currentPage + 1} of ${totalPages})`}
        </p>
        <button
          onClick={() => setShowAddDialog(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Tenant
        </button>
      </div>

      {/* Limit edit modal - rendered via portal to body for true centered popup overlay */}
      {limitModalTenant && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="limit-modal-title">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setLimitModalTenant(null)} aria-hidden="true" />
          <div className="relative z-10 bg-card border border-border rounded-xl shadow-2xl p-6 max-w-sm w-full space-y-4 animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h2 id="limit-modal-title" className="text-lg font-semibold text-foreground">Edit message limit</h2>
              <button onClick={() => setLimitModalTenant(null)} className="p-1.5 rounded-lg hover:bg-chat-hover text-muted-foreground" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              {limitModalTenant.name} — currently {(limitModalTenant.messagesUsed ?? 0).toLocaleString()} / {(limitModalTenant.messagesLimit ?? 500).toLocaleString()} used
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">New monthly limit</label>
              <input
                type="number"
                min={1}
                value={limitModalValue}
                onChange={(e) => setLimitModalValue(e.target.value)}
                placeholder="e.g. 500"
                className="w-full px-3 py-2.5 rounded-lg border border-chat-input-border bg-chat-input-bg text-sm outline-none focus:border-chat-input-focus"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Tenant admin will receive an email notification when the limit is increased.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setLimitModalTenant(null)}
                className="px-4 py-2.5 rounded-lg border border-chat-input-border text-sm font-medium hover:bg-chat-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLimit}
                disabled={savingLimit || !limitModalValue.trim()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {savingLimit ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Tenants list */}
      <div className="border border-border rounded-xl divide-y divide-border overflow-x-auto">
        {tenants.map((tenant) => {
          const used = tenant.messagesUsed ?? 0;
          const limit = tenant.messagesLimit ?? 500;
          return (
          <div key={tenant.id} className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-4 bg-card hover:bg-chat-hover/50 transition-colors min-w-0">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{tenant.name}</p>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>{tenant.plan} · {tenant.totalEmployees} employees</p>
                  {tenant.admin && (
                    <p className="text-xs text-muted-foreground">
                      Admin: {tenant.admin.fullName} ({tenant.admin.email})
                    </p>
                  )}
                  {tenant.createdAt && (
                    <p className="text-xs text-muted-foreground">
                      Created: {new Date(tenant.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Limit / Used - clickable to edit */}
              <button
                type="button"
                onClick={(e) => openLimitModal(tenant, e)}
                className={cn(
                  "flex items-center gap-2 text-xs rounded-lg px-3 py-2 transition-colors",
                  "hover:bg-muted/80 border border-border",
                  "text-foreground bg-muted/30"
                )}
                title="Click to change limit"
              >
                <span className="font-medium whitespace-nowrap">{used.toLocaleString()} / {limit.toLocaleString()}</span>
                <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden min-w-[64px]">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      limit > 0 && (used / limit) > 0.9 ? "bg-destructive" : "progress-gradient-fill"
                    )}
                    style={{ width: `${limit > 0 ? Math.min((used / limit) * 100, 100) : 0}%` }}
                  />
                </div>
              </button>
              <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", getStatusColor(tenant.status))}>
                {getStatusLabel(tenant.status)}
              </span>
              <Link
                to={`/admin?tenant=${tenant.id}`}
                className="p-2 rounded-lg hover:bg-chat-hover text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center pt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 0) {
                      setCurrentPage(currentPage - 1);
                    }
                  }}
                  disabled={currentPage === 0}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                  )}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </button>
              </PaginationItem>
              
              {/* Page numbers */}
              {Array.from({ length: totalPages }, (_, i) => {
                // Show first page, last page, current page, and pages around current
                const showPage = 
                  i === 0 || 
                  i === totalPages - 1 || 
                  (i >= currentPage - 1 && i <= currentPage + 1);
                
                if (!showPage) {
                  // Show ellipsis
                  if (i === currentPage - 2 || i === currentPage + 2) {
                    return (
                      <PaginationItem key={i}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  return null;
                }
                
                return (
                  <PaginationItem key={i}>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(i);
                      }}
                      className={cn(
                        "inline-flex items-center justify-center rounded-md h-10 w-10 text-sm font-medium transition-colors",
                        i === currentPage
                          ? "border border-input bg-background"
                          : "hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      {i + 1}
                    </button>
                  </PaginationItem>
                );
              })}
              
              <PaginationItem>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage < totalPages - 1) {
                      setCurrentPage(currentPage + 1);
                    }
                  }}
                  disabled={currentPage >= totalPages - 1}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                  )}
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Add Tenant Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
            onClick={() => setShowAddDialog(false)}
          />
          <div className="relative bg-card border border-border rounded-xl shadow-lg p-6 max-w-sm mx-4 w-full space-y-5 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Add Organization</h3>
              <button
                onClick={() => setShowAddDialog(false)}
                className="p-1.5 rounded-lg hover:bg-chat-hover text-muted-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Organization name</label>
                <input
                  type="text"
                  value={newTenantName}
                  onChange={(e) => setNewTenantName(e.target.value)}
                  placeholder="Acme Inc"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-chat-input-border bg-chat-input-bg text-sm outline-none focus:border-chat-input-focus focus:ring-2 focus:ring-chat-input-focus/20 transition-all"
                />
                <p className="text-xs text-muted-foreground">
                  Organization names can be duplicated. Each organization is identified by its unique ID.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setShowAddDialog(false)}
                className="px-4 py-2.5 rounded-lg border border-chat-input-border text-sm font-medium hover:bg-chat-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTenant}
                disabled={!newTenantName.trim() || isAdding}
                className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UsageOverviewTab() {
  const [usageData, setUsageData] = useState({
    totalMessages: 0,
    totalLimit: 0,
    totalUsers: 0,
    activeThisMonth: 0,
  });
  const [topTenants, setTopTenants] = useState<Array<{ name: string; usage: number; limit: number }>>([]);
  const [tenantsAt90, setTenantsAt90] = useState<Array<{ name: string; usage: number; limit: number; percent: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsageData();
  }, []);

  const loadUsageData = async () => {
    try {
      setLoading(true);
      // Fetch all tenants without pagination for usage overview
      const [tenantsResponse, metricsResponse] = await Promise.all([
        adminClient.get("/api/admin/super/tenants?page=0&size=1000"), // Get all tenants
        adminClient.get("/api/admin/super/metrics"),
      ]);
      
      // Handle paginated response - extract content array
      const responseData = tenantsResponse.data || {};
      const tenants = responseData.content || [];
      const metrics = metricsResponse.data || {};
      
      // Calculate totals
      const totalMessages = tenants.reduce((acc: number, t: any) => acc + (t.messagesUsed || 0), 0);
      const totalLimit = tenants.reduce((acc: number, t: any) => acc + (t.messagesLimit || t.maxMessagesPerMonth || 0), 0);
      
      setUsageData({
        totalMessages,
        totalLimit,
        totalUsers: metrics.totalUsers || 0,
        activeThisMonth: metrics.totalUsers || 0, // Approximate
      });
      
      // Get top tenants by usage
      const sorted = tenants
        .map((t: any) => ({
          name: t.name,
          usage: t.messagesUsed || 0,
          limit: t.messagesLimit || t.maxMessagesPerMonth || 0,
        }))
        .filter((x: { limit: number }) => x.limit > 0)
        .sort((a: { usage: number }, b: { usage: number }) => b.usage - a.usage)
        .slice(0, 10);
      
      setTopTenants(sorted);
      
      // Tenants at 90%+ for usage alerts (user, admin, superadmin)
      const at90 = tenants
        .map((t: any) => {
          const usage = t.messagesUsed || 0;
          const limit = t.messagesLimit || t.maxMessagesPerMonth || 0;
          const percent = limit > 0 ? Math.round((usage * 100) / limit) : 0;
          return { name: t.name, usage, limit, percent };
        })
        .filter((x: { limit: number; percent: number }) => x.limit > 0 && x.percent >= 90)
        .sort((a: { percent: number }, b: { percent: number }) => b.percent - a.percent);
      setTenantsAt90(at90);
    } catch (error: any) {
      console.error("Failed to load usage data:", error);
      toast.error("Failed to load usage data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">Loading usage data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Usage alerts: 90%+ (notify user, admin, superadmin) */}
      {tenantsAt90.length > 0 && (
        <div className="p-5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            Usage alerts (90%+ of plan limit)
          </h3>
          <p className="text-xs text-muted-foreground">
            These organizations are at or above 90% of their message limit. Users see an upgrade prompt; ensure admins are aware.
          </p>
          <ul className="text-sm text-foreground space-y-1">
            {tenantsAt90.map((t) => (
              <li key={t.name}>
                {t.name}: {t.usage}/{t.limit} ({t.percent}%)
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Global stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-border bg-card">
          <p className="text-3xl font-semibold text-foreground">{usageData.totalMessages.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1">Total Messages</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card">
          <p className="text-3xl font-semibold text-foreground">{usageData.totalLimit.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1">Total Limit</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card">
          <p className="text-3xl font-semibold text-foreground">{usageData.totalUsers}</p>
          <p className="text-sm text-muted-foreground mt-1">Total Users</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card">
          <p className="text-3xl font-semibold text-foreground">{usageData.activeThisMonth}</p>
          <p className="text-sm text-muted-foreground mt-1">Active This Month</p>
        </div>
      </div>

      {/* Usage by tenant - numbers only */}
      <div className="p-5 rounded-xl border border-border bg-card space-y-4">
        <h3 className="text-sm font-medium text-foreground">Usage by Organization</h3>
        <div className="space-y-3">
          {topTenants.map((tenant) => (
            <div key={tenant.name} className="flex items-center gap-4">
              <div className="w-32 text-sm text-foreground truncate">{tenant.name}</div>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full",
                    (tenant.usage / tenant.limit) > 0.9 ? "bg-destructive" :
                    (tenant.usage / tenant.limit) > 0.75 ? "bg-yellow-500" : "progress-gradient-fill"
                  )}
                  style={{ width: `${(tenant.usage / tenant.limit) * 100}%` }}
                />
              </div>
              <div className="w-32 text-sm text-muted-foreground text-right">
                {tenant.usage.toLocaleString()} / {tenant.limit.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy note */}
      <div className="flex items-center gap-2.5 p-4 rounded-xl bg-primary/5 border border-primary/10">
        <Lock className="h-4 w-4 text-primary flex-shrink-0" />
        <p className="text-sm text-foreground/80">
          Only aggregate usage numbers are shown. Conversation content is never accessible.
        </p>
      </div>
    </div>
  );
}

interface CouponItem {
  id: number;
  code: string;
  planName: string;
  assignToEmail: string | null;
  expiresAt: string | null;
  used: boolean;
  usedAt: string | null;
  createdAt: string | null;
  status: "active" | "used" | "expired";
}

function CouponsTab() {
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [planName, setPlanName] = useState<"BASIC" | "PRO">("BASIC");
  const [assignToEmail, setAssignToEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [lastCreated, setLastCreated] = useState<{ code: string; planName: string; assignToEmail: string; expiresAt: string } | null>(null);
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const pageSize = 10;

  const loadCoupons = async (page: number = 0) => {
    try {
      setLoadingCoupons(true);
      const response = await adminClient.get("/api/admin/super/coupons", {
        params: { page, size: pageSize },
      });
      const list = response.data?.coupons ?? [];
      setCoupons(list.map((c: any) => ({
        id: c.id,
        code: c.code ?? "",
        planName: c.planName ?? "",
        assignToEmail: c.assignToEmail ?? null,
        expiresAt: c.expiresAt ?? null,
        used: !!c.used,
        usedAt: c.usedAt ?? null,
        createdAt: c.createdAt ?? null,
        status: c.status ?? (c.used ? "used" : "active"),
      })));
      setTotalPages(response.data?.totalPages ?? 0);
      setTotalElements(response.data?.totalElements ?? 0);
      setCurrentPage(response.data?.currentPage ?? 0);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to load coupons");
      setCoupons([]);
    } finally {
      setLoadingCoupons(false);
    }
  };

  useEffect(() => {
    loadCoupons(currentPage);
  }, [currentPage]);

  const handleDeleteCoupon = async (id: number) => {
    setDeletingId(id);
    try {
      await adminClient.delete(`/api/admin/super/coupons/${id}`);
      toast.success("Coupon deleted");
      await loadCoupons(currentPage);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to delete coupon");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateCoupon = async () => {
    const email = assignToEmail.trim();
    if (!email) {
      toast.error("Enter the user's email");
      return;
    }
    setCreating(true);
    setLastCreated(null);
    try {
      const response = await adminClient.post("/api/admin/super/coupons", {
        planName,
        assignToEmail: email,
      });
      const data = response.data || {};
      toast.success("Coupon created. Share the code with the user.");
      setLastCreated({
        code: data.code,
        planName: data.planName || planName,
        assignToEmail: data.assignToEmail || email,
        expiresAt: data.expiresAt || "",
      });
      setAssignToEmail("");
      setShowCouponModal(false);
      setCurrentPage(0);
      await loadCoupons(0);
    } catch (error: any) {
      const msg = error?.response?.data?.message || "Failed to create coupon";
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const openModal = () => {
    setPlanName("BASIC");
    setAssignToEmail("");
    setLastCreated(null);
    setShowCouponModal(true);
  };

  const statusBadge = (status: CouponItem["status"]) => {
    const cls =
      status === "active"
        ? "bg-green-500/10 text-green-600 dark:text-green-400"
        : status === "used"
          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
          : "bg-muted text-muted-foreground";
    const label = status === "active" ? "Active" : status === "used" ? "Used" : "Expired";
    return <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", cls)}>{label}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Create coupons for Basic or Pro plans. One coupon per user, non-renewable.</p>
        <button
          onClick={openModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create coupon
        </button>
      </div>

      {/* Coupon creation modal */}
      {showCouponModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setShowCouponModal(false)} />
          <div className="relative bg-card border border-border rounded-xl shadow-lg p-6 max-w-sm mx-4 w-full space-y-5 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Create coupon</h3>
              <button onClick={() => setShowCouponModal(false)} className="p-1.5 rounded-lg hover:bg-chat-hover text-muted-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">One coupon per user. Non-renewable. Expires in 1 month. Assign to a user by email.</p>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Plan</label>
              <select
                value={planName}
                onChange={(e) => setPlanName(e.target.value as "BASIC" | "PRO")}
                className="w-full px-3.5 py-2.5 rounded-lg border border-chat-input-border bg-chat-input-bg text-sm outline-none focus:border-chat-input-focus"
              >
                <option value="BASIC">Basic ($1 / 10 messages)</option>
                <option value="PRO">Pro ($50 / 200 messages)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Assign to user (email)</label>
              <input
                type="email"
                value={assignToEmail}
                onChange={(e) => setAssignToEmail(e.target.value)}
                placeholder="user@company.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-chat-input-border bg-chat-input-bg text-sm outline-none focus:border-chat-input-focus"
              />
            </div>
            <p className="text-xs text-muted-foreground">Coupon code expires in 1 month. After the user applies it, plan access lasts 1 month from apply date, then falls back to Free.</p>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowCouponModal(false)} className="px-4 py-2.5 rounded-lg border border-chat-input-border text-sm font-medium hover:bg-chat-hover transition-colors">
                Cancel
              </button>
              <button
                onClick={handleCreateCoupon}
                disabled={creating || !assignToEmail.trim()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create coupon
              </button>
            </div>
          </div>
        </div>
      )}

      {lastCreated && (
        <div className="p-5 rounded-xl border border-primary/20 bg-primary/5 max-w-md space-y-2">
          <h3 className="text-sm font-medium text-foreground">Last created coupon</h3>
          <p className="text-xs text-muted-foreground">Share this code with the user. One-time use.</p>
          <p className="text-sm font-mono font-medium text-foreground">{lastCreated.code}</p>
          <p className="text-xs text-muted-foreground">
            Plan: {lastCreated.planName} · Assigned to: {lastCreated.assignToEmail}
          </p>
          {lastCreated.expiresAt && (
            <p className="text-xs text-muted-foreground">
              Expires: {new Date(lastCreated.expiresAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* All coupons list */}
      <div className="rounded-xl border border-border overflow-hidden">
        <h3 className="text-sm font-medium text-foreground px-4 py-3 border-b border-border bg-muted/30">
          All coupons
          {totalElements > 0 && (
            <span className="ml-2 text-muted-foreground font-normal">
              ({totalElements} total · Page {currentPage + 1} of {totalPages || 1})
            </span>
          )}
        </h3>
        {loadingCoupons ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading coupons…</span>
          </div>
        ) : coupons.length === 0 ? (
          <p className="text-sm text-muted-foreground px-4 py-6">No coupons yet. Create one above.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left font-medium text-foreground px-4 py-3">Code</th>
                    <th className="text-left font-medium text-foreground px-4 py-3">Plan</th>
                    <th className="text-left font-medium text-foreground px-4 py-3">Assigned to</th>
                    <th className="text-left font-medium text-foreground px-4 py-3">Status</th>
                    <th className="text-left font-medium text-foreground px-4 py-3">Expires</th>
                    <th className="text-left font-medium text-foreground px-4 py-3">Used at</th>
                    <th className="text-left font-medium text-foreground px-4 py-3">Created</th>
                    <th className="text-right font-medium text-foreground px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-foreground">{c.code}</td>
                      <td className="px-4 py-3 text-foreground">{c.planName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.assignToEmail ?? "—"}</td>
                      <td className="px-4 py-3">{statusBadge(c.status)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.expiresAt ? new Date(c.expiresAt).toLocaleString() : "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.usedAt ? new Date(c.usedAt).toLocaleString() : "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.createdAt ? new Date(c.createdAt).toLocaleString() : "—"}</td>
                      <td className="px-4 py-3 text-right">
                        {c.status === "active" ? (
                          <button
                            onClick={() => handleDeleteCoupon(c.id)}
                            disabled={deletingId === c.id}
                            className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                            title="Delete coupon"
                          >
                            {deletingId === c.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/10">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-chat-input-border text-sm font-medium hover:bg-chat-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-chat-input-border text-sm font-medium hover:bg-chat-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface SuperAdminUser {
  id: number;
  email: string;
  fullName?: string;
  role: string;
  tenantId: number | null;
  tenantName: string | null;
  messagesUsed?: number;
  messagesLimit?: number;
}

interface SuperAdminUserDetail {
  id: number;
  email: string;
  fullName?: string;
  role: string;
  tenantId: number | null;
  tenantName: string | null;
  planMessageLimit: number;
  overriddenMessageLimit: number | null;
  effectiveMessageLimit: number;
  messagesUsed?: number;
  messagesLimit?: number;
}

function SuperAdminUsersTab() {
  const [users, setUsers] = useState<SuperAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userDetail, setUserDetail] = useState<SuperAdminUserDetail | null>(null);
  const [overrideInput, setOverrideInput] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchParam, setSearchParam] = useState("");
  const pageSize = 10;

  useEffect(() => {
    const t = setTimeout(() => setSearchParam(searchQuery), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    setLoading(true);
    const searchSegment = searchParam.trim() ? `&search=${encodeURIComponent(searchParam.trim())}` : "";
    adminClient.get(`/api/admin/super/users?page=${currentPage}&size=${pageSize}${searchSegment}`)
      .then((r) => {
        const data = r.data || {};
        setUsers(data.content || []);
        setTotalPages(data.totalPages ?? 0);
        setTotalElements(data.totalElements ?? 0);
      })
      .catch(() => {
        toast.error("Failed to load users");
        setUsers([]);
      })
      .finally(() => setLoading(false));
  }, [currentPage, searchParam]);

  useEffect(() => {
    if (selectedUserId == null) {
      setUserDetail(null);
      setOverrideInput("");
      return;
    }
    adminClient.get(`/api/admin/super/users/${selectedUserId}`).then((r) => {
      const d = r.data;
      setUserDetail(d);
      setOverrideInput(d?.overriddenMessageLimit != null ? String(d.overriddenMessageLimit) : "");
    }).catch(() => {
      toast.error("Failed to load user details");
      setUserDetail(null);
    });
  }, [selectedUserId]);

  const handleSaveOverride = async () => {
    if (selectedUserId == null) return;
    setSaving(true);
    try {
      const value = overrideInput.trim() ? parseInt(overrideInput.trim(), 10) : null;
      if (value != null && (isNaN(value) || value < 1)) {
        toast.error("Enter a positive number or leave empty to remove override.");
        setSaving(false);
        return;
      }
      await adminClient.post(`/api/admin/super/users/${selectedUserId}/usage-limit`, {
        monthlyMessageLimit: value ?? 0,
      });
      toast.success(value != null ? "Override saved." : "Override removed.");
      const res = await adminClient.get(`/api/admin/super/users/${selectedUserId}`);
      setUserDetail(res.data);
      setOverrideInput(res.data?.overriddenMessageLimit != null ? String(res.data.overriddenMessageLimit) : "");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to save override");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
          <h3 className="text-sm font-medium text-foreground">All users</h3>
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
            <span className="text-sm">Loading…</span>
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground px-4 py-6">No users.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left font-medium text-foreground px-4 py-3">Email</th>
                  <th className="text-left font-medium text-foreground px-4 py-3">Name</th>
                  <th className="text-left font-medium text-foreground px-4 py-3">Role</th>
                  <th className="text-left font-medium text-foreground px-4 py-3">Tenant</th>
                  <th className="text-right font-medium text-foreground px-4 py-3">Usage</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const used = u.messagesUsed ?? 0;
                  const limit = u.messagesLimit ?? 500;
                  return (
                  <tr
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className={cn(
                      "border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer",
                      selectedUserId === u.id && "bg-primary/5"
                    )}
                  >
                    <td className="px-4 py-3 text-foreground">{u.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.fullName ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.role}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.tenantName ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">
                      {used.toLocaleString()} / {limit.toLocaleString()}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-4 py-3 border-t border-border bg-muted/10">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="flex gap-1 px-3 py-1.5 rounded-lg border border-chat-input-border text-sm font-medium hover:bg-chat-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="flex gap-1 px-3 py-1.5 rounded-lg border border-chat-input-border text-sm font-medium hover:bg-chat-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {userDetail && (
        <div className="rounded-xl border border-border p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">User: {userDetail.email}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Messages used this month</p>
              <p className="font-medium text-foreground">
                {(userDetail.messagesUsed ?? 0).toLocaleString()} / {(userDetail.messagesLimit ?? userDetail.effectiveMessageLimit ?? 500).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Plan default message limit</p>
              <p className="font-medium text-foreground">{userDetail.planMessageLimit}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Effective message limit</p>
              <p className="font-medium text-foreground">{userDetail.effectiveMessageLimit}</p>
            </div>
          </div>
          <div className="border-t border-border pt-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">User-specific override</p>
            <p className="text-xs text-muted-foreground mb-2">Override monthly message limit for this user only. Does not change billing.</p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={1}
                value={overrideInput}
                onChange={(e) => setOverrideInput(e.target.value)}
                placeholder="Leave empty to use plan default"
                className="w-40 px-3 py-2 rounded-lg border border-chat-input-border bg-chat-input-bg text-sm outline-none focus:border-chat-input-focus"
              />
              <button
                onClick={handleSaveOverride}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GlobalKnowledgeTab() {
  const [files, setFiles] = useState<GlobalKnowledgeFile[]>([
    { id: "1", name: "platform-guidelines.txt", uploadedAt: new Date("2024-01-10"), scope: "global" },
    { id: "2", name: "acme-specific.txt", uploadedAt: new Date("2024-02-15"), scope: "tenant", tenantName: "Acme Inc" },
    { id: "3", name: "techcorp-policies.txt", uploadedAt: new Date("2024-03-01"), scope: "tenant", tenantName: "TechCorp" },
  ]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadScope, setUploadScope] = useState<"global" | "tenant">("global");

  const handleUpload = async () => {
    setIsUploading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setFiles((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: "new-file.txt",
        uploadedAt: new Date(),
        scope: uploadScope,
        tenantName: uploadScope === "tenant" ? "Selected Tenant" : undefined,
      },
    ]);
    setIsUploading(false);
  };

  const handleDelete = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const globalFiles = files.filter((f) => f.scope === "global");
  const tenantFiles = files.filter((f) => f.scope === "tenant");

  return (
    <div className="space-y-6">
      {/* Privacy note */}
      <div className="flex items-start gap-2.5 p-4 rounded-xl bg-primary/5 border border-primary/10">
        <Lock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-sm text-foreground/80">
          Knowledge base content helps guide AI responses but does not override user privacy.
          Admins cannot view conversation content.
        </p>
      </div>

      {/* Upload section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setUploadScope("global")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              uploadScope === "global"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Globe className="h-3.5 w-3.5 inline mr-1.5" />
            Global
          </button>
          <button
            onClick={() => setUploadScope("tenant")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              uploadScope === "tenant"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Building2 className="h-3.5 w-3.5 inline mr-1.5" />
            Tenant-specific
          </button>
        </div>
        <button
          onClick={handleUpload}
          disabled={isUploading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Upload {uploadScope === "global" ? "Global" : "Tenant"} File
        </button>
      </div>

      {/* Global files */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          Global Files ({globalFiles.length})
        </h3>
        {globalFiles.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-border text-center">
            <p className="text-sm text-muted-foreground">No global files uploaded</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
            {globalFiles.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-4 bg-card hover:bg-chat-hover/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Uploaded {file.uploadedAt.toLocaleDateString()}
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

      {/* Tenant-specific files */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          Tenant-Specific Files ({tenantFiles.length})
        </h3>
        {tenantFiles.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-border text-center">
            <p className="text-sm text-muted-foreground">No tenant-specific files uploaded</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
            {tenantFiles.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-4 bg-card hover:bg-chat-hover/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.tenantName} · Uploaded {file.uploadedAt.toLocaleDateString()}
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
    </div>
  );
}

function DefaultLimitsTab() {
  const [limits, setLimits] = useState({
    defaultPerUser: 500,
    defaultPerTenant: 5000,
    trialPerUser: 100,
    trialPerTenant: 1000,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Set default usage limits for new organizations. These can be overridden per tenant.
      </p>

      {/* Standard limits */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Standard Plan Defaults</h3>
        <div className="p-5 rounded-xl border border-border bg-card space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Per-user limit</p>
              <p className="text-xs text-muted-foreground mt-1">Default messages per user per month</p>
            </div>
            <input
              type="number"
              value={limits.defaultPerUser}
              onChange={(e) => setLimits((prev) => ({ ...prev, defaultPerUser: parseInt(e.target.value) || 0 }))}
              className="w-28 px-3.5 py-2.5 rounded-lg border border-chat-input-border bg-chat-input-bg text-sm text-right outline-none focus:border-chat-input-focus focus:ring-2 focus:ring-chat-input-focus/20 transition-all"
            />
          </div>
          <div className="flex items-start justify-between gap-4 pt-4 border-t border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Per-organization limit</p>
              <p className="text-xs text-muted-foreground mt-1">Default total messages per org per month</p>
            </div>
            <input
              type="number"
              value={limits.defaultPerTenant}
              onChange={(e) => setLimits((prev) => ({ ...prev, defaultPerTenant: parseInt(e.target.value) || 0 }))}
              className="w-28 px-3.5 py-2.5 rounded-lg border border-chat-input-border bg-chat-input-bg text-sm text-right outline-none focus:border-chat-input-focus focus:ring-2 focus:ring-chat-input-focus/20 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Trial limits */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Trial Plan Defaults</h3>
        <div className="p-5 rounded-xl border border-border bg-card space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Per-user limit</p>
              <p className="text-xs text-muted-foreground mt-1">Trial messages per user per month</p>
            </div>
            <input
              type="number"
              value={limits.trialPerUser}
              onChange={(e) => setLimits((prev) => ({ ...prev, trialPerUser: parseInt(e.target.value) || 0 }))}
              className="w-28 px-3.5 py-2.5 rounded-lg border border-chat-input-border bg-chat-input-bg text-sm text-right outline-none focus:border-chat-input-focus focus:ring-2 focus:ring-chat-input-focus/20 transition-all"
            />
          </div>
          <div className="flex items-start justify-between gap-4 pt-4 border-t border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Per-organization limit</p>
              <p className="text-xs text-muted-foreground mt-1">Trial total messages per org per month</p>
            </div>
            <input
              type="number"
              value={limits.trialPerTenant}
              onChange={(e) => setLimits((prev) => ({ ...prev, trialPerTenant: parseInt(e.target.value) || 0 }))}
              className="w-28 px-3.5 py-2.5 rounded-lg border border-chat-input-border bg-chat-input-bg text-sm text-right outline-none focus:border-chat-input-focus focus:ring-2 focus:ring-chat-input-focus/20 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Warning */}
      {(limits.defaultPerUser < 100 || limits.trialPerUser < 50) && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            Very low limits may impact user experience
          </p>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {isSaving ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </span>
        ) : (
          "Save Defaults"
        )}
      </button>
    </div>
  );
}
