"use client";

import { useEffect, useRef } from "react";

/**
 * Ambient light behind the hero — two slow-drifting teal blooms on a canvas.
 *
 * Canvas rather than blurred divs: a 60px CSS blur on two large elements
 * repaints the whole layer on every scroll frame, while this draws a handful
 * of radial gradients into a small buffer the compositor then scales up.
 */
export function Aurora() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // The buffer is deliberately tiny — the blobs are soft, so upscaling costs
    // nothing visually and saves most of the fill rate.
    const W = 240;
    const H = 160;
    canvas.width = W;
    canvas.height = H;

    const isDark = () =>
      document.documentElement.classList.contains("dark") ||
      (!document.documentElement.classList.contains("light") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    const blobs = [
      { x: 0.28, y: 0.32, r: 0.42, hue: 178, drift: 0.00021, phase: 0 },
      { x: 0.72, y: 0.24, r: 0.36, hue: 192, drift: 0.00017, phase: 2.1 },
      { x: 0.52, y: 0.62, r: 0.3, hue: 165, drift: 0.00013, phase: 4.2 },
    ];

    let frame = 0;
    let running = true;

    function draw(time: number) {
      if (!running || !context) return;

      const dark = isDark();
      context.clearRect(0, 0, W, H);
      context.globalCompositeOperation = "lighter";

      for (const blob of blobs) {
        const t = reduced ? 0 : time * blob.drift + blob.phase;
        const cx = (blob.x + Math.cos(t) * 0.07) * W;
        const cy = (blob.y + Math.sin(t * 1.3) * 0.05) * H;
        const radius = blob.r * W;

        const gradient = context.createRadialGradient(
          cx,
          cy,
          0,
          cx,
          cy,
          radius,
        );
        // Dark grounds take a brighter, more saturated bloom; on white the
        // same values would read as a smear.
        const inner = dark
          ? `hsla(${blob.hue}, 78%, 52%, 0.30)`
          : `hsla(${blob.hue}, 70%, 55%, 0.16)`;
        const mid = dark
          ? `hsla(${blob.hue}, 78%, 48%, 0.10)`
          : `hsla(${blob.hue}, 70%, 58%, 0.05)`;

        gradient.addColorStop(0, inner);
        gradient.addColorStop(0.5, mid);
        gradient.addColorStop(1, "hsla(0, 0%, 0%, 0)");

        context.fillStyle = gradient;
        context.fillRect(0, 0, W, H);
      }

      context.globalCompositeOperation = "source-over";

      // A still frame is enough when motion is not wanted; the paint still
      // has to happen once, and again if the theme changes.
      if (!reduced) frame = requestAnimationFrame(draw);
    }

    frame = requestAnimationFrame(draw);

    // Repaint on theme change so the bloom matches the ground it sits on.
    const observer = new MutationObserver(() => {
      if (reduced) requestAnimationFrame(draw);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full opacity-90"
        style={{ filter: "blur(28px)" }}
      />
      {/* Fades the bloom into the section below so it has no hard edge. */}
      <div className="from-background/0 via-background/40 to-background absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b" />
    </div>
  );
}
