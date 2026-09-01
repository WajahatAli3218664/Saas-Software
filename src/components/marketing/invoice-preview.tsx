"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

const ROWS = [
  { name: "HydraFacial", discount: null, qty: 1, price: "12,000", total: "12,000" },
  { name: "Botox — Forehead", discount: "10% off", qty: 1, price: "25,000", total: "22,500" },
];

/**
 * The product glimpse in the hero. Rows fill in one after another rather than
 * appearing all at once — a small, deliberate signal that this is a working
 * screen rather than a static screenshot, without needing real interactivity.
 */
export function InvoicePreview() {
  const reduced = useReducedMotion();

  const container: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: reduced ? 0 : 0.18, delayChildren: 0.15 },
    },
  };
  const row: Variants = {
    hidden: { opacity: 0, y: 8 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <div className="bg-card/90 overflow-hidden rounded-xl border shadow-lg backdrop-blur-sm">
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
              <th className="px-4 py-2 text-left font-medium">Treatment</th>
              <th className="px-4 py-2 text-right font-medium">Qty</th>
              <th className="px-4 py-2 text-right font-medium">Price</th>
              <th className="px-4 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <motion.tbody
            className="tabular-nums"
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-40px" }}
          >
            {ROWS.map((r) => (
              <motion.tr key={r.name} variants={row} className="border-b">
                <td className="px-4 py-2.5">
                  {r.name}
                  {r.discount && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.85 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.55, duration: 0.25 }}
                      className="text-success ml-2 inline-block text-xs"
                    >
                      {r.discount}
                    </motion.span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">{r.qty}</td>
                <td className="px-4 py-2.5 text-right">{r.price}</td>
                <td className="px-4 py-2.5 text-right">{r.total}</td>
              </motion.tr>
            ))}
            <motion.tr variants={row}>
              <td className="text-muted-foreground px-4 py-2.5" colSpan={3}>
                Total due
              </td>
              <td className="px-4 py-2.5 text-right font-semibold">34,500</td>
            </motion.tr>
          </motion.tbody>
        </table>
      </div>
    </div>
  );
}
