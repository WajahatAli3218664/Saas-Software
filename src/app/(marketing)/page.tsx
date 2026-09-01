import Link from "next/link";
import {
  ArrowRight,
  Receipt,
  Printer,
  ShieldCheck,
  Users,
  Sparkles,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";
import { PricingTable } from "@/components/marketing/pricing-table";
import { getPriceRegion } from "@/lib/geo";

const FEATURES = [
  {
    icon: Receipt,
    title: "Billing that matches how you work",
    body: "Build an invoice from your own price list, apply a discount inside the limit you set, take part payment now and the rest later.",
  },
  {
    icon: ShieldCheck,
    title: "Permissions per person, not per role",
    body: "Decide who can add a treatment, who can change a price, and exactly how much discount each person may give. Every discount records who approved it.",
  },
  {
    icon: Printer,
    title: "Prints on the printer you already have",
    body: "A4, A5 or a thermal receipt roll, with your logo and tax number. Nothing to install — it uses the printer your computer already knows about.",
  },
  {
    icon: Users,
    title: "Patient records that stay with the patient",
    body: "Treatment history, allergies and past invoices on one screen, so the person at the desk never has to ask twice.",
  },
  {
    icon: Sparkles,
    title: "Your catalogue, ready on day one",
    body: "Injectables, skin treatments, lasers and consultations are already there. Rename them, reprice them, add your own.",
  },
  {
    icon: CalendarDays,
    title: "A day view the front desk can run from",
    body: "Who is coming, who is with whom, and what is still owed — the three things the desk needs before lunch.",
  },
];

export default async function LandingPage() {
  const region = await getPriceRegion();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div
          aria-hidden
          className="from-primary/8 pointer-events-none absolute inset-0 bg-gradient-to-b via-transparent to-transparent"
        />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="flex max-w-2xl flex-col gap-6">
            <Reveal>
              <span className="border-primary/25 bg-primary/8 text-primary inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium">
                Built for aesthetic clinics
              </span>
            </Reveal>

            <Reveal delay={0.05}>
              <h1 className="font-display text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                Run the whole clinic from the front desk.
              </h1>
            </Reveal>

            <Reveal delay={0.1}>
              <p className="text-muted-foreground max-w-xl text-lg">
                Appointments, treatment records, invoicing and printing — in one
                place, on any device, for a monthly fee instead of a lump sum.
              </p>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link href="/sign-up">
                    Start your 14-day trial
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="lg">
                  <Link href="/pricing">See pricing</Link>
                </Button>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <p className="text-muted-foreground text-sm">
                No card to start. Set up your clinic in about two minutes.
              </p>
            </Reveal>
          </div>

          {/* Product glimpse — a real invoice line, not a stock screenshot. */}
          <Reveal delay={0.25} className="mt-14">
            <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
              <div className="bg-muted/40 flex items-center gap-2 border-b px-4 py-2.5">
                <span className="bg-destructive/40 size-2.5 rounded-full" />
                <span className="bg-warning/40 size-2.5 rounded-full" />
                <span className="bg-success/40 size-2.5 rounded-full" />
                <span className="text-muted-foreground ml-2 font-mono text-xs">
                  INV-000318 · Ayesha K. · P-0126
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-lg text-sm">
                  <thead className="text-muted-foreground border-b text-xs uppercase">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">
                        Treatment
                      </th>
                      <th className="px-4 py-2 text-right font-medium">Qty</th>
                      <th className="px-4 py-2 text-right font-medium">
                        Price
                      </th>
                      <th className="px-4 py-2 text-right font-medium">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    <tr className="border-b">
                      <td className="px-4 py-2.5">HydraFacial</td>
                      <td className="px-4 py-2.5 text-right">1</td>
                      <td className="px-4 py-2.5 text-right">12,000</td>
                      <td className="px-4 py-2.5 text-right">12,000</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-2.5">
                        Botox — Forehead
                        <span className="text-success ml-2 text-xs">
                          10% off
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">1</td>
                      <td className="px-4 py-2.5 text-right">25,000</td>
                      <td className="px-4 py-2.5 text-right">22,500</td>
                    </tr>
                    <tr>
                      <td
                        className="text-muted-foreground px-4 py-2.5"
                        colSpan={3}
                      >
                        Total due
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold">
                        34,500
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <Reveal>
            <h2 className="font-display max-w-xl text-3xl font-semibold tracking-tight text-balance">
              Everything the desk needs, nothing it does not.
            </h2>
          </Reveal>

          <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <Reveal key={feature.title} delay={i * 0.04}>
                <div className="flex flex-col gap-2.5">
                  <span className="bg-primary/10 text-primary grid size-9 place-items-center rounded-lg">
                    <feature.icon className="size-4.5" aria-hidden />
                  </span>
                  <h3 className="font-medium">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-b">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <Reveal>
            <div className="mb-10 flex flex-col items-center gap-3 text-center">
              <h2 className="font-display text-3xl font-semibold tracking-tight text-balance">
                One fee a month. Cancel whenever.
              </h2>
              <p className="text-muted-foreground max-w-lg">
                No setup charge, no per-invoice fee, no licence to buy up front.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <PricingTable region={region} />
          </Reveal>
        </div>
      </section>

      {/* Close */}
      <section>
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <Reveal>
            <div className="border-primary/20 from-primary/8 flex flex-col items-center gap-5 rounded-2xl border bg-gradient-to-b to-transparent px-6 py-14 text-center">
              <h2 className="font-display max-w-xl text-3xl font-semibold tracking-tight text-balance">
                Try it on tomorrow&apos;s appointments.
              </h2>
              <p className="text-muted-foreground max-w-md">
                Set up your clinic, add your price list, and bill a real patient
                — all before the trial asks you for anything.
              </p>
              <Button asChild size="lg">
                <Link href="/sign-up">
                  Start free
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
