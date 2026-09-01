"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
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

const INTERVALS: BillingInterval[] = ["monthly", "biannual", "annual"];

export function PricingTable({ region }: { region: PriceRegion }) {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const reduced = useReducedMotion();
  const currency = REGION_CURRENCY[region];

  /** Annual and six-month prices are quoted per month, which is how clinics
   *  compare them — the total is stated underneath. */
  const perMonth = (total: number) =>
    interval === "annual"
      ? Math.round(total / 12)
      : interval === "biannual"
        ? Math.round(total / 6)
        : total;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-center">
        <div
          role="radiogroup"
          aria-label="Billing period"
          className="bg-muted/60 relative inline-flex rounded-full p-1"
        >
          {INTERVALS.map((option) => {
            const active = interval === option;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setInterval(option)}
                className={cn(
                  "relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {active &&
                  (reduced ? (
                    <span className="bg-background absolute inset-0 rounded-full shadow-sm" />
                  ) : (
                    <motion.span
                      layoutId="interval-pill"
                      className="bg-background absolute inset-0 rounded-full shadow-sm"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 34,
                      }}
                    />
                  ))}
                <span className="relative">{INTERVAL_LABELS[option]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PLAN_LIST.map((plan) => {
          const total = plan.price[region][interval];
          const saving = savingsPercent(plan, region, interval);

          return (
            <div
              key={plan.tier}
              className={cn(
                "bg-card relative flex flex-col gap-5 rounded-xl border p-6",
                plan.highlighted && "border-primary shadow-sm",
              )}
            >
              {plan.highlighted && (
                <span className="bg-primary text-primary-foreground absolute -top-2.5 left-6 rounded-full px-2.5 py-0.5 text-xs font-medium">
                  Most clinics choose this
                </span>
              )}

              <div className="flex flex-col gap-1">
                <h3 className="font-display text-lg font-semibold">
                  {plan.name}
                </h3>
                <p className="text-muted-foreground text-sm">{plan.tagline}</p>
              </div>

              <div className="flex flex-col gap-0.5">
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-3xl font-semibold tracking-tight tabular-nums">
                    {formatMoney(perMonth(total), currency)}
                  </span>
                  <span className="text-muted-foreground text-sm">/month</span>
                </div>
                {interval === "monthly" ? (
                  <span className="text-muted-foreground text-xs">
                    Billed monthly, cancel any time
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">
                    {formatMoney(total, currency)} billed{" "}
                    {interval === "annual" ? "yearly" : "every 6 months"}
                    {saving > 0 && (
                      <span className="text-success"> · save {saving}%</span>
                    )}
                  </span>
                )}
              </div>

              <ul className="flex flex-1 flex-col gap-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check
                      className="text-primary mt-0.5 size-4 shrink-0"
                      aria-hidden
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                variant={plan.highlighted ? "default" : "outline"}
                className="w-full"
              >
                <Link href="/sign-up">Start free trial</Link>
              </Button>
            </div>
          );
        })}
      </div>

      <p className="text-muted-foreground text-center text-sm">
        Every plan starts with a 14-day trial. No card needed to begin.
      </p>
    </div>
  );
}
