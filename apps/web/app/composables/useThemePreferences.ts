import {
  DEFAULT_THEME_PREFERENCES,
  normalizeThemePreferences,
  type AccentId,
  type ThemePreferences,
} from "~/utils/theme";

export function useThemePreferences() {
  const cookie = useCookie<ThemePreferences>("chestnut-theme", {
    default: () => ({ ...DEFAULT_THEME_PREFERENCES }),
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  const preferences = computed(() => normalizeThemePreferences(cookie.value));

  const accent = computed<AccentId>({
    get: () => preferences.value.accent,
    set: (value) => {
      cookie.value = normalizeThemePreferences({ accent: value });
    },
  });

  function reset() {
    cookie.value = { ...DEFAULT_THEME_PREFERENCES };
  }

  return { preferences, accent, reset };
}
