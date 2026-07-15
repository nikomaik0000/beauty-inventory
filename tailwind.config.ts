import type { Config } from "tailwindcss";

/**
 * Every value below reads from the CSS variables defined in
 * app/globals.css — nothing here is a hardcoded literal. To change a
 * color, radius, shadow, duration, or easing across the whole app,
 * edit the variable in globals.css (and lib/design-system.ts, which
 * mirrors the few values components need as plain JS). This file just
 * wires those variables into Tailwind utility class names.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        surfaceMuted: "var(--color-surface-muted)",
        border: "var(--color-border)",
        divider: "var(--color-divider)",
        textPrimary: "var(--color-text-primary)",
        textHeading: "var(--color-text-heading)",
        textLabel: "var(--color-text-label)",
        textSecondary: "var(--color-text-secondary)",
        textMuted: "var(--color-text-muted)",
        accent: "var(--color-accent)",
        accentSoft: "var(--color-accent-soft)",
        accentStrong: "var(--color-accent-strong)",
        badgeBg: "var(--color-badge-bg)",
        badgeBorder: "var(--color-badge-border)",
        badgeText: "var(--color-badge-text)",
        filterCountBadgeBg: "var(--color-filter-count-badge-bg)",
        searchBackground: "var(--color-search-background)",
        danger: "var(--color-danger)",
        dangerSoft: "var(--color-danger-soft)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        warningSoft: "var(--color-warning-soft)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        serifCjk: ["var(--font-serif-cjk)"],
      },
      fontSize: {
        heading: ["var(--text-heading)", { lineHeight: "var(--text-heading-line-height)", letterSpacing: "var(--text-heading-letter-spacing)" }],
        body: ["var(--text-body)", { lineHeight: "var(--text-body-line-height)" }],
        small: ["var(--text-small)", { lineHeight: "var(--text-small-line-height)" }],
      },
      borderRadius: {
        button: "var(--radius-button)",
        input: "var(--radius-input)",
        card: "var(--radius-card)",
        dropdown: "var(--radius-dropdown)",
        dialog: "var(--radius-dialog)",
        badge: "var(--radius-badge)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        dropdown: "var(--shadow-dropdown)",
        dialog: "var(--shadow-dialog)",
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        base: "var(--duration-base)",
        slow: "var(--duration-slow)",
      },
      transitionTimingFunction: {
        standard: "var(--ease-standard)",
      },
    },
  },
  plugins: [],
};

export default config;
