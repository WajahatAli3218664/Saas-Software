"use client";

import { useRef, type PointerEvent } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

/**
 * A card that leans very slightly toward the cursor and lifts a hair on
 * hover — enough to feel alive, restrained enough that a grid of them
 * doesn't turn into a fairground. Pointer-only: touch never fires the
 * pointermove that drives the tilt, so there is nothing to disable there.
 */
export function TiltCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  const springConfig = { stiffness: 220, damping: 22, mass: 0.4 };
  const rotateX = useSpring(
    useTransform(y, [0, 1], [4, -4]),
    springConfig,
  );
  const rotateY = useSpring(
    useTransform(x, [0, 1], [-5, 5]),
    springConfig,
  );
  const glowX = useTransform(x, (v) => `${v * 100}%`);
  const glowY = useTransform(y, (v) => `${v * 100}%`);

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((event.clientX - rect.left) / rect.width);
    y.set((event.clientY - rect.top) / rect.height);
  }

  function onPointerLeave() {
    x.set(0.5);
    y.set(0.5);
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      whileHover={{ scale: 1.015, y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={`group relative ${className ?? ""}`}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: useTransform(
            [glowX, glowY],
            ([gx, gy]) =>
              `radial-gradient(200px circle at ${gx} ${gy}, var(--color-primary) 0%, transparent 70%)`,
          ),
          opacity: 0.06,
        }}
      />
      {children}
    </motion.div>
  );
}
