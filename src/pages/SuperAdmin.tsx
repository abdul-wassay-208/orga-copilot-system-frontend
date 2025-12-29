import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
  Shield,
  Users,
  MessageSquare,
  X,
  AlertTriangle,
  Globe,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PrivacyDisclaimer } from "@/components/UsageLimitStates";
import { adminClient } from "@/lib/api-client";
import { toast } from "sonner";

type Tab = "tenants" | "usage" | "knowledge" | "limits";

interface Tenant {
  id: string;
  name: string;
  status: "active" | "trial" | "inactive" | "grace";
  usersCount: number;
  messagesUsed: number;
  messagesLimit: number;
  plan: string;
}

interface GlobalKnowledgeFile {
  id: string;
  name: string;
  uploadedAt: Date;
  scope: "global" | "tenant";
  tenantName?: string;
}

export default function SuperAdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("tenants");
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
      
      // Redirect if not super admin
      if (role !== "SUPER_ADMIN") {
        toast.error("Access denied. Super admin access required.");
        window.location.href = "/chat";
        return;
      }
    } catch (error: any) {
      console.error("Failed to verify access:", error);
      toast.error("Access denied. Please log in with a super admin account.");
      window.location.href = "/chat";
    } finally {
      setCheckingRole(false);
    }
  };

  const tabs = [
    { id: "tenants" as Tab, label: "Tenants", icon: Building2 },
    { id: "usage" as Tab, label: "Usage Overview", icon: BarChart3 },
    { id: "knowledge" as Tab, label: "Knowledge Base", icon: FileText },
    { id: "limits" as Tab, label: "Default Limits", icon: Settings },
  ];

  if (checkingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (userRole !== "SUPER_ADMIN") {
    return null; // Will redirect via checkAccess
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-chat-hover transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-foreground">Super Admin</h1>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  Platform
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Manage all organizations</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">Private by Design</span>
          </div>
        </div>
      </header>

      {/* Privacy disclaimer */}
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <PrivacyDisclaimer />
      </div>

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
        {activeTab === "knowledge" && <GlobalKnowledgeTab />}
        {activeTab === "limits" && <DefaultLimitsTab />}
      </main>
    </div>
  );
}

function TenantsTab() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTenantName, setNewTenantName] = useState("");
  const [newTenantDomain, setNewTenantDomain] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      setLoading(true);
      const response = await adminClient.get("/api/admin/super/tenants");
      const backendTenants = response.data || [];
      
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
          messagesUsed: 0, // Will be calculated separately
          messagesLimit: t.maxMessagesPerMonth || 0,
          plan: t.subscriptionPlan || "BASIC",
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
    if (!newTenantName.trim() || !newTenantDomain.trim()) return;
    setIsAdding(true);
    
    try {
      const response = await adminClient.post("/api/admin/super/tenants", {
        name: newTenantName.trim(),
        domain: newTenantDomain.trim(),
      });
      
      toast.success("Tenant created successfully");
      setShowAddDialog(false);
      setNewTenantName("");
      setNewTenantDomain("");
      await loadTenants();
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
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{metrics.totalTenants || tenants.length}</p>
              <p className="text-xs text-muted-foreground">Total Tenants</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-green-600 dark:text-green-400" />
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
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Users className="h-5 w-5 text-muted-foreground" />
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
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
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
        <p className="text-sm text-muted-foreground">{tenants.length} organizations</p>
        <button
          onClick={() => setShowAddDialog(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Tenant
        </button>
      </div>

      {/* Tenants list */}
      <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
        {tenants.map((tenant) => (
          <div key={tenant.id} className="flex items-center justify-between p-4 bg-card hover:bg-chat-hover/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{tenant.name}</p>
                <p className="text-xs text-muted-foreground">{tenant.plan} · {tenant.usersCount} users</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Usage bar - numbers only */}
              <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                <span>{tenant.messagesUsed.toLocaleString()}</span>
                <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      (tenant.messagesUsed / tenant.messagesLimit) > 0.9 ? "bg-destructive" : "bg-primary/60"
                    )}
                    style={{ width: `${Math.min((tenant.messagesUsed / tenant.messagesLimit) * 100, 100)}%` }}
                  />
                </div>
              </div>
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
        ))}
      </div>

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
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Domain identifier</label>
                <input
                  type="text"
                  value={newTenantDomain}
                  onChange={(e) => setNewTenantDomain(e.target.value)}
                  placeholder="acme"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-chat-input-border bg-chat-input-bg text-sm outline-none focus:border-chat-input-focus focus:ring-2 focus:ring-chat-input-focus/20 transition-all"
                />
                <p className="text-xs text-muted-foreground">
                  Users with emails like user@{newTenantDomain || "domain"}.com will be assigned to this organization
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
                disabled={!newTenantName.trim() || !newTenantDomain.trim() || isAdding}
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsageData();
  }, []);

  const loadUsageData = async () => {
    try {
      setLoading(true);
      const [tenantsResponse, metricsResponse] = await Promise.all([
        adminClient.get("/api/admin/super/tenants"),
        adminClient.get("/api/admin/super/metrics"),
      ]);
      
      const tenants = tenantsResponse.data || [];
      const metrics = metricsResponse.data || {};
      
      // Calculate totals
      const totalMessages = tenants.reduce((acc: number, t: any) => acc + (t.messagesUsed || 0), 0);
      const totalLimit = tenants.reduce((acc: number, t: any) => acc + (t.maxMessagesPerMonth || 0), 0);
      
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
          limit: t.maxMessagesPerMonth || 0,
        }))
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 10);
      
      setTopTenants(sorted);
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
                    (tenant.usage / tenant.limit) > 0.75 ? "bg-yellow-500" : "bg-primary"
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
        <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
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
