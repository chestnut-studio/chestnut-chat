import { describe, expect, it } from "vitest";

import { shouldSummarize, trimToTokenBudget } from "./budget";

describe("trimToTokenBudget", () => {
  it("preserves instructions and newest message while trimming files/memories", () => {
    const big = "x".repeat(20_000);
    const { kept } = trimToTokenBudget(
      [
        { id: "base", kind: "instructions", text: "base rules", priority: 0 },
        { id: "newest", kind: "message", text: "latest question", priority: 1 },
        { id: "file", kind: "file", text: big, priority: 40 },
        { id: "memory", kind: "memory", text: big, priority: 20 },
      ],
      { inputBudget: 8_000, outputReserve: 1_000 },
    );

    expect(kept.some((slice) => slice.id === "base")).toBe(true);
    expect(kept.some((slice) => slice.id === "newest")).toBe(true);
    expect(kept.some((slice) => slice.id === "file")).toBe(false);
  });
});

describe("shouldSummarize", () => {
  it("triggers above the rolling threshold", () => {
    expect(shouldSummarize(16_001)).toBe(true);
    expect(shouldSummarize(1_000)).toBe(false);
  });
});
