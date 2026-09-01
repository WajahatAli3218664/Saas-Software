import type { PlanTier } from "@/db/schema";

export type BillingInterval = "monthly" | "biannual" | "annual";

/** Pricing regions. Geo-IP maps a visitor's country onto one of these. */
export type PriceRegion = "PK" | "INTL";

export interface PlanLimits {
  staffSeats: number; // -1 = unlimited
  patients: number;
  services: number;
  invoicesPerMonth: number;
  printTemplates: number;
}

export interface PlanDefinition {
  tier: PlanTier;
  name: string;
  tagline: string;
  features: string[];
  limits: PlanLimits;
  /** Minor units (paisa for PKR, cents for USD), per interval. */
  price: Record<PriceRegion, Record<BillingInterval, number>>;
  /** Stripe price ids, filled from env so test and live keys can differ. */
  stripePriceIds: Record<PriceRegion, Partial<Record<BillingInterval, string>>>;
  highlighted?: boolean;
}

const UNLIMITED = -1;

export const TRIAL_DAYS = 14;

export const PLANS: Record<Exclude<PlanTier, "trial">, PlanDefinition> = {
  starter: {
    tier: "starter",
    name: "Starter",
    tagline: "For a single-room clinic finding its feet.",
    features: [
      "Up to 3 staff accounts",
      "Unlimited patients",
      "Service catalogue & pricing",
      "Invoicing with browser printing",
      "Daily sales summary",
    ],
    limits: {
      staffSeats: 3,
      patients: UNLIMITED,
      services: 50,
      invoicesPerMonth: 500,
      printTemplates: 2,
    },
    price: {
      PK: { monthly: 300000, biannual: 1530000, annual: 2880000 },
      INTL: { monthly: 1900, biannual: 9700, annual: 18200 },
    },
    stripePriceIds: {
      PK: {
        monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_PK_MONTHLY,
        biannual: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_PK_BIANNUAL,
        annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_PK_ANNUAL,
      },
      INTL: {
        monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_INTL_MONTHLY,
        biannual: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_INTL_BIANNUAL,
        annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_INTL_ANNUAL,
      },
    },
  },
  professional: {
    tier: "professional",
    name: "Professional",
    tagline: "For a busy clinic with a full front desk.",
    features: [
      "Up to 15 staff accounts",
      "Per-user permissions & discount caps",
      "Appointment calendar",
      "Multiple print templates",
      "Full reporting & exports",
      "Priority support",
    ],
    limits: {
      staffSeats: 15,
      patients: UNLIMITED,
      services: UNLIMITED,
      invoicesPerMonth: UNLIMITED,
      printTemplates: 10,
    },
    price: {
      PK: { monthly: 750000, biannual: 3825000, annual: 7200000 },
      INTL: { monthly: 4900, biannual: 24900, annual: 46900 },
    },
    stripePriceIds: {
      PK: {
        monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_PK_MONTHLY,
        biannual: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_PK_BIANNUAL,
        annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_PK_ANNUAL,
      },
      INTL: {
        monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_INTL_MONTHLY,
        biannual: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_INTL_BIANNUAL,
        annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_INTL_ANNUAL,
      },
    },
    highlighted: true,
  },
  enterprise: {
    tier: "enterprise",
    name: "Enterprise",
    tagline: "For multi-branch groups.",
    features: [
      "Unlimited staff accounts",
      "Multiple branches",
      "Custom invoice branding",
      "API access",
      "Dedicated onboarding",
    ],
    limits: {
      staffSeats: UNLIMITED,
      patients: UNLIMITED,
      services: UNLIMITED,
      invoicesPerMonth: UNLIMITED,
      printTemplates: UNLIMITED,
    },
    price: {
      PK: { monthly: 1800000, biannual: 9180000, annual: 17280000 },
      INTL: { monthly: 11900, biannual: 60700, annual: 114200 },
    },
    stripePriceIds: {
      PK: {
        monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENT_PK_MONTHLY,
        biannual: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENT_PK_BIANNUAL,
        annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENT_PK_ANNUAL,
      },
      INTL: {
        monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENT_INTL_MONTHLY,
        biannual: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENT_INTL_BIANNUAL,
        annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENT_INTL_ANNUAL,
      },
    },
  },
};

export const PLAN_LIST = Object.values(PLANS);

/** Trial gets Professional limits so the clinic sees the product at its best. */
export const TRIAL_LIMITS: PlanLimits = PLANS.professional.limits;

export function limitsForTier(tier: PlanTier): PlanLimits {
  return tier === "trial" ? TRIAL_LIMITS : PLANS[tier].limits;
}

export function isWithinLimit(used: number, limit: number): boolean {
  return limit === UNLIMITED || used < limit;
}

export const REGION_CURRENCY: Record<PriceRegion, string> = {
  PK: "PKR",
  INTL: "USD",
};

/** Countries billed in rupees; everyone else sees USD. */
const PK_COUNTRIES = new Set(["PK"]);

export function regionForCountry(country: string | null | undefined): PriceRegion {
  if (!country) return "INTL";
  return PK_COUNTRIES.has(country.toUpperCase()) ? "PK" : "INTL";
}

export const INTERVAL_LABELS: Record<BillingInterval, string> = {
  monthly: "Monthly",
  biannual: "Every 6 months",
  annual: "Yearly",
};

/** Headline discount shown on the pricing toggle. */
export function savingsPercent(
  plan: PlanDefinition,
  region: PriceRegion,
  interval: BillingInterval,
): number {
  const monthly = plan.price[region].monthly;
  if (!monthly || interval === "monthly") return 0;
  const months = interval === "annual" ? 12 : 6;
  const full = monthly * months;
  const actual = plan.price[region][interval];
  return Math.round(((full - actual) / full) * 100);
}
