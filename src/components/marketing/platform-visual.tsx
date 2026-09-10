"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Building2, Syringe, Zap, Droplet, FlaskConical } from "lucide-react";

const PlatformScene = dynamic(
  () => import("./platform-scene").then((m) => m.PlatformScene),
  { ssr: false, loading: () => <PlatformFallback /> },
);

// Kept in sync with platform-scene.tsx's own list by hand — three items,
// not worth an import that would pull the whole (code-split) 3D module in
// just to share a literal.
const CLINICS = [
  {
    name: "Glow Aesthetic Clinic",
    city: "Lahore",
    stat: "26 invoices this month",
    services: ["Dermal Filler — Cheeks", "Botox — Forehead", "HydraFacial"],
  },
  {
    name: "Radiance Skin & Laser",
    city: "Karachi",
    stat: "15 invoices this month",
    services: [
      "Laser Hair Removal — Full Body",
      "Dermal Filler — Cheeks",
      "Botox — Forehead",
    ],
  },
  {
    name: "Serene Aesthetics",
    city: "Islamabad",
    stat: "Just signed up",
    services: [],
  },
];

/** The app's own real service-category colours — Injectables, Skin
 *  Treatments, Laser & Devices — cycled by position so three tiles are
 *  never the same colour even when two treatments share a category. */
const TILE_COLORS = ["#0d9488", "#6366f1", "#d97706"];

function iconFor(service: string) {
  const s = service.toLowerCase();
  if (s.includes("botox") || s.includes("filler")) return Syringe;
  if (s.includes("laser")) return Zap;
  if (s.includes("facial") || s.includes("hydra") || s.includes("peel"))
    return Droplet;
  return FlaskConical;
}

function PlatformFallback() {
  return (
    <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
      {CLINICS.map((clinic) => (
        <div
          key={clinic.name}
          className="bg-card flex flex-col gap-3 rounded-xl border p-4"
        >
          <span className="bg-primary/10 text-primary grid size-7 place-items-center rounded-md">
            <Building2 className="size-3.5" aria-hidden />
          </span>
          <div>
            <p className="text-muted-foreground font-mono text-[0.65rem] tracking-wide uppercase">
              {clinic.city}
            </p>
            <p className="font-display text-sm leading-tight font-semibold">
              {clinic.name}
            </p>
          </div>

          {clinic.services.length > 0 ? (
            <>
              <div className="flex justify-center gap-2.5 py-1">
                {clinic.services.map((service, i) => {
                  const Icon = iconFor(service);
                  return (
                    <span
                      key={service}
                      className="grid size-9 place-items-center rounded-lg shadow-sm"
                      style={{
                        background: `linear-gradient(180deg, ${TILE_COLORS[i % 3]}, ${TILE_COLORS[i % 3]}dd)`,
                      }}
                    >
                      <Icon className="size-4 text-white" aria-hidden />
                    </span>
                  );
                })}
              </div>
              <p className="text-muted-foreground text-center font-mono text-[0.65rem]">
                {clinic.services.length} treatments on the price list
              </p>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-2">
              <span className="border-muted-foreground/40 size-9 rounded-lg border-2 border-dashed" />
              <p className="text-muted-foreground text-center text-[0.65rem]">
                Price list starts empty
              </p>
            </div>
          )}

          <p className="text-primary mt-auto pt-1 text-xs font-medium">
            {clinic.stat}
          </p>
        </div>
      ))}
    </div>
  );
}

export function PlatformVisual() {
  const [webglOk, setWebglOk] = useState(true);
  return webglOk ? (
    <PlatformScene onUnsupported={() => setWebglOk(false)} />
  ) : (
    <PlatformFallback />
  );
}
