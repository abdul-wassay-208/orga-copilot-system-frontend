import { AlertTriangle, XCircle, Clock, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface UsageBannerProps {
  type: "approaching" | "reached" | "inactive" | "grace";
  remainingPercent?: number;
  daysRemaining?: number;
  onUpgrade?: () => void;
  onDismiss?: () => void;
}

export function UsageBanner({
  type,
  remainingPercent,
  daysRemaining,
  onUpgrade,
  onDismiss,
}: UsageBannerProps) {
  const configs = {
    approaching: {
      icon: AlertTriangle,
      title: "Approaching usage limit",
      message: `You've used ${100 - (remainingPercent ?? 0)}% of your monthly allowance.`,
      bg: "bg-yellow-500/10 border-yellow-500/20",
      iconColor: "text-yellow-600 dark:text-yellow-400",
      showUpgrade: true,
    },
    reached: {
      icon: XCircle,
      title: "Usage limit reached",
      message: "You've reached your monthly message limit. Upgrade to continue.",
      bg: "bg-destructive/10 border-destructive/20",
      iconColor: "text-destructive",
      showUpgrade: true,
    },
    inactive: {
      icon: Clock,
      title: "Subscription inactive",
      message: "Your subscription is currently inactive. Please update your payment method.",
      bg: "bg-muted border-border",
      iconColor: "text-muted-foreground",
      showUpgrade: true,
    },
    grace: {
      icon: Clock,
      title: "Grace period active",
      message: `Your subscription has ${daysRemaining} days remaining in the grace period.`,
      bg: "bg-blue-500/10 border-blue-500/20",
      iconColor: "text-blue-600 dark:text-blue-400",
      showUpgrade: true,
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 rounded-lg border animate-fade-in",
        config.bg
      )}
    >
      <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", config.iconColor)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{config.title}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{config.message}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {config.showUpgrade && onUpgrade && (
          <button
            onClick={onUpgrade}
            className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            Upgrade
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 rounded hover:bg-foreground/10 text-muted-foreground"
            aria-label="Dismiss"
          >
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

interface LimitReachedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
}

export function LimitReachedModal({
  isOpen,
  onClose,
  onUpgrade,
}: LimitReachedModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-card border border-border rounded-xl shadow-lg p-6 max-w-sm mx-4 w-full space-y-4 animate-scale-in">
        <div className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle className="h-6 w-6 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            Message limit reached
          </h3>
          <p className="text-sm text-muted-foreground">
            You've used all your messages for this period. Upgrade your plan or
            wait until your limit resets.
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Upgrade plan
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-chat-hover transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

export function PrivacyBadge({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/5 border border-primary/10",
        className
      )}
    >
      <Shield className="h-3 w-3 text-primary" />
      <span className="text-xs font-medium text-primary">Private by Design</span>
    </div>
  );
}

export function PrivacyDisclaimer() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border">
      <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <p className="text-xs text-muted-foreground">
        Admins cannot view conversation content. Only usage numbers are visible.
      </p>
    </div>
  );
}
