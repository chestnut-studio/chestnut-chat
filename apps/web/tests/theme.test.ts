import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getThemeCss, normalizeThemePreferences, THEME_PRESETS } from "../app/utils/theme";

describe("theme preferences", () => {
  it("normalizes old, malformed, and unknown cookies without interpolating their values", () => {
    for (const value of [null, "bad", { primary: "cyan", radius: 0.25 }, { preset: "</style>" }]) {
      assert.deepEqual(normalizeThemePreferences(value), {
        preset: "modern-minimal",
        radius: null,
      });
    }
    assert.deepEqual(normalizeThemePreferences({ preset: "claude", radius: -1 }), {
      preset: "claude",
      radius: null,
    });
    assert.deepEqual(normalizeThemePreferences({ preset: "claude", radius: "0.5" }), {
      preset: "claude",
      radius: null,
    });
  });

  it("preserves zero and the largest radius override", () => {
    assert.deepEqual(normalizeThemePreferences({ preset: "catppuccin", radius: 0 }), {
      preset: "catppuccin",
      radius: 0,
    });
    assert.deepEqual(normalizeThemePreferences({ preset: "ocean-breeze", radius: 1 }), {
      preset: "ocean-breeze",
      radius: 1,
    });
  });

  it("emits distinct official light/dark palettes and runtime font/shadow tokens", () => {
    const css = getThemeCss({ preset: "claude", radius: null });
    const [light, dark] = css.split(":root[data-theme].dark");
    assert.ok(light!.startsWith(":root[data-theme]{"));
    assert.match(light!, /--background:oklch\(0\.9818 0\.0054 95\.0986\);/);
    assert.match(dark!, /--background:oklch\(0\.2679 0\.0036 106\.6427\);/);
    assert.match(light!, /--primary:oklch\(0\.6171 0\.1375 39\.0427\);/);
    assert.match(css, /--theme-font-sans:ui-sans-serif/);
    assert.match(css, /--theme-shadow-sm:/);
    assert.match(css, /--radius:0\.5rem;/);
  });

  it("overrides both modes and restores each preset's own radius", () => {
    assert.equal(
      getThemeCss({ preset: "neo-brutalism", radius: 0.75 }).match(/--radius:0\.75rem;/g)?.length,
      2,
    );
    assert.equal(
      getThemeCss({ preset: "neo-brutalism", radius: null }).match(/--radius:0px;/g)?.length,
      2,
    );
    assert.equal(
      getThemeCss({ preset: "catppuccin", radius: null }).match(/--radius:0\.35rem;/g)?.length,
      2,
    );
  });

  it("ships full light and dark palettes for every offered preset", () => {
    for (const preset of THEME_PRESETS) {
      assert.equal(normalizeThemePreferences({ preset: preset.id }).preset, preset.id);
      for (const mode of [preset.theme.light, preset.theme.dark]) {
        for (const key of [
          "background",
          "foreground",
          "primary",
          "primary-foreground",
          "border",
          "input",
          "ring",
          "sidebar",
        ]) {
          assert.ok(key in mode, `${preset.id}: ${key}`);
        }
      }
    }
  });
});
