/**
 * Design System — JS-side reference.
 *
 * This project doesn't use a `src/` directory, so rather than force one
 * in just for this, the design system lives where the rest of the
 * shared app code already does: `lib/` for tokens, `components/ui/`
 * for the shared primitives that consume them.
 *
 * `app/globals.css` is the actual source of truth (every color, radius,
 * shadow, and transition duration used in Tailwind classes throughout
 * the app resolves to a CSS variable defined there, wired in through
 * `tailwind.config.ts`). This file mirrors the handful of values that
 * also need to exist as plain JS/TS — e.g. Framer Motion transitions,
 * which take numeric seconds rather than a CSS duration string — so
 * both layers stay in one place to update together.
 *
 * Everything colour-related (including category accents and the
 * expiration-urgency thresholds) lives in `lib/theme.ts`; it's
 * re-exported below so `@/lib/design-system` is a single import that
 * covers the whole system.
 */

export { theme, categoryAccent, categoryAccentCycle, expirationThresholds, productImageSize } from "./theme";
export type { ThemeMode, ThemeTokens } from "./theme";

/** Border radius, one value per control family. Matches
 * `--radius-*` in globals.css and the `rounded-*` keys in
 * tailwind.config.ts — change the value in globals.css, not here. */
export const radius = {
  button: "9999px",
  input: "0.75rem",
  card: "14px",
  dropdown: "0.75rem",
  dialog: "14px",
  badge: "9999px",
} as const;

/** Typography scale. Matches `--text-*` in globals.css and the
 * `fontSize.{heading,body,small}` keys in tailwind.config.ts. */
export const typography = {
  fontSans: "var(--font-sans)",
  fontSerif: "var(--font-serif)",
  heading: { size: "1.25rem", weight: 600, lineHeight: 1.3, letterSpacing: "-0.01em" },
  body: { size: "0.875rem", weight: 400, lineHeight: 1.6 },
  small: { size: "0.75rem", weight: 500, lineHeight: 1.5 },
} as const;

/** Spacing is intentionally *not* reinvented here — Tailwind's own
 * default spacing scale (already a centralized, consistent system) is
 * used directly throughout the app via classes like `gap-3`, `p-4`,
 * `space-y-6`. These are just the semantic groupings components
 * should reach for, spelled out as a reference rather than a new set
 * of tokens to keep in sync with Tailwind's. */
export const spacing = {
  cardPadding: "p-4",
  sectionGap: "gap-6",
  formGap: "space-y-6",
  toolbarGap: "gap-2",
} as const;

/** Shadows. Matches `--shadow-*` in globals.css and the `boxShadow.*`
 * keys in tailwind.config.ts. */
export const shadow = {
  card: "var(--shadow-card)",
  cardHover: "var(--shadow-card-hover)",
  dropdown: "var(--shadow-dropdown)",
  dialog: "var(--shadow-dialog)",
} as const;

/** Animation. CSS-side durations live in `--duration-*` /
 * `--ease-standard` (globals.css) for use in Tailwind's
 * `duration-{fast,base,slow}` / `ease-standard` classes. Framer Motion
 * needs plain numbers (seconds), so `motion` below is the JS-side twin
 * — keep the two in sync by eye, since CSS custom properties can't be
 * read into a Framer Motion transition object directly. */
export const animation = {
  durationFast: "120ms",
  durationBase: "150ms",
  durationSlow: "200ms",
  easing: "cubic-bezier(0.4, 0, 0.2, 1)",
  motion: {
    fast: 0.12,
    base: 0.15,
    slow: 0.2,
    ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
  },
} as const;
