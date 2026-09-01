import { PricingTable } from "@/components/marketing/pricing-table";
import { getPriceRegion } from "@/lib/geo";

export const metadata = {
  title: "Pricing",
  description:
    "Monthly, six-monthly and yearly plans for aesthetic clinics. Start with a 14-day trial.",
};

export default async function PricingPage() {
  const region = await getPriceRegion();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
      <div className="mb-10 flex flex-col items-center gap-3 text-center">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-balance">
          Pricing
        </h1>
        <p className="text-muted-foreground max-w-lg">
          Pay monthly and stop whenever you like, or pay ahead and keep more of
          the difference.
        </p>
      </div>
      <PricingTable region={region} />
    </div>
  );
}
