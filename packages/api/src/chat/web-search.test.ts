import { describe, expect, it } from "vitest";

import {
  MAX_WEB_SEARCH_QUERIES,
  MAX_WEB_SEARCH_QUERY_LENGTH,
  normalizeWebSearchQueries,
} from "./web-search";

describe("normalizeWebSearchQueries", () => {
  it("trims, compacts, and deduplicates generated queries", () => {
    expect(
      normalizeWebSearchQueries([
        "  OpenRouter   server tools  ",
        "OpenRouter server tools",
        "AI SDK tool calling",
      ]),
    ).toEqual(["OpenRouter server tools", "AI SDK tool calling"]);
  });

  it("rejects invalid values and caps query count and length", () => {
    const longQuery = "x".repeat(MAX_WEB_SEARCH_QUERY_LENGTH + 20);

    expect(normalizeWebSearchQueries("not-an-array")).toEqual([]);
    expect(
      normalizeWebSearchQueries(["", null, longQuery, "second", "third", "ignored fourth"]),
    ).toEqual([longQuery.slice(0, MAX_WEB_SEARCH_QUERY_LENGTH), "second", "third"]);
    expect(normalizeWebSearchQueries(["one", "two", "three", "four"])).toHaveLength(
      MAX_WEB_SEARCH_QUERIES,
    );
  });
});
