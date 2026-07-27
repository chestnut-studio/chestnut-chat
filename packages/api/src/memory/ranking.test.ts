import { describe, expect, it } from "vitest";

import { reciprocalRankFusion } from "./ranking";

describe("reciprocalRankFusion", () => {
  it("merges ranked lists with shared items boosted", () => {
    const fused = reciprocalRankFusion(
      [
        ["a", "b", "c"],
        ["b", "d", "a"],
      ],
      { key: (item) => item },
    );

    expect(fused[0]?.item).toBe("b");
    expect(fused.map((entry) => entry.item)).toEqual(["b", "a", "d", "c"]);
  });
});
