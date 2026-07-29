export type MemoryMode = "default" | "project";

export type MemoryNamespace =
  | { scope: "global"; projectId: null }
  | { scope: "project"; projectId: string };

export type ChatMemoryContext = {
  projectId: string | null;
  memoryMode: MemoryMode | null;
};

/** Resolve where memories are read/written for a chat. */
export function resolveMemoryNamespace(context: ChatMemoryContext): MemoryNamespace {
  if (!context.projectId || !context.memoryMode) {
    return { scope: "global", projectId: null };
  }

  if (context.memoryMode === "project") {
    return { scope: "project", projectId: context.projectId };
  }

  return { scope: "global", projectId: null };
}

export function namespacesEqual(a: MemoryNamespace, b: MemoryNamespace) {
  return a.scope === b.scope && a.projectId === b.projectId;
}
