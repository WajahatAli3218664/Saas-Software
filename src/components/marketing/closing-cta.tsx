"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RevealPop } from "@/components/marketing/reveal";

export function ClosingCta() {
  return (
    <RevealPop>
      <div className="border-primary/20 from-primary/10 relative flex flex-col items-center gap-5 overflow-hidden rounded-2xl border bg-gradient-to-b to-transparent px-6 py-14 text-center">
        <motion.div
          aria-hidden
          className="bg-primary/12 absolute -top-24 left-1/2 size-64 -translate-x-1/2 rounded-full blur-3xl"
          animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <h2 className="font-display relative max-w-xl text-3xl font-semibold tracking-tight text-balance">
          Try it on tomorrow&apos;s appointments.
        </h2>
        <p className="text-muted-foreground relative max-w-md">
          Set up your clinic, add your price list, and bill a real patient —
          all before the trial asks you for anything.
        </p>
        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
          <Button asChild size="lg" className="group relative">
            <Link href="/sign-up">
              Start free
              <ArrowRight
                className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </Button>
        </motion.div>
      </div>
    </RevealPop>
  );
}
