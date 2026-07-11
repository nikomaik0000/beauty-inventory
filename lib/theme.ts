/**
 * Centralized design tokens for Beauty Inventory.
 *
 * Mirrors the token-driven approach used in Birthday Rewards:
 * every color used in a component should come from here (or the
 * CSS variables it defines in globals.css), never a hardcoded hex
 * value or an arbitrary Tailwind bracket value.
 *
 * Light values are the source of truth; dark values are the
 * matching pair applied via the `.dark` class on <html>.
 */

export const theme = {
  light: {
    background: "#FAF6F0",
    surface: "#FFFFFF",
    surfaceMuted: "#F3ECE1",
    border: "#E7DCCB",
    divider: "#ECE3D4",
    textPrimary: "#3A2E22",
    textSecondary: "#6B5D4C",
    textMuted: "#9A8B75",
    accent: "#B98A5E",
    accentSoft: "#F1E3D0",
    accentStrong: "#8C6239",
    badgeBg: "#F6EEE0",
    badgeBorder: "#E4D3B8",
    badgeText: "#7A5C3A",
    searchBackground: "#F3ECE1",
    danger: "#B5543F",
    dangerSoft: "#F6E2DC",
    success: "#5F7A52",
    warning: "#C08A3E",
    warningSoft: "#F6E7CD",
  },
  dark: {
    background: "#211B15",
    surface: "#2A2219",
    surfaceMuted: "#332A1F",
    border: "#443826",
    divider: "#3A3122",
    textPrimary: "#F3EADC",
    textSecondary: "#CBB99E",
    textMuted: "#8F7E67",
    accent: "#D6A876",
    accentSoft: "#3D2F1F",
    accentStrong: "#EFC79A",
    badgeBg: "#38301F",
    badgeBorder: "#4E4128",
    badgeText: "#E4C79C",
    searchBackground: "#332A1F",
    danger: "#E08268",
    dangerSoft: "#3E241D",
    success: "#8FAE7C",
    warning: "#E0B063",
    warningSoft: "#3D3016",
  },
} as const;

export type ThemeMode = keyof typeof theme;
export type ThemeTokens = typeof theme.light;

/** Category color accents, cycled by category id — used for subtle
 * left-border/dot accents in list mode so categories are scannable
 * at a glance without resorting to a big palette of saturated hues. */
export const categoryAccentCycle = [
  "#B98A5E",
  "#8A9A6B",
  "#B5738A",
  "#6E93A8",
  "#C09A54",
  "#8E7BA8",
] as const;

export function categoryAccent(index: number): string {
  return categoryAccentCycle[index % categoryAccentCycle.length];
}

/** Expiration urgency thresholds, in days. */
export const expirationThresholds = {
  soonDays: 60,
  urgentDays: 14,
} as const;
