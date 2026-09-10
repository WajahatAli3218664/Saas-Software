"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvoicePreview } from "@/components/marketing/invoice-preview";
import { TypewriterHeadline } from "@/components/marketing/typewriter-headline";

// WebGL only loads for whoever actually sees the hero, and never on the
// server — three.js has no business in the initial HTML or in any other
// route's bundle. InvoicePreview (the flat 2D card) doubles as both the
// loading placeholder and the fallback if WebGL genuinely isn't available.
const InvoiceScene = dynamic(
  () => import("./invoice-scene").then((m) => m.InvoiceScene),
  { ssr: false, loading: () => <InvoicePreview /> },
);

/**
 * The hero's text and product glimpse, as one client component so the
 * load-in sequence — badge, headline typing out, copy, buttons, then the
 * invoice — reads as a single orchestrated arrival rather than several
 * unrelated fades. Framer Motion components cannot render from the Server
 * Component that owns the page, hence this boundary.
 */
export function HeroContent() {
  const [webglOk, setWebglOk] = useState(true);

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
      <div className="flex max-w-2xl flex-col gap-6">
        <motion.span
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="border-primary/25 bg-primary/8 text-primary inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-sm"
        >
          <span className="bg-primary relative size-1.5 rounded-full">
            <span className="bg-primary absolute inset-0 animate-ping rounded-full" />
          </span>
          Built for aesthetic clinics
        </motion.span>

        <TypewriterHeadline
          text="Run the whole clinic from the front desk."
          delay={0.35}
          className="font-display text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl"
        />

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.35, ease: [0.22, 1, 0.36, 1] }}
          className="text-muted-foreground max-w-xl text-lg"
        >
          Appointments, treatment records, invoicing and printing — in one
          place, on any device, for a monthly fee instead of a lump sum.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-wrap items-center gap-3"
        >
          <Button asChild size="lg" className="group">
            <Link href="/sign-up">
              Start your 14-day trial
              <ArrowRight
                className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link href="/pricing">See pricing</Link>
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.65 }}
          className="text-muted-foreground text-sm"
        >
          No card to start. Set up your clinic in about two minutes.
        </motion.p>
      </div>

      {/* Product glimpse — a real invoice, floating in 3D and turning to
          face whoever scrolls in. Falls back to a flat card wherever WebGL
          isn't available. */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto w-full max-w-sm lg:mx-0"
      >
        {webglOk ? (
          <InvoiceScene onUnsupported={() => setWebglOk(false)} />
        ) : (
          <InvoicePreview />
        )}
      </motion.div>
    </div>
  );
}
