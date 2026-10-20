type Ramp = Record<(typeof RAMP_STEPS)[number], string>;

const RAMP_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

function ramp(values: string[]): Ramp {
  return Object.fromEntries(RAMP_STEPS.map((step, i) => [step, values[i]!])) as Ramp;
}

// Literal OKLCH ramps (Tailwind v4 palette). Blue is the BoardUI default and is
// already defined in theme.css, so it needs no override.
export const ACCENTS = [
  { id: "blue", label: "Blue", ramp: null },
  {
    id: "violet",
    label: "Violet",
    ramp: ramp([
      "oklch(96.9% 0.016 293.756)",
      "oklch(94.3% 0.029 294.588)",
      "oklch(89.4% 0.057 293.283)",
      "oklch(81.1% 0.111 293.571)",
      "oklch(70.2% 0.183 293.541)",
      "oklch(60.6% 0.25 292.717)",
      "oklch(54.1% 0.281 293.009)",
      "oklch(49.1% 0.27 292.581)",
      "oklch(43.2% 0.232 292.759)",
      "oklch(38% 0.189 293.745)",
      "oklch(28.3% 0.141 291.089)",
    ]),
  },
  {
    id: "green",
    label: "Green",
    ramp: ramp([
      "oklch(98.2% 0.018 155.826)",
      "oklch(96.2% 0.044 156.743)",
      "oklch(92.5% 0.084 155.995)",
      "oklch(87.1% 0.15 154.449)",
      "oklch(79.2% 0.209 151.711)",
      "oklch(72.3% 0.219 149.579)",
      "oklch(62.7% 0.194 149.214)",
      "oklch(52.7% 0.154 150.069)",
      "oklch(44.8% 0.119 151.328)",
      "oklch(39.3% 0.095 152.535)",
      "oklch(26.6% 0.065 152.934)",
    ]),
  },
  {
    id: "orange",
    label: "Orange",
    ramp: ramp([
      "oklch(98% 0.016 73.684)",
      "oklch(95.4% 0.038 75.164)",
      "oklch(90.1% 0.076 70.697)",
      "oklch(83.7% 0.128 66.29)",
      "oklch(75% 0.183 55.934)",
      "oklch(70.5% 0.213 47.604)",
      "oklch(64.6% 0.222 41.116)",
      "oklch(55.3% 0.195 38.402)",
      "oklch(47% 0.157 37.304)",
      "oklch(40.8% 0.123 38.172)",
      "oklch(26.6% 0.079 36.259)",
    ]),
  },
  {
    id: "rose",
    label: "Rose",
    ramp: ramp([
      "oklch(96.9% 0.015 12.422)",
      "oklch(94.1% 0.03 12.58)",
      "oklch(89.2% 0.058 10.001)",
      "oklch(81% 0.117 11.638)",
      "oklch(71.2% 0.194 13.428)",
      "oklch(64.5% 0.246 16.439)",
      "oklch(58.6% 0.253 17.585)",
      "oklch(51.4% 0.222 16.935)",
      "oklch(45.5% 0.188 13.697)",
      "oklch(41% 0.159 10.272)",
      "oklch(27.1% 0.105 12.094)",
    ]),
  },
  {
    id: "neutral",
    label: "Neutral",
    ramp: ramp([
      "oklch(98.5% 0 0)",
      "oklch(97% 0 0)",
      "oklch(92.2% 0 0)",
      "oklch(87% 0 0)",
      "oklch(70.8% 0 0)",
      "oklch(55.6% 0 0)",
      "oklch(43.9% 0 0)",
      "oklch(37.1% 0 0)",
      "oklch(26.9% 0 0)",
      "oklch(20.5% 0 0)",
      "oklch(14.5% 0 0)",
    ]),
  },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];

export interface ThemePreferences {
  accent: AccentId;
}

export const DEFAULT_THEME_PREFERENCES: ThemePreferences = { accent: "blue" };

/** Unknown, malformed, or pre-BoardUI (tweakcn preset) cookies fall back to blue. */
export function normalizeThemePreferences(value: unknown): ThemePreferences {
  const candidate = value && typeof value === "object" ? (value as Partial<ThemePreferences>) : {};
  const accent = ACCENTS.find((option) => option.id === candidate.accent);
  return { accent: accent?.id ?? DEFAULT_THEME_PREFERENCES.accent };
}

/** CSS that re-tints `--color-accent-*`; empty for the default accent. */
export function getThemeCss(preferences: ThemePreferences): string {
  const accent = ACCENTS.find((option) => option.id === preferences.accent);
  if (!accent?.ramp) return "";
  const declarations = RAMP_STEPS.map((step) => `--color-accent-${step}:${accent.ramp[step]};`);
  return `:root[data-accent="${accent.id}"]{${declarations.join("")}}`;
}
