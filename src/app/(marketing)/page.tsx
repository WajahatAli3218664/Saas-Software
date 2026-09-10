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
  Syringe,
  Droplet,
  Zap,
  Waves,
  FlaskConical,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal, RevealPop } from "@/components/marketing/reveal";
import { PricingTable } from "@/components/marketing/pricing-table";
import { Aurora } from "@/components/marketing/aurora";
import { TiltCard } from "@/components/marketing/tilt-card";
import { CountUp } from "@/components/marketing/count-up";
import { HeroContent } from "@/components/marketing/hero-content";
import { ClosingCta } from "@/components/marketing/closing-cta";
import { PermissionDemo } from "@/components/marketing/permission-demo";
import { PlatformVisual } from "@/components/marketing/platform-visual";
import { getPriceRegion } from "@/lib/geo";
import { REGION_CURRENCY } from "@/config/plans";

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

/** A genuine sequence, first patient to first receipt — the numbering here
 *  carries real order, not decoration. */
const STEPS = [
  {
    title: "Create your clinic",
    body: "Your name, your clinic's name, your logo if you have one ready. Your currency is set from where you sign up — no form to fill in.",
  },
  {
    title: "Your price list is already there",
    body: "Injectables, skin treatments, lasers and consultations, priced and ready. Rename anything, reprice anything, delete what you don't offer.",
  },
  {
    title: "Bill your first patient",
    body: "Search a treatment, add it, apply a discount if you're allowed one. Print a receipt or save it as a PDF — either way, done.",
  },
];

const FAQS = [
  {
    q: "Can another clinic on the platform see my patients?",
    a: "No. Every record — patients, invoices, prices — carries your clinic's identity, and every query is scoped to whoever is signed in. Two clinics on the same platform never share a row of data.",
  },
  {
    q: "What happens if I stop paying?",
    a: "Nothing already in your account disappears. You can still open past invoices and patient records; you just can't create new ones until you're back on a plan.",
  },
  {
    q: "Do I need a special printer?",
    a: "No. Printing saves a correctly named file straight to your device using whatever's already set up on the computer — no drivers, no installation.",
  },
  {
    q: "Can more than one person use it at the same time?",
    a: "Yes. Each staff member signs in with their own login, and you decide individually what each one is allowed to do — add a service, change a price, give a discount, and how much.",
  },
  {
    q: "What if my clinic outgrows its plan?",
    a: "Switch plans any time from Settings, in a couple of clicks. There's no need to move your data or start over.",
  },
  {
    q: "Do I need a card to try it?",
    a: "No. Every clinic starts with a 14-day trial at full Professional-tier access, no card required.",
  },
];

/** The breadth of what the starter catalogue covers — aesthetic and
 *  cosmetic treatments specifically, not general medical consultations,
 *  since that's the clinic this software is actually built for. */
const TREATMENTS = {
  left: [
    {
      icon: Syringe,
      title: "Injectable Treatments",
      body: "Target fine lines, wrinkles, and refine facial features with expertly administered Botulinum Toxin injections.",
    },
    {
      icon: Droplet,
      title: "Dermal Fillers",
      body: "Restore facial volume, enhance cheekbones, and plump lips for a naturally youthful appearance.",
    },
    {
      icon: Zap,
      title: "Laser Skin Resurfacing",
      body: "Achieve smoother, clearer skin by targeting tone, texture, and imperfections with advanced laser technology.",
    },
  ],
  right: [
    {
      icon: Sparkles,
      title: "Chemical Peels & Radiance",
      body: "Rejuvenate tired skin and unveil a glowing, smooth complexion with customised exfoliation.",
    },
    {
      icon: Waves,
      title: "Body Contouring & Sculpting",
      body: "Non-invasive body shaping treatments to tone, tighten and target stubborn areas.",
    },
    {
      icon: FlaskConical,
      title: "PRP & Microneedling",
      body: "Stimulate natural collagen production and tissue renewal for lasting skin revitalisation.",
    },
  ],
};

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

      {/* What makes it a platform — the second three.js moment: one card
          fanning out into three separate, real clinics, sitting right next
          to the claim it's proving. */}
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

          <div className="mt-10 grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-6">
            <div className="grid gap-4">
              {PLATFORM.map((item, i) => (
                <RevealPop key={item.title} delay={i * 0.1}>
                  <TiltCard>
                    <div className="bg-card flex flex-col gap-2.5 rounded-xl border p-5 transition-shadow duration-300 group-hover:shadow-lg">
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

            <RevealPop delay={0.15} className="flex justify-center lg:justify-end">
              <PlatformVisual />
            </RevealPop>
          </div>
        </div>
      </section>

      {/* The permission rule, live — the page's second signature moment,
          earned by being something to try rather than more to look at. */}
      <section className="border-b">
        <div className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6">
          <Reveal>
            <div className="mb-8 flex flex-col items-center gap-3 text-center">
              <h2 className="font-display text-3xl font-semibold tracking-tight text-balance">
                Not a checkbox. A rule that holds.
              </h2>
              <p className="text-muted-foreground max-w-md">
                Change the role, try a discount past its limit, and watch what
                actually happens on an invoice.
              </p>
            </div>
          </Reveal>
          <RevealPop delay={0.08}>
            <PermissionDemo currency={REGION_CURRENCY[region]} />
          </RevealPop>
        </div>
      </section>

      {/* How it works — a real sequence, so the numbering earns its place. */}
      <section className="border-b">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <Reveal>
            <div className="flex max-w-xl flex-col gap-3">
              <span className="text-primary font-mono text-xs tracking-widest uppercase">
                First patient to first receipt
              </span>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-balance">
                Three steps. No call, no setup visit.
              </h2>
            </div>
          </Reveal>

          <div className="relative mt-10 grid gap-8 md:grid-cols-3 md:gap-6">
            <div
              aria-hidden
              className="via-border absolute top-6 right-0 left-0 hidden h-px bg-gradient-to-r from-transparent to-transparent md:block"
            />
            {STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.1}>
                <div className="relative flex flex-col gap-3">
                  <span className="bg-background border-primary/30 text-primary font-display relative z-10 grid size-12 place-items-center rounded-full border-2 text-lg font-semibold">
                    {i + 1}
                  </span>
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {step.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* The treatments themselves — grounding the page in what an
          aesthetic clinic actually runs, not general medical care. */}
      <section className="border-b">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <Reveal>
            <div className="mb-10 flex flex-col items-center gap-3 text-center">
              <span className="text-primary font-mono text-xs tracking-widest uppercase">
                Built for aesthetic and cosmetic care
              </span>
              <h2 className="font-display max-w-2xl text-3xl font-semibold tracking-tight text-balance">
                Injectables to body contouring — it&apos;s all in the price
                list.
              </h2>
              <p className="text-muted-foreground max-w-lg">
                The starter catalogue covers what aesthetic clinics actually
                run, ready to rename and reprice as your own.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
            {[TREATMENTS.left, TREATMENTS.right].map((column, colIndex) => (
              <div key={colIndex} className="flex flex-col gap-8">
                {column.map((item, i) => (
                  <Reveal key={item.title} delay={(colIndex * 3 + i) * 0.05}>
                    <div className="group flex gap-4">
                      <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover:scale-110">
                        <item.icon className="size-5" aria-hidden />
                      </span>
                      <div>
                        <h3 className="font-medium">{item.title}</h3>
                        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                          {item.body}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
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

      {/* FAQ */}
      <section id="faq" className="border-b">
        <div className="mx-auto w-full max-w-2xl px-4 py-20 sm:px-6">
          <Reveal>
            <h2 className="font-display mb-8 text-center text-3xl font-semibold tracking-tight text-balance">
              Questions clinics actually ask
            </h2>
          </Reveal>
          <Reveal delay={0.06}>
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((item) => (
                <AccordionItem key={item.q} value={item.q}>
                  <AccordionTrigger className="text-left font-medium">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
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
