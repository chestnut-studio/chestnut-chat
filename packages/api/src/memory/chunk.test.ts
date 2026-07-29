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
});
