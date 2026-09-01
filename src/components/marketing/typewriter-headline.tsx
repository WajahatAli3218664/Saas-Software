"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

/**
 * The headline arrives word by word, like a line being billed in real time —
 * the one place on the page the "software that writes your invoices" idea
 * gets to be felt rather than told. Runs once, on load, never on scroll: a
 * headline that re-types itself every time it re-enters the viewport reads
 * as a glitch, not a flourish.
 */
export function TypewriterHeadline({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  const words = text.split(" ");

  if (reduced) {
    return <h1 className={className}>{text}</h1>;
  }

  const container: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: 0.09, delayChildren: delay },
    },
  };

  const word: Variants = {
    hidden: { opacity: 0, y: "0.4em", filter: "blur(4px)" },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <motion.h1
      className={className}
      variants={container}
      initial="hidden"
      animate="show"
      aria-label={text}
    >
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden">
          <motion.span variants={word} className="inline-block">
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </motion.h1>
  );
}
