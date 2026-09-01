"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PermissionError } from "@/lib/permissions";
import { stripe, priceIdFor, isStripeConfigured } from "@/lib/stripe";
import type { BillingInterval, PriceRegion } from "@/config/plans";
import type { PlanTier } from "@/db/schema";

export interface CheckoutResult {
  ok: boolean;
  url?: string;
  error?: string;
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

/**
 * Starts Stripe Checkout for a plan. The clinic id travels in metadata and in
 * client_reference_id so the webhook can find the tenant without trusting the
 * browser to report back.
 */
export async function startCheckout(
  tier: Exclude<PlanTier, "trial">,
  interval: BillingInterval,
  region: PriceRegion,
): Promise<CheckoutResult> {
  try {
    if (!isStripeConfigured()) {
      return {
        ok: false,
        error: "Billing is not switched on yet. Please contact support.",
      };
    }

    const { clinic, member, subscription } =
      await requirePermission("billing:manage");

    const priceId = priceIdFor(tier, region, interval);
    if (!priceId) {
      return {
        ok: false,
        error: "That plan is not available yet. Please contact support.",
      };
    }

    const client = stripe();

    // Reuse the customer so a clinic that upgrades keeps one billing history
    // rather than accumulating duplicates in Stripe.
    let customerId = subscription?.stripeCustomerId ?? null;
    if (!customerId) {
      const customer = await client.customers.create({
        name: clinic.name,
        email: clinic.email || member.email,
        metadata: { clinicId: clinic.id, clerkOrgId: clinic.clerkOrgId },
      });
      customerId = customer.id;

      await db
        .update(subscriptions)
        .set({ stripeCustomerId: customerId, updatedAt: new Date() })
        .where(eq(subscriptions.clinicId, clinic.id));
    }

    const session = await client.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: clinic.id,
      subscription_data: {
        metadata: { clinicId: clinic.id, tier, interval },
      },
      success_url: `${appUrl()}/settings/billing?checkout=success`,
      cancel_url: `${appUrl()}/settings/billing?checkout=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    });

    return session.url
      ? { ok: true, url: session.url }
      : { ok: false, error: "Stripe did not return a checkout link." };
  } catch (error) {
    if (error instanceof PermissionError) {
      return { ok: false, error: "Only the owner can change the plan." };
    }
    console.error("[billing-checkout]", error);
    return { ok: false, error: "Could not start checkout. Please try again." };
  }
}

/** Opens Stripe's own portal for cards, invoices and cancellation. */
export async function openBillingPortal(): Promise<CheckoutResult> {
  try {
    if (!isStripeConfigured()) {
      return { ok: false, error: "Billing is not switched on yet." };
    }

    const { subscription } = await requirePermission("billing:manage");

    if (!subscription?.stripeCustomerId) {
      return {
        ok: false,
        error: "There is no billing account yet — choose a plan first.",
      };
    }

    const session = await stripe().billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${appUrl()}/settings/billing`,
    });

    return { ok: true, url: session.url };
  } catch (error) {
    if (error instanceof PermissionError) {
      return { ok: false, error: "Only the owner can manage billing." };
    }
    console.error("[billing-portal]", error);
    return { ok: false, error: "Could not open the billing portal." };
  }
}
