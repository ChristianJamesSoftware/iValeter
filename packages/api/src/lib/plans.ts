export type FeatureKey =
  | "inspection"
  | "photography"
  | "freshScent"
  | "paintProtection"
  | "xero";

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  inspection: "Vehicle Inspection",
  photography: "Photography Service",
  freshScent: "Fresh Scent Add-on",
  paintProtection: "Paint Protection Add-on",
  xero: "Xero Integration",
};

export type PlanKey = "starter" | "pro" | "enterprise";

export interface PlanDef {
  key: PlanKey;
  name: string;
  maxSites: number; // -1 = unlimited
  monthlyPriceGbp: number;
  features: FeatureKey[];
  highlights: string[];
}

export const PLANS: Record<PlanKey, PlanDef> = {
  starter: {
    key: "starter",
    name: "Starter",
    maxSites: 2,
    monthlyPriceGbp: 99,
    features: ["inspection", "freshScent"],
    highlights: ["Up to 2 sites", "Core booking & job flow", "Vehicle inspection"],
  },
  pro: {
    key: "pro",
    name: "Pro",
    maxSites: 10,
    monthlyPriceGbp: 249,
    features: ["inspection", "photography", "freshScent", "paintProtection", "xero"],
    highlights: ["Up to 10 sites", "All features", "Xero integration", "Photography"],
  },
  enterprise: {
    key: "enterprise",
    name: "Enterprise",
    maxSites: -1,
    monthlyPriceGbp: 599,
    features: ["inspection", "photography", "freshScent", "paintProtection", "xero"],
    highlights: ["Unlimited sites", "White-label", "API access", "Priority support"],
  },
};

export function planFeatures(plan: string): FeatureKey[] {
  return PLANS[(plan as PlanKey) in PLANS ? (plan as PlanKey) : "starter"].features;
}
