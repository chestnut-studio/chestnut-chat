import { chunkDocument } from "@chestnut-chat/api/memory/chunk";
import { db } from "@chestnut-chat/db";
import { projectFile, projectFileChunk } from "@chestnut-chat/db/schema/project";
import { eq } from "drizzle-orm";

import { embedTexts } from "./embeddings";

export async function indexProjectFile(fileId: string) {
  const [file] = await db.select().from(projectFile).where(eq(projectFile.id, fileId)).limit(1);
  if (!file) return { indexed: false, skipped: "missing_file" as const };

  const text = file.extractedText?.trim() ?? "";
  if (!text) {
    await db
      .update(projectFile)
      .set({ status: "failed", error: "No extractable text", updatedAt: new Date() })
      .where(eq(projectFile.id, fileId));
    return { indexed: false, skipped: "empty_text" as const };
  }

  const chunks = chunkDocument(text);

  // Embed before touching the existing chunks: a persistent embedding failure
  // must leave the previous index intact and surface as a failed file instead
  // of silently dropping the chunks.
  let embeddings: number[][] | null = null;
  try {
    embeddings = await embedTexts(chunks);
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 200) : String(error);
    console.error("memory_file_index_embedding_failed", { fileId, error: message });
    await db
      .update(projectFile)
      .set({ status: "failed", error: `Embedding failed: ${message}`, updatedAt: new Date() })
      .where(eq(projectFile.id, fileId));
    return { indexed: false, skipped: "embedding_failed" as const };
  }

  await db.delete(projectFileChunk).where(eq(projectFileChunk.fileId, fileId));

  if (chunks.length) {
    await db.insert(projectFileChunk).values(
      chunks.map((content, chunkIndex) => ({
        fileId,
        projectId: file.projectId,
        chunkIndex,
        content,
        embedding: embeddings?.[chunkIndex] ?? null,
      })),
    );
  }

  await db
    .update(projectFile)
    .set({ status: "indexed", error: null, updatedAt: new Date() })
    .where(eq(projectFile.id, fileId));

  return { indexed: true, chunks: chunks.length };
}
