"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Check, X } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type Role = "owner" | "manager" | "staff";

/** Illustrative, not wired to the real permission engine — directionally
 *  the same shape (owner uncapped, everyone else held to a ceiling) as
 *  what actually runs on every invoice in the product. */
const ROLES: Record<
  Role,
  { label: string; cap: number | null; note: string }
> = {
  owner: { label: "Owner", cap: null, note: "No ceiling — it's their clinic." },
  manager: { label: "Manager", cap: 15, note: "Capped at whatever the owner set." },
  staff: { label: "Staff", cap: 0, note: "Nothing, unless the owner grants it." },
};

const SERVICE_PRICE = 2_500_000; // Rs 25,000 in minor units — Botox, Forehead

/**
 * A visitor picks a role and tries to type a discount past what that role is
 * allowed. This is the actual shape of the rule that runs on every real
 * invoice — shown as something to try rather than a line of feature copy,
 * since "permissions per person" is the one claim on this page that's easy
 * to say and hard to picture.
 */
export function PermissionDemo({ currency }: { currency: string }) {
  const [role, setRole] = useState<Role>("manager");
  const [discount, setDiscount] = useState("15");
  const reducedMotion = useReducedMotion();

  const cap = ROLES[role].cap;
  const requested = Math.max(0, Number(discount) || 0);
  const blocked = cap === null ? false : requested > cap;

  const discountAmount = blocked
    ? 0
    : Math.round((SERVICE_PRICE * requested) / 100);
  const total = SERVICE_PRICE - discountAmount;

  const rolePills = useMemo(() => Object.entries(ROLES) as [Role, (typeof ROLES)[Role]][], []);

  return (
    <div className="bg-card overflow-hidden rounded-2xl border">
      <div className="grid gap-0 md:grid-cols-2">
        {/* Controls */}
        <div className="flex flex-col gap-5 border-b p-6 md:border-r md:border-b-0">
          <div>
            <span className="text-primary font-mono text-xs tracking-widest uppercase">
              Try it yourself
            </span>
            <h3 className="font-display mt-1 text-xl font-semibold">
              Give this discount as…
            </h3>
          </div>

          <div role="radiogroup" aria-label="Role" className="flex flex-wrap gap-2">
            {rolePills.map(([key, r]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={role === key}
                onClick={() => setRole(key)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                  role === key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <p className="text-muted-foreground -mt-2 text-xs">{ROLES[role].note}</p>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="demo-discount"
              className="text-xs font-medium tracking-wide uppercase"
            >
              Discount to try (%)
            </label>
            <input
              id="demo-discount"
              type="number"
              min={0}
              max={100}
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className={cn(
                "bg-background w-28 rounded-md border px-3 py-2 text-lg font-medium tabular-nums outline-none",
                "focus-visible:ring-ring focus-visible:ring-2",
                blocked && "border-destructive text-destructive",
              )}
            />
          </div>

          <AnimatePresence mode="wait">
            {blocked ? (
              <motion.div
                key="blocked"
                initial={reducedMotion ? false : { opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="text-destructive flex items-start gap-1.5 text-sm"
              >
                <X className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  Blocked.{" "}
                  {cap === 0
                    ? "This role has no discount permission."
                    : `They can give at most ${cap}%.`}
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="allowed"
                initial={reducedMotion ? false : { opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="text-success flex items-center gap-1.5 text-sm"
              >
                <Check className="size-4 shrink-0" aria-hidden />
                <span>Goes through — within what this role is allowed.</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Receipt-style result */}
        <div className="flex flex-col justify-center gap-3 p-6">
          <div className="flex items-baseline justify-between text-sm">
            <span>Botox — Forehead</span>
            <span className="text-muted-foreground font-mono tabular-nums">
              {formatMoney(SERVICE_PRICE, currency)}
            </span>
          </div>

          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">Discount applied</span>
            <motion.span
              key={blocked ? "none" : discountAmount}
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn(
                "font-mono tabular-nums",
                discountAmount > 0 ? "text-success" : "text-muted-foreground",
              )}
            >
              {discountAmount > 0
                ? `−${formatMoney(discountAmount, currency)}`
                : "—"}
            </motion.span>
          </div>

          <div className="border-primary/25 flex items-baseline justify-between border-t-2 border-dashed pt-3">
            <span className="font-display font-semibold">Total</span>
            <motion.span
              key={total}
              initial={reducedMotion ? false : { scale: 0.94, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="text-primary font-display text-2xl font-bold tabular-nums"
            >
              {formatMoney(total, currency)}
            </motion.span>
          </div>

          <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
            This is the same check that runs on every real invoice — a
            discount past someone&apos;s limit is refused before it ever
            reaches the total, not just hidden in the menu.
          </p>
        </div>
      </div>
    </div>
  );
}
