import { useState, useEffect } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminClient } from "@/lib/api-client";
import { toast } from "sonner";

interface Plan {
  id: number;
  name: string;
  displayName: string;
  price: number;
  priceUnit: string;
  description: string;
  maxMessagesPerMonth: number;
  maxUsers: number | null;
  isPerUser: boolean;
  highlighted?: boolean;
}

interface SubscriptionPlansProps {
  onSelectPlan?: (planName: string) => void;
  selectedPlanName?: string | null;
}

export function SubscriptionPlans({ onSelectPlan, selectedPlanName }: SubscriptionPlansProps = {}) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(selectedPlanName || null);
  
  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    if (selectedPlanName !== undefined) {
      setSelectedPlan(selectedPlanName);
    }
  }, [selectedPlanName]);
  
  const loadPlans = async () => {
    try {
      setLoading(true);
      const response = await adminClient.get("/api/subscription/plans");
      const backendPlans = response.data || [];
      
      const transformed: Plan[] = backendPlans
        .filter((p: any) => ["BASIC", "PRO", "ENTERPRISE"].includes(p.name))
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          displayName: p.displayName,
          price: p.price,
          priceUnit: p.priceUnit,
          description: p.description,
          maxMessagesPerMonth: p.maxMessagesPerMonth,
          maxUsers: p.maxUsers,
          isPerUser: p.isPerUser,
          highlighted: false,
        }));
      
      setPlans(transformed);
    } catch (error: any) {
      console.error("Failed to load plans:", error);
      toast.error("Failed to load subscription plans");
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Subscription Plans</h2>
          <p className="text-sm text-muted-foreground">Choose the plan that fits your needs</p>
        </div>
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }
  
  const getFeatures = (plan: Plan): string[] => {
    if (plan.name === "ENTERPRISE") return [];
    const features: string[] = [];
    features.push(`${plan.maxMessagesPerMonth.toLocaleString()} messages per month`);
    if (plan.name === "PRO") {
      features.push("Content, videos, training resources");
      features.push("1 AMA webinar per month");
      features.push("Team diagnostics");
    }
    features.push("Cancel anytime");
    return features;
  };
  
  const getBestFor = (plan: Plan): string => {
    switch (plan.name) {
      case "BASIC":
        return "Light usage, predictable cost";
      case "PRO":
        return "Content, training, AMA, and team diagnostics";
      case "ENTERPRISE":
        return "Contact us for custom AI and consulting";
      default:
        return "";
    }
  };
  return (
    <section className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-foreground">Subscription Plans</h2>
        <p className="text-sm text-muted-foreground">Choose the plan that fits your needs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.name}
            onClick={() => {
              if (onSelectPlan && plan.name !== "ENTERPRISE") {
                setSelectedPlan(plan.name);
                onSelectPlan(plan.name);
              }
            }}
            className={cn(
              "relative flex flex-col p-5 rounded-xl border transition-all",
              onSelectPlan && plan.name !== "ENTERPRISE" && "cursor-pointer",
              selectedPlan === plan.name
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-card hover:border-primary/50"
            )}
          >
            <div className="space-y-3 mb-4">
              <h3 className="text-base font-semibold text-foreground">{plan.displayName}</h3>
              {plan.name === "ENTERPRISE" ? (
                <p className="text-sm text-muted-foreground">Contact us</p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-foreground">
                      {plan.price === 0 ? "Free" : `$${plan.price}`}
                    </span>
                    {plan.priceUnit && plan.price > 0 && (
                      <span className="text-sm text-muted-foreground">/{plan.priceUnit}</span>
                    )}
                  </div>
                </>
              )}
            </div>

            {plan.name === "ENTERPRISE" ? (
              <div className="flex-1 mb-4" />
            ) : (
              <ul className="space-y-2 flex-1 mb-4">
                {getFeatures(plan).map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Best for:</span> {getBestFor(plan)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
