"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Syringe, Droplet, FlaskConical } from "lucide-react";

const PlatformScene = dynamic(
  () => import("./platform-scene").then((m) => m.PlatformScene),
  { ssr: false, loading: () => <PlatformFallback /> },
);

/** Stand-ins for the three modelled items, using the app's own
 *  service-category colours (Injectables, Skin Treatments, Laser &
 *  Devices) — same objects, no WebGL. */
const ITEMS = [
  { icon: Syringe, label: "Injectables", color: "#0d9488" },
  { icon: Droplet, label: "Skin treatments", color: "#6366f1" },
  { icon: FlaskConical, label: "Lasers & devices", color: "#d97706" },
];

function PlatformFallback() {
  return (
    <div className="flex w-full max-w-xl items-center justify-center gap-5 py-8">
      {ITEMS.map((item) => (
        <div key={item.label} className="flex flex-col items-center gap-3">
          <span
            className="grid size-20 place-items-center rounded-2xl shadow-lg"
            style={{
              background: `linear-gradient(160deg, ${item.color}, ${item.color}bb)`,
            }}
          >
            <item.icon className="size-9 text-white" aria-hidden />
          </span>
          <span className="text-muted-foreground text-xs">{item.label}</span>
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
