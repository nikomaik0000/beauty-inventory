/**
 * Small, non-color design tokens that need to exist as plain JS/TS
 * values rather than CSS. Every color token lives in app/globals.css
 * as a CSS variable (single source of truth, wired into Tailwind via
 * tailwind.config.ts) — see lib/design-system.ts for the full picture.
 */

/** Category color accents, cycled by category id — used for subtle
 * left-border/dot accents in list mode so categories are scannable
 * at a glance without resorting to a big palette of saturated hues.
 * Deliberately not theme-dependent (unlike everything else) — these
 * are meant to stay visually consistent as fixed identifying colors. */
export const categoryAccentCycle = [
  "#A68965",
  "#7E9270",
  "#AD7B8A",
  "#6E8B99",
  "#B99B62",
  "#8A7A9C",
] as const;

export function categoryAccent(index: number): string {
  return categoryAccentCycle[index % categoryAccentCycle.length];
}

/** Expiration urgency thresholds, in days. */
export const expirationThresholds = {
  soonDays: 60,
  urgentDays: 14,
} as const;

/** Fixed product-image container size shared by every surface that
 * displays a product image (currently just the grid card). */
export const productImageSize = 120;
