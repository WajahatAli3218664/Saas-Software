"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * The hero's centrepiece: an actual invoice, rendered as a floating 3D card
 * that turns to face the visitor and tracks the cursor. WebGL (three.js) is
 * loaded only here — nowhere else on the site pays for it — and the printed
 * face deliberately echoes the real in-app receipt (perforated edge, dashed
 * rules, the total in the accent colour) rather than inventing a separate
 * look, so the "wow" moment is the product itself, not a generic 3D prop.
 *
 * Card body + printed face are two meshes rather than one textured box:
 * RoundedBoxGeometry's UVs don't map cleanly onto a single flat face once
 * the corners are rounded, so the texture goes on a plain PlaneGeometry
 * sitting a hair in front of the rounded body, which supplies the card's
 * thickness and edge.
 */
export function InvoiceScene({
  onUnsupported,
}: {
  onUnsupported?: () => void;
}) {
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

      // ---- Theme colors, resolved via the DOM so oklch() tokens come back
      // as rgb() strings three.js's Color parser actually understands. ----
      function resolveVar(name: string): string {
        const probe = document.createElement("span");
        probe.style.color = `var(${name})`;
        document.body.appendChild(probe);
        const rgb = getComputedStyle(probe).color;
        probe.remove();
        return rgb || "rgb(128,128,128)";
      }

      const palette = () => ({
        card: resolveVar("--card"),
        border: resolveVar("--border"),
        muted: resolveVar("--muted"),
        primary: resolveVar("--primary"),
        foreground: resolveVar("--foreground"),
        mutedForeground: resolveVar("--muted-foreground"),
        success: resolveVar("--success"),
        background: resolveVar("--background"),
      });

      function fontFamily(varName: string, fallback: string): string {
        const value = getComputedStyle(document.documentElement)
          .getPropertyValue(varName)
          .trim();
        return value || fallback;
      }

      // ---- Scene ----
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
      camera.position.set(0, 0, 6.4);

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      container.appendChild(renderer.domElement);

      const ambient = new THREE.AmbientLight(0xffffff, 0.65);
      const key = new THREE.DirectionalLight(0xffffff, 1.05);
      key.position.set(2.5, 3, 4);
      const rim = new THREE.DirectionalLight(0x2dd4bf, 0.55);
      rim.position.set(-3, -1.5, -2);
      scene.add(ambient, key, rim);

      const CARD_W = 2.35;
      const CARD_H = 3.35;
      const CARD_D = 0.09;

      const cardGroup = new THREE.Group();
      scene.add(cardGroup);

      // Two faded cards stacked behind — the "many invoices, many clinics"
      // detail — plus the main card up front.
      const backMaterial = new THREE.MeshStandardMaterial({
        roughness: 0.85,
        metalness: 0,
        transparent: true,
      });
      const stackOffsets = [
        { z: -0.16, y: -0.14, rot: 0.09, opacity: 0.28 },
        { z: -0.08, y: -0.07, rot: 0.045, opacity: 0.45 },
      ];
      for (const offset of stackOffsets) {
        const mesh = new THREE.Mesh(
          new RoundedBoxGeometry(CARD_W, CARD_H, CARD_D, 3, 0.14),
          backMaterial.clone(),
        );
        mesh.position.set(0, offset.y, offset.z);
        mesh.rotation.z = offset.rot;
        (mesh.material as InstanceType<typeof THREE.MeshStandardMaterial>).opacity =
          offset.opacity;
        cardGroup.add(mesh);
      }

      const bodyMaterial = new THREE.MeshStandardMaterial({
        roughness: 0.55,
        metalness: 0.05,
      });
      const body = new THREE.Mesh(
        new RoundedBoxGeometry(CARD_W, CARD_H, CARD_D, 4, 0.14),
        bodyMaterial,
      );
      cardGroup.add(body);

      // The printed face — a canvas texture on a plane just proud of the
      // body, echoing the in-app receipt: perforated top edge, dashed
      // rules, the total set large in the accent colour.
      const TEX_W = 680;
      const TEX_H = 970;
      const canvas = document.createElement("canvas");
      canvas.width = TEX_W;
      canvas.height = TEX_H;
      const ctx = canvas.getContext("2d")!;

      function drawFace() {
        const c = palette();
        const displayFont = fontFamily("--font-display", "Georgia, serif");
        const monoFont = fontFamily(
          "--font-geist-mono",
          "ui-monospace, monospace",
        );
        const sansFont = fontFamily("--font-sans", "system-ui, sans-serif");

        ctx.clearRect(0, 0, TEX_W, TEX_H);
        ctx.fillStyle = c.card;
        roundRect(ctx, 0, 0, TEX_W, TEX_H, 26);
        ctx.fill();

        // Perforated edge, mirroring PerforationEdge in the real invoice.
        ctx.fillStyle = c.background;
        const dotY = 34;
        const dotR = 9;
        const gap = 24;
        const count = Math.floor(TEX_W / gap);
        const startX = (TEX_W - (count - 1) * gap) / 2;
        for (let i = 0; i < count; i++) {
          ctx.beginPath();
          ctx.arc(startX + i * gap, dotY, dotR, 0, Math.PI * 2);
          ctx.fill();
        }

        let y = 96;

        // Meta row.
        ctx.fillStyle = c.mutedForeground;
        ctx.font = `600 20px ${monoFont}`;
        ctx.textBaseline = "alphabetic";
        ctx.fillText("INV-000318", 40, y);
        ctx.textAlign = "right";
        ctx.fillText("Ayesha K.", TEX_W - 40, y);
        ctx.textAlign = "left";

        y += 34;
        dashedLine(ctx, 40, y, TEX_W - 40, c.border);
        y += 56;

        // Line item 1.
        ctx.fillStyle = c.foreground;
        ctx.font = `600 26px ${sansFont}`;
        ctx.fillText("HydraFacial", 40, y);
        ctx.font = `600 26px ${monoFont}`;
        ctx.textAlign = "right";
        ctx.fillText("12,000", TEX_W - 40, y);
        ctx.textAlign = "left";
        y += 34;
        ctx.fillStyle = c.mutedForeground;
        ctx.font = `20px ${monoFont}`;
        ctx.fillText("1 × 12,000", 40, y);

        y += 58;

        // Line item 2, with a discount pill.
        ctx.fillStyle = c.foreground;
        ctx.font = `600 26px ${sansFont}`;
        ctx.fillText("Botox — Forehead", 40, y);
        ctx.font = `600 26px ${monoFont}`;
        ctx.textAlign = "right";
        ctx.fillText("22,500", TEX_W - 40, y);
        ctx.textAlign = "left";
        y += 34;
        ctx.fillStyle = c.success;
        ctx.font = `20px ${monoFont}`;
        ctx.fillText("1 × 25,000 · −10% off", 40, y);

        y += 60;
        dashedLine(ctx, 40, y, TEX_W - 40, c.border);
        y += 40;

        ctx.fillStyle = c.mutedForeground;
        ctx.font = `22px ${monoFont}`;
        ctx.fillText("Subtotal", 40, y);
        ctx.textAlign = "right";
        ctx.fillText("34,500", TEX_W - 40, y);
        ctx.textAlign = "left";

        y += 52;
        ctx.strokeStyle = c.primary;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 4;
        ctx.setLineDash([2, 14]);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(TEX_W - 40, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;

        y += 68;
        ctx.fillStyle = c.foreground;
        ctx.font = `600 30px ${displayFont}`;
        ctx.fillText("Total", 40, y);
        ctx.fillStyle = c.primary;
        ctx.font = `700 52px ${displayFont}`;
        ctx.textAlign = "right";
        ctx.fillText("Rs 34,500", TEX_W - 40, y + 4);
        ctx.textAlign = "left";

        // Footer.
        ctx.fillStyle = c.mutedForeground;
        ctx.font = `600 18px ${monoFont}`;
        ctx.textAlign = "center";
        ctx.globalAlpha = 0.7;
        ctx.letterSpacing = "3px";
        ctx.fillText("THANK YOU", TEX_W / 2, TEX_H - 48);
        ctx.letterSpacing = "0px";
        ctx.globalAlpha = 1;
        ctx.textAlign = "left";

        texture.needsUpdate = true;
      }

      function roundRect(
        context: CanvasRenderingContext2D,
        x: number,
        yPos: number,
        w: number,
        h: number,
        r: number,
      ) {
        context.beginPath();
        context.moveTo(x + r, yPos);
        context.arcTo(x + w, yPos, x + w, yPos + h, r);
        context.arcTo(x + w, yPos + h, x, yPos + h, r);
        context.arcTo(x, yPos + h, x, yPos, r);
        context.arcTo(x, yPos, x + w, yPos, r);
        context.closePath();
      }

      function dashedLine(
        context: CanvasRenderingContext2D,
        x1: number,
        yPos: number,
        x2: number,
        color: string,
      ) {
        context.strokeStyle = color;
        context.lineWidth = 2;
        context.setLineDash([6, 8]);
        context.beginPath();
        context.moveTo(x1, yPos);
        context.lineTo(x2, yPos);
        context.stroke();
        context.setLineDash([]);
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      drawFace();

      const faceMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.4,
        metalness: 0,
      });
      // Keeps the texture's own aspect ratio rather than the card body's,
      // so the printed content is never stretched.
      const faceWidth = CARD_W * 0.94;
      const faceHeight = faceWidth * (TEX_H / TEX_W);
      const face = new THREE.Mesh(
        new THREE.PlaneGeometry(faceWidth, faceHeight),
        faceMaterial,
      );
      face.position.z = CARD_D / 2 + 0.004;
      cardGroup.add(face);

      // Soft grounding shadow beneath the card.
      const shadowCanvas = document.createElement("canvas");
      shadowCanvas.width = 256;
      shadowCanvas.height = 256;
      const shadowCtx = shadowCanvas.getContext("2d")!;
      const gradient = shadowCtx.createRadialGradient(
        128,
        128,
        0,
        128,
        128,
        128,
      );
      gradient.addColorStop(0, "rgba(0,0,0,0.35)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      shadowCtx.fillStyle = gradient;
      shadowCtx.fillRect(0, 0, 256, 256);
      const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
      const shadowMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(3.2, 3.2),
        new THREE.MeshBasicMaterial({
          map: shadowTexture,
          transparent: true,
          depthWrite: false,
        }),
      );
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.y = -CARD_H / 2 - 0.75;
      scene.add(shadowMesh);

      // ---- Sizing ----
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

      // ---- Motion ----
      const REST_ROTATION = { x: -0.16, y: -0.08 };
      const current = { x: -0.55, y: -1.05 }; // starts turned away — "unfurls" to face the visitor
      const target = { x: REST_ROTATION.x, y: REST_ROTATION.y };
      const pointerFine = window.matchMedia(
        "(pointer: fine) and (hover: hover)",
      ).matches;

      function onPointerMove(event: PointerEvent) {
        const rect = container!.getBoundingClientRect();
        const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
        target.y = REST_ROTATION.y + nx * 0.42;
        target.x = REST_ROTATION.x - ny * 0.22;
      }
      function onPointerLeave() {
        target.x = REST_ROTATION.x;
        target.y = REST_ROTATION.y;
      }
      if (pointerFine && !reducedMotion) {
        container.addEventListener("pointermove", onPointerMove);
        container.addEventListener("pointerleave", onPointerLeave);
      }

      let frame = 0;
      const start = performance.now();

      function draw(time: number) {
        const t = (time - start) / 1000;

        if (!reducedMotion) {
          // Idle sway layered on top of the resting/pointer target.
          const idleY = Math.sin(t * 0.55) * 0.05;
          const idleBob = Math.sin(t * 0.8) * 0.06;
          current.x += (target.x - current.x) * 0.055;
          current.y += (target.y + idleY - current.y) * 0.055;
          cardGroup.rotation.x = current.x;
          cardGroup.rotation.y = current.y;
          cardGroup.position.y = idleBob;
          shadowMesh.material.opacity =
            0.5 - Math.abs(cardGroup.rotation.y) * 0.25;
        } else {
          cardGroup.rotation.x = REST_ROTATION.x;
          cardGroup.rotation.y = REST_ROTATION.y;
        }

        renderer.render(scene, camera);
        if (!reducedMotion) frame = requestAnimationFrame(draw);
      }

      if (reducedMotion) {
        draw(start);
      } else {
        frame = requestAnimationFrame(draw);
      }

      // Redraw the texture (and re-tint the meshes) if the viewer flips
      // light/dark theme while the page is open.
      function applyPalette() {
        const c = palette();
        bodyMaterial.color.set(c.card);
        backMaterial.color.set(c.muted);
        drawFace();
      }
      applyPalette();
      const themeObserver = new MutationObserver(applyPalette);
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class", "data-theme"],
      });

      // Fonts load asynchronously; redraw once they're actually in so the
      // texture isn't stuck on the fallback metrics it started with.
      document.fonts?.ready?.then(() => {
        if (!disposed) drawFace();
      });

      cleanup = () => {
        cancelAnimationFrame(frame);
        resizeObserver.disconnect();
        themeObserver.disconnect();
        container!.removeEventListener("pointermove", onPointerMove);
        container!.removeEventListener("pointerleave", onPointerLeave);
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
        texture.dispose();
        shadowTexture.dispose();
        renderer.dispose();
        container!.removeChild(renderer.domElement);
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
    // Intentionally runs once — theme and reduced-motion changes are handled
    // by the observer and the initial read respectively, not by re-running
    // the whole WebGL setup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="mx-auto aspect-[2.35/3.35] w-full max-w-[19rem] sm:max-w-xs"
      aria-hidden
    />
  );
}
