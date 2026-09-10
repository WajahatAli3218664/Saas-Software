"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Circle } from "lucide-react";
import type { SetupProgress } from "@/lib/queries";

interface Step {
  done: boolean;
  title: string;
  body: string;
  href: string;
  cta: string;
}

/**
 * A getting-started checklist for a clinic that has just signed up. It hides
 * itself once every step is done, so an established clinic never sees it —
 * which is also why it is worth being direct about what is still missing.
 */
export function SetupChecklist({
  progress,
  canManageClinic,
  canManageStaff,
}: {
  progress: SetupProgress;
  canManageClinic: boolean;
  canManageStaff: boolean;
}) {
  const [open, setOpen] = useState(true);

  const all: Array<Step & { show: boolean }> = [
    {
      show: canManageClinic,
      done: progress.hasContactDetails,
      title: "Add your clinic's phone and address",
      body: "These print at the top of every invoice you give a patient.",
      href: "/settings",
      cta: "Open clinic settings",
    },
    {
      show: canManageClinic,
      done: progress.hasLogo,
      title: "Upload your logo",
      body: "It appears on invoices and receipts.",
      href: "/settings",
      cta: "Upload a logo",
    },
    {
      show: true,
      done: progress.hasOwnServices,
      title: "Set your own prices",
      body: "We started you off with a sample price list. Edit it so it matches what your clinic actually charges.",
      href: "/services",
      cta: "Open the price list",
    },
    {
      show: canManageStaff,
      done: progress.hasStaff,
      title: "Invite your staff",
      body: "Each person gets their own login, and you choose what they may do.",
      href: "/settings/staff",
      cta: "Invite someone",
    },
    {
      show: true,
      done: progress.hasPatient,
      title: "Add your first patient",
      body: "Or add one while you are making an invoice.",
      href: "/patients",
      cta: "Add a patient",
    },
    {
      show: true,
      done: progress.hasInvoice,
      title: "Make your first invoice",
      body: "Pick the services, take the payment, and print it.",
      href: "/billing/new",
      cta: "New invoice",
    },
  ];

  const steps = all.filter((s) => s.show);
  const done = steps.filter((s) => s.done).length;

  // Nothing left to nudge about — an established clinic should not carry a
  // permanent checklist on its dashboard.
  if (done === steps.length) return null;

  const pct = Math.round((done / steps.length) * 100);
  const next = steps.find((s) => !s.done);

  return (
    <section
      aria-label="Getting started"
      className="bg-card overflow-hidden rounded-lg border"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="hover:bg-muted/40 flex w-full items-center gap-3 p-4 text-left transition"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            Finish setting up your clinic
            <span className="text-muted-foreground ml-2 font-normal">
              {done} of {steps.length} done
            </span>
          </p>
          {!open && next && (
            <p className="text-muted-foreground mt-0.5 truncate text-xs">
              Next: {next.title}
            </p>
          )}
          <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(pct, 3)}%` }}
            />
          </div>
        </div>
        <ChevronDown
          className={`text-muted-foreground size-4 shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {open && (
        <ul className="flex flex-col border-t">
          {steps.map((step) => (
            <li
              key={step.title}
              className="flex flex-wrap items-center gap-3 border-b p-4 last:border-b-0"
            >
              {step.done ? (
                <span className="bg-primary text-primary-foreground grid size-5 shrink-0 place-items-center rounded-full">
                  <Check className="size-3" aria-hidden />
                </span>
              ) : (
                <Circle
                  className="text-muted-foreground/40 size-5 shrink-0"
                  aria-hidden
                />
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm ${
                    step.done
                      ? "text-muted-foreground line-through"
                      : "font-medium"
                  }`}
                >
                  {step.title}
                </p>
                {!step.done && (
                  <p className="text-muted-foreground text-xs">{step.body}</p>
                )}
              </div>
              {!step.done && (
                <Link
                  href={step.href}
                  className="text-primary shrink-0 text-sm font-medium hover:underline"
                >
                  {step.cta}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
