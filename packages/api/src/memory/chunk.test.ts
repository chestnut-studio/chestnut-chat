import { describe, expect, it } from "vitest";

import { chunkDocument, chunkOverlap } from "./chunk";

describe("chunkDocument", () => {
  it("chunks with overlap around paragraph boundaries", () => {
    const paragraph = "Sentence one. Sentence two. Sentence three.\n\n";
    const text = paragraph.repeat(40);
    const chunks = chunkDocument(text, { targetChars: 200, overlapChars: 40 });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunkOverlap(chunks[0]!, chunks[1]!, 40)).toBeGreaterThan(0);
  });

  it("returns empty for blank text", () => {
    expect(chunkDocument("   ")).toEqual([]);
  });

  it("never loops when overlap exceeds target", () => {
    const text = "Word. ".repeat(100);
    const chunks = chunkDocument(text, { targetChars: 100, overlapChars: 200 });
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("respects a small targetChars", () => {
    const paragraph = "Sentence one. Sentence two. Sentence three.\n\n";
    const chunks = chunkDocument(paragraph.repeat(20), { targetChars: 80, overlapChars: 10 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 90)).toBe(true);
  });
});
