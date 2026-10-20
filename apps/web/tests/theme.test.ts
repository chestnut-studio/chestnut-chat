import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ACCENTS, getThemeCss, normalizeThemePreferences } from "../app/utils/theme";

describe("theme preferences", () => {
  it("falls back to blue for old, malformed, and unknown cookies", () => {
    for (const value of [
      null,
      "bad",
      { preset: "claude", radius: 0.25 },
      { accent: "</style>" },
      { accent: 3 },
    ]) {
      assert.deepEqual(normalizeThemePreferences(value), { accent: "blue" });
    }
  });

  it("keeps every offered accent", () => {
    for (const accent of ACCENTS) {
      assert.equal(normalizeThemePreferences({ accent: accent.id }).accent, accent.id);
    }
  });

  it("emits no override for the default accent", () => {
    assert.equal(getThemeCss({ accent: "blue" }), "");
  });

  it("emits a full eleven-step ramp for other accents", () => {
    for (const accent of ACCENTS.filter((option) => option.id !== "blue")) {
      const css = getThemeCss({ accent: accent.id });
      assert.ok(css.startsWith(`:root[data-accent="${accent.id}"]{`));
      assert.equal(css.match(/--color-accent-\d+:oklch\(/g)?.length, 11);
    }
  });
});
