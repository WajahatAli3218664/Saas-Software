"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Building2 } from "lucide-react";

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

function PlatformFallback() {
  return (
    <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
      {CLINICS.map((clinic) => (
        <div
          key={clinic.name}
          className="bg-card flex flex-col gap-2.5 rounded-xl border p-4"
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
            <ul className="flex flex-col gap-1.5">
              {clinic.services.map((service) => (
                <li
                  key={service}
                  className="bg-muted truncate rounded-full px-2.5 py-1 text-xs"
                >
                  {service}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground border-muted-foreground/40 rounded-full border border-dashed px-2.5 py-1 text-center text-xs">
              Price list starts empty
            </p>
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
