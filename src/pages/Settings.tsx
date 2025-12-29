import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Loader2, AlertTriangle, CreditCard, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/hooks/useTheme";

export default function SettingsPage() {
  const { theme } = useTheme();
  const [name, setName] = useState("Jane Smith");
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleSaveName = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const handlePasswordChange = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    setShowPasswordForm(false);
    setPasswordData({ current: "", new: "", confirm: "" });
  };

  const handleClearConversations = async () => {
    setIsClearing(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsClearing(false);
    setClearDialogOpen(false);
  };

  // Mock usage data
  const usageData = {
    messagesUsed: 847,
    messagesLimit: 1000,
    percentUsed: 85,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            to="/"
            className="p-2 -ml-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-chat-hover transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold text-foreground">Settings</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-10">
        {/* Profile Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Profile
          </h2>
          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium text-foreground">
                Name
              </label>
              <div className="flex gap-2">
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-lg border border-chat-input-border bg-chat-input-bg text-sm outline-none transition-colors focus:border-chat-input-focus"
                />
                <button
                  onClick={handleSaveName}
                  disabled={isSaving}
                  className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </button>
              </div>
            </div>

            {/* Email (read-only) */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email</label>
              <div className="px-3 py-2.5 rounded-lg border border-border bg-muted/50 text-sm text-muted-foreground">
                jane.smith@company.com
              </div>
            </div>

            {/* Change Password */}
            <div className="space-y-3">
              <button
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                {showPasswordForm ? "Cancel" : "Change password"}
              </button>

              {showPasswordForm && (
                <div className="space-y-3 p-4 rounded-lg border border-border bg-card animate-fade-in">
                  {/* Current Password */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? "text" : "password"}
                        value={passwordData.current}
                        onChange={(e) =>
                          setPasswordData((prev) => ({ ...prev, current: e.target.value }))
                        }
                        className="w-full px-3 py-2.5 pr-10 rounded-lg border border-chat-input-border bg-chat-input-bg text-sm outline-none focus:border-chat-input-focus"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords((prev) => ({ ...prev, current: !prev.current }))
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPasswords.current ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordData.new}
                        onChange={(e) =>
                          setPasswordData((prev) => ({ ...prev, new: e.target.value }))
                        }
                        className="w-full px-3 py-2.5 pr-10 rounded-lg border border-chat-input-border bg-chat-input-bg text-sm outline-none focus:border-chat-input-focus"
                        placeholder="At least 8 characters"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords((prev) => ({ ...prev, new: !prev.new }))
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPasswords.new ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordData.confirm}
                        onChange={(e) =>
                          setPasswordData((prev) => ({ ...prev, confirm: e.target.value }))
                        }
                        className="w-full px-3 py-2.5 pr-10 rounded-lg border border-chat-input-border bg-chat-input-bg text-sm outline-none focus:border-chat-input-focus"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPasswords.confirm ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handlePasswordChange}
                    disabled={
                      !passwordData.current ||
                      !passwordData.new ||
                      passwordData.new !== passwordData.confirm
                    }
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Update password
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Preferences Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Preferences
          </h2>
          <div className="space-y-4">
            {/* Theme */}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-foreground">Appearance</p>
                <p className="text-sm text-muted-foreground">
                  {theme === "light" ? "Light mode" : "Dark mode"}
                </p>
              </div>
              <ThemeToggle />
            </div>

            {/* Language */}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-foreground">Language</p>
                <p className="text-sm text-muted-foreground">English (US)</p>
              </div>
              <select className="px-3 py-1.5 rounded-lg border border-chat-input-border bg-chat-input-bg text-sm outline-none focus:border-chat-input-focus">
                <option>English (US)</option>
                <option>English (UK)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Privacy Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Privacy
          </h2>
          <div className="p-4 rounded-lg border border-border bg-card space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your conversations are encrypted and stored securely. They are only accessible to you
              and are not used to train AI models. You can delete your conversation history at any
              time.
            </p>
            <button
              onClick={() => setClearDialogOpen(true)}
              className="text-sm text-destructive hover:text-destructive/80 transition-colors"
            >
              Clear my conversations
            </button>
          </div>
        </section>

        {/* Usage Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Usage
          </h2>
          <div className="p-4 rounded-lg border border-border bg-card space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Messages this month</span>
              <span className="font-medium text-foreground">
                {usageData.messagesUsed} / {usageData.messagesLimit}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  usageData.percentUsed >= 90
                    ? "bg-destructive"
                    : usageData.percentUsed >= 75
                    ? "bg-yellow-500"
                    : "bg-primary"
                )}
                style={{ width: `${usageData.percentUsed}%` }}
              />
            </div>
            {usageData.percentUsed >= 75 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                You're approaching your monthly limit. Contact your admin for more.
              </p>
            )}
          </div>
        </section>

        {/* Billing Section (Admin Only) */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Billing
          </h2>
          <Link
            to="/billing"
            className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-chat-hover transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-muted">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Manage Billing</p>
                <p className="text-xs text-muted-foreground">Subscription, payment method, and invoices</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <p className="text-xs text-muted-foreground">
            Only visible to organization administrators.
          </p>
        </section>
      </main>

      {/* Clear Conversations Dialog */}
      {clearDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-foreground/20"
            onClick={() => setClearDialogOpen(false)}
          />
          <div className="relative bg-card border border-border rounded-lg shadow-lg p-6 max-w-sm mx-4 space-y-4 animate-scale-in">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                Clear all conversations?
              </h3>
              <p className="text-sm text-muted-foreground">
                This will permanently delete all your conversation history. This action cannot be
                undone.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setClearDialogOpen(false)}
                className="px-4 py-2 rounded-lg border border-chat-input-border text-sm font-medium hover:bg-chat-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearConversations}
                disabled={isClearing}
                className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {isClearing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Delete all"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
