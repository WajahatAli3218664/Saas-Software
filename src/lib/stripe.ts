import "server-only";
import Stripe from "stripe";
import { PLANS, type BillingInterval, type PriceRegion } from "@/config/plans";
import type { PlanTier } from "@/db/schema";

/**
 * Constructed lazily. The app must build and run without Stripe keys —
 * billing is one feature, not a startup requirement — so a missing key throws
 * only when someone actually reaches checkout.
 */
let cached: Stripe | null = null;

export function stripe(): Stripe {
  if (cached) return cached;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set — billing is not configured yet.",
    );
  }

  cached = new Stripe(key, { apiVersion: "2026-08-26.dahlia" });
  return cached;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Resolves the Stripe price id for a plan, region and interval. */
export function priceIdFor(
  tier: Exclude<PlanTier, "trial">,
  region: PriceRegion,
  interval: BillingInterval,
): string | null {
  return PLANS[tier].stripePriceIds[region][interval] ?? null;
}

/** Stripe's subscription statuses are wider than ours; collapse them. */
export function mapSubscriptionStatus(
  status: Stripe.Subscription.Status,
): "trialing" | "active" | "past_due" | "canceled" | "paused" {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "paused":
      return "paused";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    // An incomplete subscription has never been paid for, so it grants nothing.
    case "incomplete":
    default:
      return "canceled";
  }
}

/** Reverse lookup: which of our tiers does this Stripe price belong to? */
export function tierForPriceId(priceId: string): {
  tier: Exclude<PlanTier, "trial">;
  region: PriceRegion;
  interval: BillingInterval;
} | null {
  const regions: PriceRegion[] = ["PK", "INTL"];
  const intervals: BillingInterval[] = ["monthly", "biannual", "annual"];

  for (const [tier, plan] of Object.entries(PLANS)) {
    for (const region of regions) {
      for (const interval of intervals) {
        if (plan.stripePriceIds[region][interval] === priceId) {
          return {
            tier: tier as Exclude<PlanTier, "trial">,
            region,
            interval,
          };
        }
      }
    }
  }

  return null;
}
