import { useState } from "react";
import { Loader2, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface CouponCheckoutPromptProps {
  planName: string;
  planDisplayName?: string;
  onProceed: (couponCode?: string) => Promise<void>;
  onCancel?: () => void;
  validateCoupon: (code: string) => Promise<{ valid: boolean; planName?: string; message?: string }>;
  disabled?: boolean;
}

export function CouponCheckoutPrompt({
  planName,
  planDisplayName,
  onProceed,
  onCancel,
  validateCoupon,
  disabled = false,
}: CouponCheckoutPromptProps) {
  const [step, setStep] = useState<"ask" | "input">("ask");
  const [couponCode, setCouponCode] = useState("");
  const [validating, setValidating] = useState(false);
  const [proceeding, setProceeding] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponValid, setCouponValid] = useState<{ planName: string } | null>(null);

  const handleNoCoupon = async () => {
    setProceeding(true);
    try {
      await onProceed();
    } finally {
      setProceeding(false);
    }
  };

  const handleValidate = async () => {
    const code = couponCode.trim();
    if (!code) {
      setCouponError("Enter a coupon code");
      return;
    }
    setValidating(true);
    setCouponError(null);
    setCouponValid(null);
    try {
      const result = await validateCoupon(code);
      if (result.valid) {
        setCouponValid({ planName: result.planName || "Basic or Pro" });
      } else {
        setCouponError(result.message || "Invalid coupon");
      }
    } catch (e: any) {
      setCouponError(e?.response?.data?.message || "Could not validate coupon");
    } finally {
      setValidating(false);
    }
  };

  const handleProceedWithCoupon = async () => {
    if (!couponValid || !couponCode.trim()) return;
    setProceeding(true);
    try {
      await onProceed(couponCode.trim());
    } finally {
      setProceeding(false);
    }
  };

  return (
    <div className="p-5 rounded-xl border border-border bg-card space-y-4 max-w-md mx-auto">
      <div className="flex items-center gap-2">
        <Tag className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-base font-semibold text-foreground">
          {planDisplayName || planName} — Checkout
        </h3>
      </div>

      {step === "ask" ? (
        <>
          <p className="text-sm text-muted-foreground">
            Do you have a coupon code? You&apos;ll get a free trial if your coupon is valid.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleNoCoupon}
              disabled={disabled || proceeding}
              className={cn(
                "flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors",
                "border border-chat-input-border bg-chat-input-bg text-foreground hover:bg-chat-hover",
                (disabled || proceeding) && "opacity-50 cursor-not-allowed"
              )}
            >
              {proceeding ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : (
                "No, continue to checkout"
              )}
            </button>
            <button
              type="button"
              onClick={() => setStep("input")}
              disabled={disabled || proceeding}
              className={cn(
                "flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                (disabled || proceeding) && "opacity-50 cursor-not-allowed"
              )}
            >
              Yes, I have a coupon
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Coupon code</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value.toUpperCase());
                  setCouponError(null);
                }}
                placeholder="e.g. BASIC-XXXXXXXX"
                className="flex-1 px-3 py-2 rounded-lg border border-chat-input-border bg-chat-input-bg text-sm outline-none focus:border-chat-input-focus"
                disabled={validating || proceeding}
              />
              <button
                type="button"
                onClick={handleValidate}
                disabled={validating || !couponCode.trim() || proceeding}
                className="px-3 py-2 rounded-lg border border-chat-input-border text-sm font-medium hover:bg-chat-hover disabled:opacity-50 transition-colors"
              >
                {validating ? "..." : "Validate"}
              </button>
            </div>
            {couponError && <p className="text-xs text-destructive">{couponError}</p>}
            {couponValid && (
              <p className="text-xs text-green-600 dark:text-green-400">
                Valid for {couponValid.planName}. You&apos;ll get a free trial.
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setStep("ask");
                setCouponCode("");
                setCouponError(null);
                setCouponValid(null);
              }}
              disabled={proceeding}
              className="px-4 py-2.5 rounded-lg border border-chat-input-border text-sm font-medium hover:bg-chat-hover text-foreground disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleProceedWithCoupon}
              disabled={!couponValid || proceeding}
              className={cn(
                "flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                (!couponValid || proceeding) && "opacity-50 cursor-not-allowed"
              )}
            >
              {proceeding ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : (
                "Continue to checkout (free trial)"
              )}
            </button>
          </div>
        </>
      )}

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
