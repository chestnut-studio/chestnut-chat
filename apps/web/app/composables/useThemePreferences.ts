import {
  DEFAULT_THEME_PREFERENCES,
  normalizeThemePreferences,
  type ThemePreferences,
} from "~/utils/theme";

export function useThemePreferences() {
  const cookie = useCookie<ThemePreferences>("chestnut-theme", {
    default: () => ({ ...DEFAULT_THEME_PREFERENCES }),
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  const preferences = computed(() => normalizeThemePreferences(cookie.value));

  const preset = computed<string>({
    get: () => preferences.value.preset,
    set: (value) => {
      cookie.value = normalizeThemePreferences({ preset: value, radius: null });
    },
  });
  const radius = computed<string>({
    get: () => (preferences.value.radius === null ? "preset" : String(preferences.value.radius)),
    set: (value) => {
      cookie.value = normalizeThemePreferences({
        ...preferences.value,
        radius: value === "preset" ? null : Number(value),
      });
    },
  });

  function reset() {
    cookie.value = { ...DEFAULT_THEME_PREFERENCES };
  }

  return { preferences, preset, radius, reset };
}
