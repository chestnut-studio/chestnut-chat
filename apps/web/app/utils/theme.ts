import modernMinimal from "./themes/modern-minimal.json";
import claude from "./themes/claude.json";
import caffeine from "./themes/caffeine.json";
import catppuccin from "./themes/catppuccin.json";
import neoBrutalism from "./themes/neo-brutalism.json";
import oceanBreeze from "./themes/ocean-breeze.json";

// Snapshots from https://tweakcn.com/r/themes/{name}.json (Apache-2.0).
export const THEME_PRESETS = [
  { id: "modern-minimal", label: "Modern Minimal", theme: modernMinimal.cssVars },
  { id: "claude", label: "Claude", theme: claude.cssVars },
  { id: "caffeine", label: "Caffeine", theme: caffeine.cssVars },
  { id: "catppuccin", label: "Catppuccin", theme: catppuccin.cssVars },
  { id: "neo-brutalism", label: "Neo Brutalism", theme: neoBrutalism.cssVars },
  { id: "ocean-breeze", label: "Ocean Breeze", theme: oceanBreeze.cssVars },
] as const;

export const THEME_RADIUS_OPTIONS = [0, 0.25, 0.5, 0.75, 1] as const;
export type ThemePresetId = (typeof THEME_PRESETS)[number]["id"];

export interface ThemePreferences {
  preset: ThemePresetId;
  radius: number | null;
}

export const DEFAULT_THEME_PREFERENCES: ThemePreferences = {
  preset: "modern-minimal",
  radius: null,
};

export function normalizeThemePreferences(value: unknown): ThemePreferences {
  const candidate = value && typeof value === "object" ? (value as Partial<ThemePreferences>) : {};
  const preset = THEME_PRESETS.find((option) => option.id === candidate.preset);
  // Old color-only cookies fall back to the new default preset.
  if (!preset) return { ...DEFAULT_THEME_PREFERENCES };
  const radius = THEME_RADIUS_OPTIONS.find((option) => option === candidate.radius) ?? null;
  return { preset: preset.id, radius };
}

export function getThemeCss(preferences: ThemePreferences): string {
  const preset =
    THEME_PRESETS.find((option) => option.id === preferences.preset) ?? THEME_PRESETS[0];
  const declarations = (mode: "light" | "dark") => {
    const variables: Record<string, string> = { ...preset.theme.theme, ...preset.theme[mode] };
    if (preferences.radius !== null) variables.radius = `${preferences.radius}rem`;
    return Object.entries(variables)
      .map(([key, value]) => {
        // Tailwind utilities must reference runtime tokens, not compile-time literals.
        const name = key.startsWith("font-") || key.startsWith("shadow-") ? `theme-${key}` : key;
        return `--${name}:${value};`;
      })
      .join("");
  };
  return `:root[data-theme]{${declarations("light")}}:root[data-theme].dark{${declarations("dark")}}`;
}
