import { requireTenantSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { regionForCountry } from "@/config/plans";
import { isStripeConfigured } from "@/lib/stripe";
import { PlanPicker } from "./plan-picker";

// Every render here depends on the signed-in tenant and must never
// be cached or shared across requests.
export const dynamic = "force-dynamic";

export const metadata = { title: "Plan & billing" };

const STATUS_COPY: Record<string, string> = {
  trialing: "Trial",
  active: "Active",
  past_due: "Payment overdue",
  canceled: "Ended",
  paused: "Paused",
};

export default async function BillingSettingsPage({
  searchParams,
}: PageProps<"/settings/billing">) {
  const { clinic, member, subscription } = await requireTenantSession();
  const params = await searchParams;

  if (!can(member, "billing:manage")) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        Only the owner can manage the plan.
      </p>
    );
  }

  // Billing region follows the clinic's own country, not the visitor's — a
  // Pakistani clinic keeps rupee pricing when the owner travels.
  const region = regionForCountry(clinic.country);

  return (
    <div className="flex flex-col gap-6">
      {params.checkout === "success" && (
        <div className="border-success/25 bg-success/10 rounded-lg border px-4 py-3 text-sm">
          Payment received. Your plan is active — it may take a moment to
          appear below.
        </div>
      )}

      {params.checkout === "cancelled" && (
        <div className="bg-muted rounded-lg border px-4 py-3 text-sm">
          Checkout was cancelled. Nothing has been charged.
        </div>
      )}

      {!isStripeConfigured() && (
        <div className="border-warning/25 bg-warning/10 rounded-lg border px-4 py-3 text-sm">
          Billing is not switched on for this installation yet. Plans are shown
          for reference only.
        </div>
      )}

      <section className="bg-card rounded-lg border p-4">
        <h2 className="mb-3 font-medium">Your subscription</h2>
        <dl className="grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground text-xs tracking-wide uppercase">
              Status
            </dt>
            <dd className="font-medium">
              {STATUS_COPY[subscription?.status ?? "trialing"] ?? "Trial"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs tracking-wide uppercase">
              Plan
            </dt>
            <dd className="font-medium capitalize">
              {subscription?.tier ?? "trial"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs tracking-wide uppercase">
              {subscription?.status === "trialing" ? "Trial ends" : "Renews"}
            </dt>
            <dd className="font-medium">
              {(subscription?.status === "trialing"
                ? subscription?.trialEndsAt
                : subscription?.currentPeriodEnd
              )?.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: clinic.timezone,
              }) ?? "—"}
            </dd>
          </div>
        </dl>
      </section>

      <PlanPicker subscription={subscription} region={region} />
    </div>
  );
}
