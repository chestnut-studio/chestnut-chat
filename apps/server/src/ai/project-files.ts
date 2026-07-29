import { auth } from "@chestnut-chat/auth";
import {
  MAX_PROJECT_FILE_BYTES,
  MAX_PROJECT_FILES,
  isProjectDocumentFile,
  validateProjectFileSelection,
} from "@chestnut-chat/api/project/files";
import { db } from "@chestnut-chat/db";
import { project, projectFile } from "@chestnut-chat/db/schema/project";
import { and, eq, sql } from "drizzle-orm";
import type { Context } from "hono";

import { extractDocumentText } from "./extract-document";
import { enqueueMemoryJob } from "../memory/queue";

export async function handleProjectFileUpload(c: Context): Promise<Response> {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return c.json({ error: "Unauthorized" }, 401);

  const projectId = c.req.param("projectId");
  if (!projectId) return c.json({ error: "Missing project id" }, 400);

  const [owned] = await db
    .select({ id: project.id })
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.userId, session.user.id)))
    .limit(1);

  if (!owned) return c.json({ error: "Project not found" }, 404);

  let form: FormData;
  try {
    form = await c.req.formData();
  } catch {
    return c.json({ error: "Invalid multipart body" }, 400);
  }

  const files = form.getAll("files").flatMap((entry) => {
    if (typeof entry === "string") return [];
    if (
      typeof entry === "object" &&
      entry !== null &&
      "arrayBuffer" in entry &&
      typeof (entry as Blob).arrayBuffer === "function" &&
      "name" in entry &&
      typeof (entry as { name?: unknown }).name === "string"
    ) {
      return [entry as File];
    }
    return [];
  });

  if (!files.length) return c.json({ error: "No files provided" }, 400);

  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projectFile)
    .where(and(eq(projectFile.projectId, projectId), eq(projectFile.userId, session.user.id)));
  const existingCount = countRows[0]?.count ?? 0;

  const validation = validateProjectFileSelection(
    files.map((file) => ({ name: file.name, type: file.type, size: file.size })),
    existingCount,
  );

  if (validation) {
    return c.json(
      {
        error: validation,
        message:
          validation === "tooMany"
            ? `A project can have at most ${MAX_PROJECT_FILES} files.`
            : validation === "tooLarge"
              ? `Each file must be ${Math.round(MAX_PROJECT_FILE_BYTES / (1024 * 1024))} MB or smaller.`
              : validation === "imageRejected"
                ? "Image uploads are not supported for project files."
                : "Unsupported or empty file.",
      },
      400,
    );
  }

  const results: Array<{
    filename: string;
    ok: boolean;
    fileId?: string;
    error?: string;
  }> = [];

  for (const file of files) {
    try {
      if (!isProjectDocumentFile(file.name, file.type || "application/octet-stream")) {
        throw new Error("Unsupported file type");
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const extracted = await extractDocumentText(
        file.name,
        file.type || "application/octet-stream",
        buffer,
      );

      const [row] = await db
        .insert(projectFile)
        .values({
          projectId,
          userId: session.user.id,
          filename: extracted.filename,
          mediaType: extracted.mediaType,
          sizeBytes: file.size,
          extractedText: extracted.extractedText,
          status: "pending",
        })
        .returning();

      if (!row) throw new Error("Failed to save file metadata");

      await enqueueMemoryJob({
        userId: session.user.id,
        type: "file_index",
        projectId,
        fileId: row.id,
        dedupeParts: ["file_index", row.id],
      });

      results.push({ filename: file.name, ok: true, fileId: row.id });
    } catch (error) {
      results.push({
        filename: file.name,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return c.json({
    projectId,
    results,
    succeeded: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  });
}
