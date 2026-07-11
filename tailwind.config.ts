import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
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
        textSecondary: "var(--color-text-secondary)",
        textMuted: "var(--color-text-muted)",
        accent: "var(--color-accent)",
        accentSoft: "var(--color-accent-soft)",
        accentStrong: "var(--color-accent-strong)",
        badgeBg: "var(--color-badge-bg)",
        badgeBorder: "var(--color-badge-border)",
        badgeText: "var(--color-badge-text)",
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
      },
      borderRadius: {
        card: "14px",
        badge: "999px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(60, 45, 30, 0.06), 0 1px 1px rgba(60, 45, 30, 0.04)",
        cardHover: "0 4px 14px rgba(60, 45, 30, 0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
