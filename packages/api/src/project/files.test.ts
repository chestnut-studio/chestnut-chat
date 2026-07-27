import { describe, expect, it } from "vitest";

import { validateProjectFileSelection } from "./files";

describe("validateProjectFileSelection", () => {
  it("rejects images and over-limit uploads", () => {
    expect(validateProjectFileSelection([{ name: "a.png", type: "image/png", size: 100 }])).toBe(
      "imageRejected",
    );

    expect(
      validateProjectFileSelection(
        Array.from({ length: 3 }, (_, i) => ({
          name: `f${i}.txt`,
          type: "text/plain",
          size: 10,
        })),
        8,
      ),
    ).toBe("tooMany");
  });

  it("accepts valid documents", () => {
    expect(
      validateProjectFileSelection([{ name: "notes.md", type: "text/markdown", size: 100 }]),
    ).toBeNull();
  });
});
