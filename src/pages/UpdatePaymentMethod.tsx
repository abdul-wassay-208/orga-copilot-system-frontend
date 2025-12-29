import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

type FormState = "idle" | "loading" | "success" | "error";

export default function UpdatePaymentMethodPage() {
  const navigate = useNavigate();
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState({
    cardholderName: "",
    cardNumber: "",
    expiry: "",
    cvc: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: string) => {
    let formattedValue = value;

    // Format card number with spaces
    if (field === "cardNumber") {
      formattedValue = value
        .replace(/\D/g, "")
        .replace(/(.{4})/g, "$1 ")
        .trim()
        .slice(0, 19);
    }

    // Format expiry as MM/YY
    if (field === "expiry") {
      formattedValue = value
        .replace(/\D/g, "")
        .replace(/^(\d{2})/, "$1/")
        .slice(0, 5);
    }

    // Format CVC
    if (field === "cvc") {
      formattedValue = value.replace(/\D/g, "").slice(0, 4);
    }

    setFormData((prev) => ({ ...prev, [field]: formattedValue }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.cardholderName.trim()) {
      newErrors.cardholderName = "Cardholder name is required";
    }

    if (!formData.cardNumber || formData.cardNumber.replace(/\s/g, "").length < 16) {
      newErrors.cardNumber = "Please enter a valid card number";
    }

    if (!formData.expiry || formData.expiry.length < 5) {
      newErrors.expiry = "Please enter a valid expiry date";
    }

    if (!formData.cvc || formData.cvc.length < 3) {
      newErrors.cvc = "Please enter a valid CVC";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setFormState("loading");
    setErrorMessage("");

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Simulate success (or error for testing)
    const isSuccess = Math.random() > 0.2;

    if (isSuccess) {
      setFormState("success");
    } else {
      setFormState("error");
      setErrorMessage("We couldn't update your payment method. Please check your card details and try again.");
    }
  };

  if (formState === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
            <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-foreground">Payment method updated</h1>
            <p className="text-sm text-muted-foreground">
              Your new card ending in {formData.cardNumber.slice(-4)} has been saved.
            </p>
          </div>
          <button
            onClick={() => navigate("/billing")}
            className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Return to Billing
          </button>
        </div>
      </div>
    );
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
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Error Banner */}
          {formState === "error" && errorMessage && (
            <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
              {errorMessage}
            </div>
          )}

          {/* Cardholder Name */}
          <div className="space-y-1.5">
            <label htmlFor="cardholderName" className="text-sm font-medium text-foreground">
              Cardholder Name
            </label>
            <input
              id="cardholderName"
              type="text"
              value={formData.cardholderName}
              onChange={(e) => updateField("cardholderName", e.target.value)}
              className={cn(
                "w-full px-3 py-2.5 rounded-lg border bg-chat-input-bg text-sm outline-none transition-colors",
                errors.cardholderName
                  ? "border-destructive focus:border-destructive"
                  : "border-chat-input-border focus:border-chat-input-focus"
              )}
              placeholder="Jane Smith"
              disabled={formState === "loading"}
            />
            {errors.cardholderName && (
              <p className="text-xs text-destructive">{errors.cardholderName}</p>
            )}
          </div>

          {/* Card Number (Stripe Element Placeholder) */}
          <div className="space-y-1.5">
            <label htmlFor="cardNumber" className="text-sm font-medium text-foreground">
              Card Number
            </label>
            <div className="relative">
              <input
                id="cardNumber"
                type="text"
                value={formData.cardNumber}
                onChange={(e) => updateField("cardNumber", e.target.value)}
                className={cn(
                  "w-full px-3 py-2.5 pr-10 rounded-lg border bg-chat-input-bg text-sm outline-none transition-colors font-mono tracking-wider",
                  errors.cardNumber
                    ? "border-destructive focus:border-destructive"
                    : "border-chat-input-border focus:border-chat-input-focus"
                )}
                placeholder="1234 5678 9012 3456"
                disabled={formState === "loading"}
              />
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            </div>
            {errors.cardNumber && (
              <p className="text-xs text-destructive">{errors.cardNumber}</p>
            )}
          </div>

          {/* Expiry & CVC */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="expiry" className="text-sm font-medium text-foreground">
                Expiry Date
              </label>
              <input
                id="expiry"
                type="text"
                value={formData.expiry}
                onChange={(e) => updateField("expiry", e.target.value)}
                className={cn(
                  "w-full px-3 py-2.5 rounded-lg border bg-chat-input-bg text-sm outline-none transition-colors font-mono",
                  errors.expiry
                    ? "border-destructive focus:border-destructive"
                    : "border-chat-input-border focus:border-chat-input-focus"
                )}
                placeholder="MM/YY"
                disabled={formState === "loading"}
              />
              {errors.expiry && (
                <p className="text-xs text-destructive">{errors.expiry}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="cvc" className="text-sm font-medium text-foreground">
                CVC
              </label>
              <input
                id="cvc"
                type="text"
                value={formData.cvc}
                onChange={(e) => updateField("cvc", e.target.value)}
                className={cn(
                  "w-full px-3 py-2.5 rounded-lg border bg-chat-input-bg text-sm outline-none transition-colors font-mono",
                  errors.cvc
                    ? "border-destructive focus:border-destructive"
                    : "border-chat-input-border focus:border-chat-input-focus"
                )}
                placeholder="123"
                disabled={formState === "loading"}
              />
              {errors.cvc && (
                <p className="text-xs text-destructive">{errors.cvc}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <button
              type="submit"
              disabled={formState === "loading"}
              className={cn(
                "w-full py-2.5 rounded-lg font-medium text-sm transition-all",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {formState === "loading" ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save Card"
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate("/billing")}
              disabled={formState === "loading"}
              className="w-full py-2.5 rounded-lg border border-chat-input-border text-sm font-medium hover:bg-chat-hover transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>

          {/* Security Note */}
          <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
            <Lock className="h-3 w-3" />
            Your payment information is encrypted and secure.
          </p>
        </form>
      </main>
    </div>
  );
}
