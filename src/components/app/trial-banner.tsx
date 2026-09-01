import Link from "next/link";
import { AlertCircle, Clock } from "lucide-react";
import type { Subscription } from "@/db/schema";
import { cn } from "@/lib/utils";

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}

/**
 * Shown only when there is something to act on. A healthy paid subscription
 * renders nothing — a permanent banner is noise the operator learns to ignore.
 */
export function TrialBanner({
  subscription,
}: {
  subscription: Subscription | null;
}) {
  if (!subscription) return null;

  if (subscription.status === "trialing" && subscription.trialEndsAt) {
    const left = daysUntil(subscription.trialEndsAt);
    if (left > 7) return null;

    const expired = left <= 0;
    return (
      <Banner tone={expired || left <= 3 ? "urgent" : "notice"}>
        {expired ? (
          <>Your trial has ended. Choose a plan to keep billing patients.</>
        ) : (
          <>
            {left} {left === 1 ? "day" : "days"} left in your trial.
          </>
        )}
      </Banner>
    );
  }

  if (subscription.status === "past_due") {
    return (
      <Banner tone="urgent">
        Your last payment did not go through. Update your card to avoid losing
        access.
      </Banner>
    );
  }

  if (subscription.status === "canceled") {
    return (
      <Banner tone="urgent">
        Your subscription has ended. Your records are safe, but you cannot
        create new invoices.
      </Banner>
    );
  }

  if (subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd) {
    return (
      <Banner tone="notice">
        Your plan ends on{" "}
        {subscription.currentPeriodEnd.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
        .
      </Banner>
    );
  }

  return null;
}

function Banner({
  tone,
  children,
}: {
  tone: "notice" | "urgent";
  children: React.ReactNode;
}) {
  const Icon = tone === "urgent" ? AlertCircle : Clock;
  return (
    <div
      className={cn(
        "no-print flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2 text-sm sm:px-6",
        tone === "urgent"
          ? "border-destructive/20 bg-destructive/8 text-destructive"
          : "border-warning/25 bg-warning/10 text-warning",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="text-foreground/90">{children}</span>
      <Link
        href="/settings/billing"
        className="font-medium underline underline-offset-4 hover:no-underline"
      >
        View plans
      </Link>
    </div>
  );
}
