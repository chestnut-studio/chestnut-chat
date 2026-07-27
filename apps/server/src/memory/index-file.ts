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

  await db.delete(projectFileChunk).where(eq(projectFileChunk.fileId, fileId));

  const chunks = chunkDocument(text);
  const embeddings = await embedTexts(chunks);

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
