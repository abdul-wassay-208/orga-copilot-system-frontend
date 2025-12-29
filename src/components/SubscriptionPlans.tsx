import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Plan {
  name: string;
  price: string;
  priceDetail?: string;
  description: string;
  features: string[];
  bestFor: string;
  highlighted?: boolean;
}

const plans: Plan[] = [
  {
    name: "Free Plan",
    price: "Free",
    description: "For personal exploration",
    features: [
      "Limited access to AI reasoning",
      "Limited monthly messages",
      "Basic conversation history",
      "Standard response speed",
    ],
    bestFor: "Trying the product before upgrading",
  },
  {
    name: "Standard Plan",
    price: "$12",
    priceDetail: "/ month",
    description: "For professionals and power users",
    features: [
      "Extended access to advanced reasoning",
      "2,000 messages per month",
      "Full conversation history",
      "Faster response streaming",
      "Priority reliability",
      "Cancel anytime",
    ],
    bestFor: "Individuals who need consistent AI support",
    highlighted: true,
  },
  {
    name: "Enterprise Plan",
    price: "$10",
    priceDetail: "/ user / month",
    description: "For teams and organizations",
    features: [
      "2,000 messages per user per month",
      "Centralized user & tenant management",
      "Organization-level usage visibility (numbers only)",
      "Tenant-isolated data",
      "Optional organization knowledge base",
      "Admin dashboards (no chat content access)",
      "Priority support & SLA",
    ],
    bestFor: "Organizations needing private, controlled AI access at scale",
  },
];

export function SubscriptionPlans() {
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
            className={cn(
              "relative flex flex-col p-5 rounded-xl border transition-all",
              plan.highlighted
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-card hover:border-primary/50"
            )}
          >
            {plan.highlighted && (
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-primary text-primary-foreground">
                  Popular
                </span>
              </div>
            )}

            <div className="space-y-3 mb-4">
              <h3 className="text-base font-semibold text-foreground">{plan.name}</h3>
              <p className="text-xs text-muted-foreground">{plan.description}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                {plan.priceDetail && (
                  <span className="text-sm text-muted-foreground">{plan.priceDetail}</span>
                )}
              </div>
            </div>

            <ul className="space-y-2 flex-1 mb-4">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Best for:</span> {plan.bestFor}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
