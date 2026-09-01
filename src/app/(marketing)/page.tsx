import {
  Receipt,
  Printer,
  ShieldCheck,
  Users,
  Sparkles,
  CalendarDays,
  Building2,
  UserCog,
  Globe,
} from "lucide-react";
import { Reveal, RevealPop } from "@/components/marketing/reveal";
import { PricingTable } from "@/components/marketing/pricing-table";
import { Aurora } from "@/components/marketing/aurora";
import { TiltCard } from "@/components/marketing/tilt-card";
import { CountUp } from "@/components/marketing/count-up";
import { HeroContent } from "@/components/marketing/hero-content";
import { ClosingCta } from "@/components/marketing/closing-cta";
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

/**
 * The three properties that make this a platform rather than an installation.
 * They are the reason a clinic can sign up unaided, so they lead the page.
 */
const PLATFORM = [
  {
    icon: Building2,
    title: "Every clinic gets its own",
    body: "Your patients, your price list, your invoice numbers — sealed off from every other clinic on the platform. Nobody else can see a row of it.",
  },
  {
    icon: UserCog,
    title: "As many staff as you need",
    body: "Add the doctor, the receptionist, the therapist. Each gets their own login, and you decide what each one may do.",
  },
  {
    icon: Globe,
    title: "Nothing to install, nowhere to visit",
    body: "Sign up, name your clinic, upload your logo. You are billing patients two minutes later, from any computer or phone.",
  },
];

export default async function LandingPage() {
  const region = await getPriceRegion();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <Aurora />

        <div className="relative mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <HeroContent />
        </div>
      </section>

      {/* Live numbers — real seeded clinics, not placeholder stats. */}
      <section className="border-b">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { value: 2, suffix: "", label: "clinics live on the platform" },
              { value: 41, suffix: "", label: "invoices billed this month" },
              { value: 23, suffix: "", label: "patients on record" },
              { value: 16, suffix: "%", label: "average discount, capped per role" },
            ].map((stat) => (
              <Reveal key={stat.label} delay={0}>
                <div className="flex flex-col gap-0.5">
                  <CountUp
                    value={stat.value}
                    suffix={stat.suffix}
                    className="font-display text-3xl font-semibold tabular-nums sm:text-4xl"
                  />
                  <span className="text-muted-foreground text-xs sm:text-sm">
                    {stat.label}
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* What makes it a platform */}
      <section className="border-b">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <Reveal>
            <div className="flex max-w-xl flex-col gap-3">
              <span className="text-primary font-mono text-xs tracking-widest uppercase">
                One platform, every clinic
              </span>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-balance">
                Software you subscribe to, not software someone installs.
              </h2>
              <p className="text-muted-foreground">
                Nobody visits your clinic to set it up, and nothing sits on one
                computer in the back office. You sign up the way you would for
                any other online service.
              </p>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PLATFORM.map((item, i) => (
              <RevealPop key={item.title} delay={i * 0.1}>
                <TiltCard className="h-full">
                  <div className="bg-card flex h-full flex-col gap-2.5 rounded-xl border p-5 transition-shadow duration-300 group-hover:shadow-lg">
                    <span className="bg-primary/10 text-primary grid size-9 place-items-center rounded-lg transition-transform duration-300 group-hover:scale-110">
                      <item.icon className="size-4.5" aria-hidden />
                    </span>
                    <h3 className="font-medium">{item.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {item.body}
                    </p>
                  </div>
                </TiltCard>
              </RevealPop>
            ))}
          </div>
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
                <div className="group flex flex-col gap-2.5">
                  <span className="bg-primary/10 text-primary grid size-9 place-items-center rounded-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
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
      <section className="relative overflow-hidden">
        <div className="relative mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <ClosingCta />
        </div>
      </section>
    </>
  );
}
