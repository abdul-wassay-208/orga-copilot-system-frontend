import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Loader2, AlertTriangle, CreditCard, ChevronRight, CheckCircle, Shield, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/hooks/useTheme";
import { adminClient, chatClient } from "@/lib/api-client";
import { toast } from "sonner";

export default function SettingsPage() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [originalName, setOriginalName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [nameError, setNameError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [usageData, setUsageData] = useState({
    messagesUsed: 0,
    messagesLimit: 1000,
    percentUsed: 0,
  });
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);

  // Load user data on mount
  useEffect(() => {
    loadUserData();
    loadUsageData();
    
    // Refresh usage data every 30 seconds for near real-time updates
    const interval = setInterval(() => {
      loadUsageData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      const response = await adminClient.get("/api/auth/me");
      const userData = response.data;
      const userFullName = userData.fullName || userData.email?.split("@")[0] || "User";
      setName(userFullName);
      setOriginalName(userFullName);
      setEmail(userData.email || "");
    } catch (error: any) {
      console.error("Failed to load user data:", error);
      toast.error("Failed to load profile information");
      // Set defaults if API fails
      setName("User");
      setOriginalName("User");
    } finally {
      setIsLoading(false);
    }
  };

  const validateName = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) {
      return "Name cannot be empty";
    }
    if (trimmed.length < 2) {
      return "Name must be at least 2 characters";
    }
    if (trimmed.length > 100) {
      return "Name must be less than 100 characters";
    }
    // Check for valid characters (letters, spaces, hyphens, apostrophes)
    if (!/^[a-zA-Z\s\-'\.]+$/.test(trimmed)) {
      return "Name can only contain letters, spaces, hyphens, apostrophes, and periods";
    }
    return "";
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setNameError("");
    setSaveSuccess(false);
    
    // Validate on change
    const error = validateName(value);
    if (error) {
      setNameError(error);
    }
  };

  const hasChanges = name.trim() !== originalName.trim();
  const isNameValid = !nameError && name.trim().length >= 2;

  const handleSaveName = async () => {
    const trimmedName = name.trim();
    const error = validateName(trimmedName);
    
    if (error) {
      setNameError(error);
      toast.error(error);
      return;
    }

    setIsSaving(true);
    setNameError("");
    setSaveSuccess(false);

    try {
      const response = await adminClient.put("/api/auth/profile", {
        fullName: trimmedName,
      });

      setOriginalName(trimmedName);
      setSaveSuccess(true);
      toast.success("Name updated successfully!");
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error("Failed to update name:", error);
      const errorMessage = error?.response?.data?.message || "Failed to update name. Please try again.";
      setNameError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const validatePasswordForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!passwordData.current) {
      errors.current = "Current password is required";
    }

    if (!passwordData.new) {
      errors.new = "New password is required";
    } else if (passwordData.new.length < 8) {
      errors.new = "Password must be at least 8 characters";
    }

    if (!passwordData.confirm) {
      errors.confirm = "Please confirm your new password";
    } else if (passwordData.new !== passwordData.confirm) {
      errors.confirm = "Passwords do not match";
    }

    if (passwordData.current && passwordData.new && passwordData.current === passwordData.new) {
      errors.new = "New password must be different from current password";
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordChange = async () => {
    if (!validatePasswordForm()) {
      return;
    }

    setIsChangingPassword(true);
    setPasswordErrors({});

    try {
      await adminClient.put("/api/auth/change-password", {
        currentPassword: passwordData.current,
        newPassword: passwordData.new,
        confirmPassword: passwordData.confirm,
      });

      toast.success("Password changed successfully! Please log in again.");
      
      // Clear tokens and log out user (security best practice)
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (error: any) {
      console.error("Failed to change password:", error);
      const errorMessage = error?.response?.data?.message || "Failed to change password. Please try again.";
      
      // Set specific field errors if available
      if (errorMessage.includes("Current password")) {
        setPasswordErrors({ current: errorMessage });
      } else if (errorMessage.includes("New password")) {
        setPasswordErrors({ new: errorMessage });
      } else if (errorMessage.includes("confirmation") || errorMessage.includes("match")) {
        setPasswordErrors({ confirm: errorMessage });
      } else {
        setPasswordErrors({ current: errorMessage });
      }
      
      toast.error(errorMessage);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleCancelPasswordChange = () => {
    setShowPasswordForm(false);
    setPasswordData({ current: "", new: "", confirm: "" });
    setPasswordErrors({});
  };

  const loadUsageData = async () => {
    setIsLoadingUsage(true);
    try {
      const response = await chatClient.get("/chat/usage");
      const data = response.data;
      setUsageData({
        messagesUsed: data.messagesUsed || 0,
        messagesLimit: data.messagesLimit || 1000,
        percentUsed: data.percentUsed || 0,
      });
    } catch (error: any) {
      console.error("Failed to load usage data:", error);
      // Keep existing data on error
    } finally {
      setIsLoadingUsage(false);
    }
  };

  const handleClearConversations = async () => {
    setIsClearing(true);
    
    try {
      const response = await chatClient.delete("/chat/conversations");
      const deletedCount = response.data?.deletedCount || 0;
      
      toast.success(
        deletedCount > 0 
          ? `Successfully deleted ${deletedCount} conversation${deletedCount !== 1 ? 's' : ''}`
          : "All conversations cleared"
      );
      
      setClearDialogOpen(false);
      
      // Refresh usage data after deletion
      loadUsageData();
      
      // Navigate to chat page to see the empty state
      setTimeout(() => {
        navigate("/chat");
      }, 1000);
    } catch (error: any) {
      console.error("Failed to clear conversations:", error);
      const errorMessage = error?.response?.data?.message || "Failed to delete conversations. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsClearing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
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
                <div className="flex-1 relative">
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className={cn(
                      "w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors",
                      nameError
                        ? "border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20"
                        : saveSuccess
                        ? "border-green-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                        : "border-chat-input-border bg-chat-input-bg focus:border-chat-input-focus focus:ring-2 focus:ring-chat-input-focus/20"
                    )}
                    placeholder="Enter your name"
                    disabled={isSaving}
                  />
                  {saveSuccess && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                  )}
                </div>
                <button
                  onClick={handleSaveName}
                  disabled={isSaving || !hasChanges || !isNameValid}
                  className={cn(
                    "px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    hasChanges && isNameValid
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                  )}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
              {nameError && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  {nameError}
                </p>
              )}
              {saveSuccess && !nameError && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Name updated successfully
                </p>
              )}
            </div>

            {/* Email (read-only) */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email</label>
              <div className="px-3 py-2.5 rounded-lg border border-border bg-muted/50 text-sm text-muted-foreground">
                {email || "Loading..."}
              </div>
            </div>

            {/* Change Password */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  if (showPasswordForm) {
                    handleCancelPasswordChange();
                  } else {
                    setShowPasswordForm(true);
                  }
                }}
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
                        onChange={(e) => {
                          setPasswordData((prev) => ({ ...prev, current: e.target.value }));
                          if (passwordErrors.current) {
                            setPasswordErrors((prev) => ({ ...prev, current: "" }));
                          }
                        }}
                        className={cn(
                          "w-full px-3 py-2.5 pr-10 rounded-lg border text-sm outline-none transition-colors",
                          passwordErrors.current
                            ? "border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20"
                            : "border-chat-input-border bg-chat-input-bg focus:border-chat-input-focus focus:ring-2 focus:ring-chat-input-focus/20"
                        )}
                        placeholder="Enter your current password"
                        disabled={isChangingPassword}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords((prev) => ({ ...prev, current: !prev.current }))
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showPasswords.current ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {passwordErrors.current && (
                      <p className="text-xs text-destructive">{passwordErrors.current}</p>
                    )}
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
                        onChange={(e) => {
                          setPasswordData((prev) => ({ ...prev, new: e.target.value }));
                          if (passwordErrors.new) {
                            setPasswordErrors((prev) => ({ ...prev, new: "" }));
                          }
                          // Clear confirm error if passwords now match
                          if (passwordErrors.confirm && e.target.value === passwordData.confirm) {
                            setPasswordErrors((prev) => ({ ...prev, confirm: "" }));
                          }
                        }}
                        className={cn(
                          "w-full px-3 py-2.5 pr-10 rounded-lg border text-sm outline-none transition-colors",
                          passwordErrors.new
                            ? "border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20"
                            : "border-chat-input-border bg-chat-input-bg focus:border-chat-input-focus focus:ring-2 focus:ring-chat-input-focus/20"
                        )}
                        placeholder="At least 8 characters"
                        disabled={isChangingPassword}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords((prev) => ({ ...prev, new: !prev.new }))
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showPasswords.new ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {passwordErrors.new && (
                      <p className="text-xs text-destructive">{passwordErrors.new}</p>
                    )}
                    {!passwordErrors.new && passwordData.new && passwordData.new.length < 8 && (
                      <p className="text-xs text-muted-foreground">
                        Password must be at least 8 characters
                      </p>
                    )}
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
                        onChange={(e) => {
                          setPasswordData((prev) => ({ ...prev, confirm: e.target.value }));
                          if (passwordErrors.confirm) {
                            setPasswordErrors((prev) => ({ ...prev, confirm: "" }));
                          }
                        }}
                        className={cn(
                          "w-full px-3 py-2.5 pr-10 rounded-lg border text-sm outline-none transition-colors",
                          passwordErrors.confirm
                            ? "border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20"
                            : "border-chat-input-border bg-chat-input-bg focus:border-chat-input-focus focus:ring-2 focus:ring-chat-input-focus/20"
                        )}
                        placeholder="Confirm your new password"
                        disabled={isChangingPassword}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showPasswords.confirm ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {passwordErrors.confirm && (
                      <p className="text-xs text-destructive">{passwordErrors.confirm}</p>
                    )}
                    {!passwordErrors.confirm && 
                     passwordData.new && 
                     passwordData.confirm && 
                     passwordData.new !== passwordData.confirm && (
                      <p className="text-xs text-destructive">Passwords do not match</p>
                    )}
                  </div>

                  <button
                    onClick={handlePasswordChange}
                    disabled={
                      isChangingPassword ||
                      !passwordData.current ||
                      !passwordData.new ||
                      !passwordData.confirm ||
                      passwordData.new !== passwordData.confirm ||
                      passwordData.new.length < 8 ||
                      passwordData.current === passwordData.new
                    }
                    className={cn(
                      "w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      "bg-primary text-primary-foreground hover:bg-primary/90",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {isChangingPassword ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Updating password...
                      </span>
                    ) : (
                      "Update password"
                    )}
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
            Privacy & Data Security
          </h2>
          <div className="p-5 rounded-lg border border-border bg-card space-y-5">
            {/* Data Storage & Encryption */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Data Encryption
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                All your conversations are stored in an encrypted PostgreSQL database with SSL/TLS connections. 
                Data is encrypted both in transit (using HTTPS) and at rest in the database. Your conversation 
                content is stored securely and can only be decrypted by authorized system processes.
              </p>
            </div>

            {/* Access Limitations */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                Access Limitations
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your conversations are private and accessible only to you. Our system uses tenant isolation 
                and user-based access controls to ensure that:
              </p>
              <ul className="text-sm text-muted-foreground leading-relaxed space-y-1 ml-4 list-disc">
                <li>Only you can view, edit, or delete your own conversations</li>
                <li>Administrators cannot access your conversation content</li>
                <li>Conversations are isolated by user account and tenant</li>
                <li>All API requests require authentication with your unique token</li>
              </ul>
            </div>

            {/* Training Usage Policy */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                AI Training Usage Policy
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Your conversations are never used to train AI models.</strong> 
                We do not use your conversation data, messages, or any content you share to improve, train, or 
                fine-tune any artificial intelligence systems. Your data remains private and is used solely to 
                provide you with personalized responses within your current conversation context.
              </p>
            </div>

            {/* Data Control */}
            <div className="pt-3 border-t border-border">
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                You have full control over your data. You can delete your conversation history at any time, 
                and all associated messages will be permanently removed from our systems.
              </p>
              <button
                onClick={() => setClearDialogOpen(true)}
                className="text-sm text-destructive hover:text-destructive/80 transition-colors font-medium"
              >
                Clear my conversations
              </button>
            </div>
          </div>
        </section>

        {/* Usage Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Usage
          </h2>
          <div className="p-4 rounded-lg border border-border bg-card space-y-3">
            {isLoadingUsage ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Messages this month</span>
                  <span className="font-medium text-foreground">
                    {usageData.messagesUsed} / {usageData.messagesLimit}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      usageData.percentUsed >= 100
                        ? "bg-destructive"
                        : usageData.percentUsed >= 80
                        ? "bg-yellow-500"
                        : "bg-primary"
                    )}
                    style={{ width: `${Math.min(usageData.percentUsed, 100)}%` }}
                  />
                </div>
                {usageData.percentUsed >= 80 && (
                  <div className={cn(
                    "p-3 rounded-lg border space-y-2 animate-fade-in",
                    usageData.percentUsed >= 100
                      ? "bg-destructive/10 border-destructive/20"
                      : "bg-yellow-500/10 border-yellow-500/20"
                  )}>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className={cn(
                        "h-4 w-4 flex-shrink-0 mt-0.5",
                        usageData.percentUsed >= 100
                          ? "text-destructive"
                          : "text-yellow-600 dark:text-yellow-400"
                      )} />
                      <div className="flex-1 space-y-1">
                        <p className={cn(
                          "text-sm font-medium",
                          usageData.percentUsed >= 100
                            ? "text-destructive"
                            : "text-yellow-900 dark:text-yellow-100"
                        )}>
                          {usageData.percentUsed >= 100 
                            ? "Usage limit reached"
                            : "Approaching usage limit"}
                        </p>
                        <p className={cn(
                          "text-xs leading-relaxed",
                          usageData.percentUsed >= 100
                            ? "text-destructive/90"
                            : "text-yellow-800 dark:text-yellow-200"
                        )}>
                          {usageData.percentUsed >= 100 
                            ? "You've reached your monthly message limit. Contact your administrator to upgrade your plan or request additional messages to avoid service interruption."
                            : `You've used ${usageData.messagesUsed} of ${usageData.messagesLimit} messages this month (${usageData.percentUsed}%). Contact your administrator to upgrade your plan or request additional messages to avoid service interruption.`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {usageData.percentUsed < 80 && (
                  <p className="text-xs text-muted-foreground">
                    Usage resets at the start of each month.
                  </p>
                )}
              </>
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
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  Clear all conversations?
                </h3>
              </div>
              <div className="space-y-2 pl-12">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This will <strong className="text-foreground">permanently delete</strong> all your conversation history, including all messages and conversation titles.
                </p>
                <p className="text-sm text-destructive font-medium">
                  ⚠️ This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setClearDialogOpen(false)}
                disabled={isClearing}
                className="px-4 py-2 rounded-lg border border-chat-input-border text-sm font-medium hover:bg-chat-hover transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleClearConversations}
                disabled={isClearing}
                className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isClearing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </span>
                ) : (
                  "Delete all conversations"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
