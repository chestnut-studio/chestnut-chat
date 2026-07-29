export const PRIMARY_THEME_COLORS = [
  { value: "red", swatches: ["oklch(63.7% 0.237 25.331)"] },
  { value: "orange", swatches: ["oklch(70.5% 0.213 47.604)"] },
  { value: "amber", swatches: ["oklch(76.9% 0.188 70.08)"] },
  { value: "yellow", swatches: ["oklch(79.5% 0.184 86.047)"] },
  { value: "lime", swatches: ["oklch(76.8% 0.233 130.85)"] },
  { value: "green", swatches: ["oklch(72.3% 0.219 149.579)"] },
  { value: "emerald", swatches: ["oklch(69.6% 0.17 162.48)"] },
  { value: "teal", swatches: ["oklch(70.4% 0.14 182.503)"] },
  { value: "cyan", swatches: ["oklch(71.5% 0.143 215.221)"] },
  { value: "sky", swatches: ["oklch(68.5% 0.169 237.323)"] },
  { value: "blue", swatches: ["oklch(62.3% 0.214 259.815)"] },
  { value: "indigo", swatches: ["oklch(58.5% 0.233 277.117)"] },
  { value: "violet", swatches: ["oklch(60.6% 0.25 292.717)"] },
  { value: "purple", swatches: ["oklch(62.7% 0.265 303.9)"] },
  { value: "fuchsia", swatches: ["oklch(66.7% 0.295 322.15)"] },
  { value: "pink", swatches: ["oklch(65.6% 0.241 354.308)"] },
  { value: "rose", swatches: ["oklch(64.5% 0.246 16.439)"] },
] as const;

export const NEUTRAL_THEME_COLORS = [
  {
    value: "slate",
    swatches: [
      "oklch(92.9% 0.013 255.508)",
      "oklch(55.4% 0.046 257.417)",
      "oklch(27.9% 0.041 260.031)",
    ],
  },
  {
    value: "gray",
    swatches: [
      "oklch(92.8% 0.006 264.531)",
      "oklch(55.1% 0.027 264.364)",
      "oklch(27.8% 0.033 256.848)",
    ],
  },
  {
    value: "zinc",
    swatches: [
      "oklch(92% 0.004 286.32)",
      "oklch(55.2% 0.016 285.938)",
      "oklch(27.4% 0.006 286.033)",
    ],
  },
  {
    value: "neutral",
    swatches: ["oklch(92.2% 0 0)", "oklch(55.6% 0 0)", "oklch(26.9% 0 0)"],
  },
  {
    value: "stone",
    swatches: [
      "oklch(92.3% 0.003 48.717)",
      "oklch(55.3% 0.013 58.071)",
      "oklch(26.8% 0.007 34.298)",
    ],
  },
] as const;

export const THEME_RADIUS_OPTIONS = [0, 0.125, 0.25, 0.375, 0.5] as const;

export type PrimaryThemeColor = (typeof PRIMARY_THEME_COLORS)[number]["value"];
export type NeutralThemeColor = (typeof NEUTRAL_THEME_COLORS)[number]["value"];
export type ThemeRadius = (typeof THEME_RADIUS_OPTIONS)[number];

export interface ThemePreferences {
  primary: PrimaryThemeColor;
  neutral: NeutralThemeColor;
  radius: ThemeRadius;
}

export const DEFAULT_THEME_PREFERENCES = {
  primary: "cyan",
  neutral: "neutral",
  radius: 0.25,
} as const satisfies ThemePreferences;

function isPrimaryThemeColor(value: unknown): value is PrimaryThemeColor {
  return PRIMARY_THEME_COLORS.some((option) => option.value === value);
}

function isNeutralThemeColor(value: unknown): value is NeutralThemeColor {
  return NEUTRAL_THEME_COLORS.some((option) => option.value === value);
}

function isThemeRadius(value: unknown): value is ThemeRadius {
  return THEME_RADIUS_OPTIONS.some((option) => option === value);
}

export function normalizeThemePreferences(
  value: Partial<ThemePreferences> | null | undefined,
): ThemePreferences {
  const primary = isPrimaryThemeColor(value?.primary)
    ? value.primary
    : DEFAULT_THEME_PREFERENCES.primary;
  const neutral = isNeutralThemeColor(value?.neutral)
    ? value.neutral
    : DEFAULT_THEME_PREFERENCES.neutral;
  const radius = isThemeRadius(value?.radius) ? value.radius : DEFAULT_THEME_PREFERENCES.radius;

  return { primary, neutral, radius };
}
