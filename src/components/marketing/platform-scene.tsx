"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { resolveCssColor, resolveCssFontFamily } from "@/lib/resolve-css-theme";

/**
 * The Platform section's proof, the way the hero proves billing: three
 * clinics — the platform's own real seeded demo clinics, not invented
 * numbers — floating apart from a single starting point. One piece of
 * software, three separate accounts that never see each other's row.
 *
 * Deliberately calmer than the hero: no shadow, no single dominant object,
 * three small things drifting independently — this section is making a
 * "many, separate, airy" point rather than the hero's "one document, real
 * weight" point, and the motion should read that difference at a glance.
 */
const CLINICS = [
  { name: "Glow Aesthetic Clinic", city: "Lahore", stat: "26 invoices this month" },
  { name: "Radiance Skin & Laser", city: "Karachi", stat: "15 invoices this month" },
  { name: "Serene Aesthetics", city: "Islamabad", stat: "Just signed up" },
];

const LAYOUT = [
  { x: -1.75, y: 0.16, z: 0.1, rotY: -0.22, rotZ: 0.03 },
  { x: 0, y: -0.12, z: 0.28, rotY: 0.03, rotZ: -0.015 },
  { x: 1.75, y: 0.1, z: -0.05, rotY: 0.24, rotZ: -0.03 },
];

export function PlatformScene({ onUnsupported }: { onUnsupported?: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      let THREE: typeof import("three");
      let RoundedBoxGeometry: typeof import("three/addons/geometries/RoundedBoxGeometry.js").RoundedBoxGeometry;
      try {
        [THREE, { RoundedBoxGeometry }] = await Promise.all([
          import("three"),
          import("three/addons/geometries/RoundedBoxGeometry.js"),
        ]);
      } catch {
        onUnsupported?.();
        return;
      }
      if (disposed) return;

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        });
        if (!renderer.getContext()) throw new Error("no webgl context");
      } catch {
        onUnsupported?.();
        return;
      }

      const palette = () => ({
        card: resolveCssColor("--card"),
        border: resolveCssColor("--border"),
        primary: resolveCssColor("--primary"),
        foreground: resolveCssColor("--foreground"),
        mutedForeground: resolveCssColor("--muted-foreground"),
      });

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
      camera.position.set(0, 0, 7.2);

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      container.appendChild(renderer.domElement);

      const ambient = new THREE.AmbientLight(0xffffff, 0.7);
      const key = new THREE.DirectionalLight(0xffffff, 1);
      key.position.set(2.5, 3, 4);
      const rim = new THREE.DirectionalLight(0x2dd4bf, 0.5);
      rim.position.set(-3, -1.5, -2);
      scene.add(ambient, key, rim);

      const CARD_W = 1.55;
      const CARD_H = 1.95;
      const CARD_D = 0.07;
      const TEX_W = 480;
      const TEX_H = 604;

      const bodyMaterial = new THREE.MeshStandardMaterial({
        roughness: 0.55,
        metalness: 0.04,
      });

      type CardMesh = {
        group: InstanceType<typeof THREE.Group>;
        canvas: HTMLCanvasElement;
        ctx: CanvasRenderingContext2D;
        texture: InstanceType<typeof THREE.CanvasTexture>;
        phase: number;
      };
      const cards: CardMesh[] = [];

      function roundRect(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        w: number,
        h: number,
        r: number,
      ) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
      }

      function drawCard(card: CardMesh, clinic: (typeof CLINICS)[number]) {
        const c = palette();
        const displayFont = resolveCssFontFamily("--font-display", "Georgia, serif");
        const monoFont = resolveCssFontFamily(
          "--font-geist-mono",
          "ui-monospace, monospace",
        );
        const sansFont = resolveCssFontFamily("--font-sans", "system-ui, sans-serif");

        const ctx = card.ctx;
        ctx.clearRect(0, 0, TEX_W, TEX_H);
        ctx.fillStyle = c.card;
        roundRect(ctx, 0, 0, TEX_W, TEX_H, 20);
        ctx.fill();

        // Small accent dot, like a status marker.
        ctx.fillStyle = c.primary;
        ctx.beginPath();
        ctx.arc(44, 52, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = c.mutedForeground;
        ctx.font = `600 16px ${monoFont}`;
        ctx.textAlign = "left";
        ctx.fillText(clinic.city.toUpperCase(), 62, 58);

        ctx.fillStyle = c.foreground;
        ctx.font = `700 30px ${displayFont}`;
        wrapText(ctx, clinic.name, 40, 130, TEX_W - 80, 36);

        ctx.strokeStyle = c.border;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 7]);
        ctx.beginPath();
        ctx.moveTo(40, TEX_H - 100);
        ctx.lineTo(TEX_W - 40, TEX_H - 100);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = c.primary;
        ctx.font = `600 22px ${sansFont}`;
        ctx.fillText(clinic.stat, 40, TEX_H - 56);

        card.texture.needsUpdate = true;
      }

      function wrapText(
        ctx: CanvasRenderingContext2D,
        text: string,
        x: number,
        y: number,
        maxWidth: number,
        lineHeight: number,
      ) {
        const words = text.split(" ");
        let line = "";
        let cy = y;
        for (const word of words) {
          const test = line ? `${line} ${word}` : word;
          if (ctx.measureText(test).width > maxWidth && line) {
            ctx.fillText(line, x, cy);
            line = word;
            cy += lineHeight;
          } else {
            line = test;
          }
        }
        ctx.fillText(line, x, cy);
      }

      CLINICS.forEach((clinic, i) => {
        const group = new THREE.Group();

        const body = new THREE.Mesh(
          new RoundedBoxGeometry(CARD_W, CARD_H, CARD_D, 3, 0.1),
          bodyMaterial.clone(),
        );
        group.add(body);

        const canvas = document.createElement("canvas");
        canvas.width = TEX_W;
        canvas.height = TEX_H;
        const ctx = canvas.getContext("2d")!;
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;

        const faceMaterial = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.45,
        });
        const faceW = CARD_W * 0.94;
        const faceH = faceW * (TEX_H / TEX_W);
        const face = new THREE.Mesh(
          new THREE.PlaneGeometry(faceW, faceH),
          faceMaterial,
        );
        face.position.z = CARD_D / 2 + 0.004;
        group.add(face);

        // Start stacked near the centre, as if one card about to split into
        // three — the group's own lerp-toward-target unfurls it outward.
        group.position.set(0, 0, 0.3 - i * 0.02);
        group.rotation.set(0, 0, 0);

        scene.add(group);
        const cardMesh: CardMesh = { group, canvas, ctx, texture, phase: i * 2.1 };
        drawCard(cardMesh, clinic);
        cards.push(cardMesh);
      });

      function resize() {
        const rect = container!.getBoundingClientRect();
        const w = Math.max(rect.width, 1);
        const h = Math.max(rect.height, 1);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
      resize();
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);

      const pointerFine = window.matchMedia(
        "(pointer: fine) and (hover: hover)",
      ).matches;
      const pointerTarget = { x: 0, y: 0 };
      function onPointerMove(event: PointerEvent) {
        const rect = container!.getBoundingClientRect();
        pointerTarget.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointerTarget.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      }
      if (pointerFine && !reducedMotion) {
        container.addEventListener("pointermove", onPointerMove);
      }
      const pointerCurrent = { x: 0, y: 0 };

      let frame = 0;
      const start = performance.now();

      function draw(time: number) {
        const t = (time - start) / 1000;
        // Eases every card from its stacked start toward its fanned-out
        // resting spot — a single continuous lerp per frame settles
        // naturally rather than needing separate easing keyframes.
        const progress = reducedMotion ? 1 : Math.min(t / 1.1, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        pointerCurrent.x += (pointerTarget.x - pointerCurrent.x) * 0.05;
        pointerCurrent.y += (pointerTarget.y - pointerCurrent.y) * 0.05;

        cards.forEach((card, i) => {
          const target = LAYOUT[i];
          const idleY = reducedMotion
            ? 0
            : Math.sin(t * 0.7 + card.phase) * 0.05;
          const idleRot = reducedMotion
            ? 0
            : Math.sin(t * 0.5 + card.phase) * 0.04;

          card.group.position.x = target.x * eased + pointerCurrent.x * 0.15;
          card.group.position.y = target.y * eased + idleY + pointerCurrent.y * -0.08;
          card.group.position.z = target.z * eased;
          card.group.rotation.y = target.rotY * eased + idleRot;
          card.group.rotation.z = target.rotZ * eased;
        });

        renderer.render(scene, camera);
        if (!reducedMotion || progress < 1) frame = requestAnimationFrame(draw);
      }
      frame = requestAnimationFrame(draw);

      function applyPalette() {
        const c = palette();
        cards.forEach((card, i) => {
          const body = card.group.children[0] as InstanceType<typeof THREE.Mesh>;
          const material = body.material as InstanceType<
            typeof THREE.MeshStandardMaterial
          >;
          material.color.set(c.card);
          drawCard(card, CLINICS[i]);
        });
      }
      const themeObserver = new MutationObserver(applyPalette);
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class", "data-theme"],
      });

      document.fonts?.ready?.then(() => {
        if (!disposed) cards.forEach((card, i) => drawCard(card, CLINICS[i]));
      });

      cleanup = () => {
        cancelAnimationFrame(frame);
        resizeObserver.disconnect();
        themeObserver.disconnect();
        container!.removeEventListener("pointermove", onPointerMove);
        scene.traverse((obj) => {
          const mesh = obj as InstanceType<typeof THREE.Mesh>;
          if (mesh.geometry) mesh.geometry.dispose();
          const material = (mesh as { material?: unknown }).material;
          if (Array.isArray(material)) {
            material.forEach((m) => (m as { dispose?: () => void }).dispose?.());
          } else if (material) {
            (material as { dispose?: () => void }).dispose?.();
          }
        });
        cards.forEach((card) => card.texture.dispose());
        renderer.dispose();
        container!.removeChild(renderer.domElement);
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="aspect-[4/3] w-full max-w-xl"
      aria-hidden
    />
  );
}
