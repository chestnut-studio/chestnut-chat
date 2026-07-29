import { DEFAULT_THEME_PREFERENCES } from "./utils/theme";

export default defineAppConfig({
  ui: {
    colors: {
      primary: DEFAULT_THEME_PREFERENCES.primary,
      neutral: DEFAULT_THEME_PREFERENCES.neutral,
    },
  },
});
