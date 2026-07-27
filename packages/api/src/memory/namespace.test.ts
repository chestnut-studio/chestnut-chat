import { describe, expect, it } from "vitest";

import { resolveMemoryNamespace } from "./namespace";

describe("resolveMemoryNamespace", () => {
  it("uses global memory for standalone chats", () => {
    expect(resolveMemoryNamespace({ projectId: null, memoryMode: null })).toEqual({
      scope: "global",
      projectId: null,
    });
  });

  it("uses global memory for default projects", () => {
    expect(resolveMemoryNamespace({ projectId: "p1", memoryMode: "default" })).toEqual({
      scope: "global",
      projectId: null,
    });
  });

  it("isolates project-only memory", () => {
    expect(resolveMemoryNamespace({ projectId: "p1", memoryMode: "project" })).toEqual({
      scope: "project",
      projectId: "p1",
    });
  });
});
