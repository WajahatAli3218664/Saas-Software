"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, ExternalLink } from "lucide-react";
import type { PlanTier, Subscription } from "@/db/schema";
import {
  PLAN_LIST,
  INTERVAL_LABELS,
  REGION_CURRENCY,
  savingsPercent,
  type BillingInterval,
  type PriceRegion,
} from "@/config/plans";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { startCheckout, openBillingPortal } from "./actions";

const INTERVALS: BillingInterval[] = ["monthly", "biannual", "annual"];

export function PlanPicker({
  subscription,
  region,
}: {
  subscription: Subscription | null;
  region: PriceRegion;
}) {
  const [interval, setInterval] = useState<BillingInterval>(
    subscription?.interval ?? "monthly",
  );
  const [pendingTier, setPendingTier] = useState<PlanTier | null>(null);
  const [, startTransition] = useTransition();

  const currency = REGION_CURRENCY[region];
  const currentTier = subscription?.tier ?? "trial";
  const isPaid =
    subscription?.status === "active" || subscription?.status === "past_due";

  function choose(tier: Exclude<PlanTier, "trial">) {
    setPendingTier(tier);
    startTransition(async () => {
      const result = await startCheckout(tier, interval, region);
      setPendingTier(null);

      if (!result.ok || !result.url) {
        toast.error(result.error ?? "Could not start checkout.");
        return;
      }

      window.location.href = result.url;
    });
  }

  function portal() {
    startTransition(async () => {
      const result = await openBillingPortal();
      if (!result.ok || !result.url) {
        toast.error(result.error ?? "Could not open the billing portal.");
        return;
      }
      window.location.href = result.url;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="radiogroup"
          aria-label="Billing period"
          className="bg-muted/60 inline-flex rounded-full p-1"
        >
          {INTERVALS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={interval === option}
              onClick={() => setInterval(option)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                interval === option
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              {INTERVAL_LABELS[option]}
            </button>
          ))}
        </div>

        {isPaid && (
          <Button variant="outline" size="sm" onClick={portal}>
            Manage billing
            <ExternalLink className="size-3.5" aria-hidden />
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PLAN_LIST.map((plan) => {
          const total = plan.price[region][interval];
          const months =
            interval === "annual" ? 12 : interval === "biannual" ? 6 : 1;
          const perMonth = Math.round(total / months);
          const saving = savingsPercent(plan, region, interval);
          const isCurrent =
            currentTier === plan.tier && subscription?.interval === interval;

          return (
            <div
              key={plan.tier}
              className={cn(
                "bg-card relative flex flex-col gap-4 rounded-xl border p-5",
                isCurrent && "border-primary",
              )}
            >
              {isCurrent && (
                <span className="bg-primary text-primary-foreground absolute -top-2.5 left-5 rounded-full px-2.5 py-0.5 text-xs font-medium">
                  Current plan
                </span>
              )}

              <div>
                <h3 className="font-display text-lg font-semibold">
                  {plan.name}
                </h3>
                <p className="text-muted-foreground text-sm">{plan.tagline}</p>
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-2xl font-semibold tabular-nums">
                    {formatMoney(perMonth, currency)}
                  </span>
                  <span className="text-muted-foreground text-sm">/month</span>
                </div>
                {interval !== "monthly" && (
                  <span className="text-muted-foreground text-xs">
                    {formatMoney(total, currency)} billed{" "}
                    {interval === "annual" ? "yearly" : "every 6 months"}
                    {saving > 0 && (
                      <span className="text-success"> · save {saving}%</span>
                    )}
                  </span>
                )}
              </div>

              <ul className="flex flex-1 flex-col gap-1.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check
                      className="text-primary mt-0.5 size-3.5 shrink-0"
                      aria-hidden
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={
                  isCurrent
                    ? "outline"
                    : plan.highlighted
                      ? "default"
                      : "outline"
                }
                disabled={isCurrent || pendingTier !== null}
                onClick={() => choose(plan.tier)}
                className="w-full"
              >
                {isCurrent
                  ? "Your plan"
                  : pendingTier === plan.tier
                    ? "Opening…"
                    : isPaid
                      ? "Switch to this"
                      : "Choose this plan"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
