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
 *
 * Phase 2: desaturated toward a softer, more neutral warm-beige
 * (less orange, closer to Birthday Rewards) and widened the
 * light/dark contrast slightly for readability.
 */

export const theme = {
  light: {
    background: "#FAF8F4",
    surface: "#FFFFFF",
    surfaceMuted: "#F4EFE6",
    border: "#E6DFD1",
    divider: "#EDE8DD",
    textPrimary: "#3A342C",
    textSecondary: "#6E6656",
    textMuted: "#9C927E",
    accent: "#A68965",
    accentSoft: "#EFE7D9",
    accentStrong: "#87694A",
    badgeBg: "#F3EEE2",
    badgeBorder: "#E0D6C2",
    badgeText: "#786A52",
    searchBackground: "#F4EFE6",
    danger: "#B0574A",
    dangerSoft: "#F5E4DF",
    success: "#5F7A5C",
    warning: "#B98C4C",
    warningSoft: "#F3E8D3",
  },
  dark: {
    background: "#211D17",
    surface: "#2A251E",
    surfaceMuted: "#332D23",
    border: "#43392A",
    divider: "#393226",
    textPrimary: "#F1EADD",
    textSecondary: "#CABBA1",
    textMuted: "#8C806C",
    accent: "#CBAA80",
    accentSoft: "#3C3222",
    accentStrong: "#E9CBA3",
    badgeBg: "#38311F",
    badgeBorder: "#4C4029",
    badgeText: "#E1C79E",
    searchBackground: "#332D23",
    danger: "#DB8672",
    dangerSoft: "#3D251E",
    success: "#8DAE87",
    warning: "#DBB16C",
    warningSoft: "#3C3016",
  },
} as const;

export type ThemeMode = keyof typeof theme;
export type ThemeTokens = typeof theme.light;

/** Category color accents, cycled by category id — used for subtle
 * left-border/dot accents in list mode so categories are scannable
 * at a glance without resorting to a big palette of saturated hues. */
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
 * displays a product image (currently just the grid card). Sized to
 * match the Phase 4A mockup's proportions — larger and more prominent
 * than the original 88px, still fixed/identical across every card. */
export const productImageSize = 120;
