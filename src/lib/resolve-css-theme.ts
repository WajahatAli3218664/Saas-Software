"use client";

/**
 * Reads a CSS custom property as an actual usable value, for the marketing
 * site's three.js scenes. Two things make this necessary rather than just
 * reading the variable string directly:
 *
 * - Theme tokens are written as oklch(), which three.js's Color parser does
 *   not understand. Setting style.color on a real element and reading back
 *   getComputedStyle().color is the standard trick — browsers normalise any
 *   input format to an rgb() string there, which THREE.Color does parse.
 * - next/font's `variable` produces a generated, hashed font-family name
 *   (not the literal "Fraunces"), so canvas text has to read the same
 *   variable the CSS is actually using rather than guessing the family.
 */
export function resolveCssColor(varName: string): string {
  const probe = document.createElement("span");
  probe.style.color = `var(${varName})`;
  document.body.appendChild(probe);
  const rgb = getComputedStyle(probe).color;
  probe.remove();
  return rgb || "rgb(128,128,128)";
}

export function resolveCssFontFamily(varName: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  return value || fallback;
}
