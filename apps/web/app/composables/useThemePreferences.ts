import {
  DEFAULT_THEME_PREFERENCES,
  normalizeThemePreferences,
  type NeutralThemeColor,
  type PrimaryThemeColor,
  type ThemePreferences,
  type ThemeRadius,
} from "~/utils/theme";

interface MutableUiColors {
  ui: {
    colors: {
      primary: string;
      neutral: string;
    };
  };
}

export function useThemePreferences() {
  const appConfig = useAppConfig() as unknown as MutableUiColors;
  const cookie = useCookie<Partial<ThemePreferences>>("chestnut-theme", {
    default: () => ({ ...DEFAULT_THEME_PREFERENCES }),
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  const preferences = useState<ThemePreferences>("theme-preferences", () =>
    normalizeThemePreferences(cookie.value),
  );

  const normalized = normalizeThemePreferences(preferences.value);
  preferences.value = normalized;
  cookie.value = normalized;
  applyColors(normalized);

  const primary = computed<string>({
    get: () => preferences.value.primary,
    set: (value) => {
      setPreferences({ primary: value as PrimaryThemeColor });
    },
  });
  const neutral = computed<string>({
    get: () => preferences.value.neutral,
    set: (value) => {
      setPreferences({ neutral: value as NeutralThemeColor });
    },
  });
  const radius = computed<number>({
    get: () => preferences.value.radius,
    set: (value) => {
      setPreferences({ radius: value as ThemeRadius });
    },
  });

  function applyColors(value: ThemePreferences) {
    appConfig.ui.colors.primary = value.primary;
    appConfig.ui.colors.neutral = value.neutral;
  }

  function setPreferences(value: Partial<ThemePreferences>) {
    const next = normalizeThemePreferences({
      ...preferences.value,
      ...value,
    });

    preferences.value = next;
    cookie.value = next;
    applyColors(next);
  }

  function reset() {
    setPreferences({ ...DEFAULT_THEME_PREFERENCES });
  }

  return {
    primary,
    neutral,
    radius,
    reset,
  };
}
