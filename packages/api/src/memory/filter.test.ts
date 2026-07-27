import { describe, expect, it } from "vitest";

import { filterMemoryCandidates, preferNewestByKey } from "./filter";

describe("filterMemoryCandidates", () => {
  it("drops sensitive and transient items and caps at five", () => {
    const accepted = filterMemoryCandidates([
      { memoryKey: "name", memoryType: "fact", content: "The user's name is Ada Lovelace" },
      { memoryKey: "password", memoryType: "fact", content: "password: hunter2" },
      { memoryKey: "otp", memoryType: "fact", content: "authentication code 123456" },
      { memoryKey: "once", memoryType: "fact", content: "just this once summarize the email" },
      {
        memoryKey: "pref",
        memoryType: "preference",
        content: "Prefers concise answers in replies",
      },
      { memoryKey: "goal", memoryType: "goal", content: "Wants to learn TypeScript deeply" },
      { memoryKey: "dup", memoryType: "fact", content: "First lasting note about the hobby" },
      { memoryKey: "dup", memoryType: "fact", content: "Second lasting note about the hobby" },
      { memoryKey: "extra1", memoryType: "fact", content: "Keeps a garden behind the house" },
      { memoryKey: "extra2", memoryType: "fact", content: "Lives in Shanghai with family" },
      { memoryKey: "extra3", memoryType: "fact", content: "Speaks Mandarin every day at home" },
    ]);

    expect(accepted).toHaveLength(5);
    expect(accepted.map((item) => item.memoryKey)).toEqual([
      "name",
      "pref",
      "goal",
      "dup",
      "extra1",
    ]);
    expect(accepted.find((item) => item.memoryKey === "dup")?.content).toBe(
      "First lasting note about the hobby",
    );
  });
});

describe("preferNewestByKey", () => {
  it("keeps the newest value per key", () => {
    const result = preferNewestByKey([
      { memoryKey: "city", content: "old", createdAt: "2024-01-01T00:00:00.000Z" },
      { memoryKey: "city", content: "new", createdAt: "2025-01-01T00:00:00.000Z" },
      { memoryKey: "lang", content: "zh", createdAt: "2025-02-01T00:00:00.000Z" },
    ]);

    expect(result).toEqual([
      { memoryKey: "city", content: "new", createdAt: "2025-01-01T00:00:00.000Z" },
      { memoryKey: "lang", content: "zh", createdAt: "2025-02-01T00:00:00.000Z" },
    ]);
  });
});
