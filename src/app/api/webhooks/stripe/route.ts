import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { stripe, mapSubscriptionStatus, tierForPriceId } from "@/lib/stripe";

/** Stripe sends seconds; the column stores a timestamp. */
function toDate(seconds: number | null | undefined): Date | null {
  return seconds ? new Date(seconds * 1000) : null;
}

/**
 * Writes Stripe's view of a subscription onto the clinic. The clinic id comes
 * from metadata set at checkout, falling back to the customer id we recorded,
 * so a subscription created in the Stripe dashboard still lands correctly.
 */
async function syncSubscription(subscription: Stripe.Subscription) {
  const clinicId = subscription.metadata?.clinicId;
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const item = subscription.items.data[0];
  const priceId = item?.price?.id ?? null;
  const resolved = priceId ? tierForPriceId(priceId) : null;

  const values = {
    status: mapSubscriptionStatus(subscription.status),
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    currentPeriodEnd: toDate(item?.current_period_end),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    updatedAt: new Date(),
    ...(resolved ? { tier: resolved.tier, interval: resolved.interval } : {}),
  };

  if (clinicId) {
    await db
      .update(subscriptions)
      .set(values)
      .where(eq(subscriptions.clinicId, clinicId));
    return;
  }

  await db
    .update(subscriptions)
    .set(values)
    .where(eq(subscriptions.stripeCustomerId, customerId));
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");

  if (!secret || !signature) {
    return new NextResponse("Webhook not configured", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    // The raw body is required — parsing it first would break the signature.
    const body = await req.text();
    event = stripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode !== "subscription" || !session.subscription) break;

        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;

        // Checkout's own payload is thin, so fetch the subscription to get
        // the period end and the price actually charged.
        const subscription =
          await stripe().subscriptions.retrieve(subscriptionId);

        if (!subscription.metadata?.clinicId && session.client_reference_id) {
          subscription.metadata = {
            ...subscription.metadata,
            clinicId: session.client_reference_id,
          };
        }

        await syncSubscription(subscription);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(event.data.object);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;

        if (customerId) {
          await db
            .update(subscriptions)
            .set({ status: "past_due", updatedAt: new Date() })
            .where(eq(subscriptions.stripeCustomerId, customerId));
        }
        break;
      }
    }
  } catch (error) {
    console.error(`[stripe-webhook] ${event.type} failed`, error);
    // 500 makes Stripe retry — losing a subscription update would either lock
    // out a paying clinic or let a lapsed one keep writing.
    return new NextResponse("Handler failed", { status: 500 });
  }

  return NextResponse.json({ received: true });
}
