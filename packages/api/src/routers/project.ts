import { db } from "@chestnut-chat/db";
import { chat } from "@chestnut-chat/db/schema/chat";
import { memoryItem, memoryJob } from "@chestnut-chat/db/schema/memory";
import { project, projectFile } from "@chestnut-chat/db/schema/project";
import { ORPCError } from "@orpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { buildDedupeKey } from "../memory/jobs";
import { protectedProcedure } from "../index";
import { isAllowedProjectIcon, isAllowedProjectIconColor } from "../project/icons";

const DEFAULT_CHAT_TITLE = "New Chat";

function assertReturnedRow<T>(row: T | undefined): T {
  if (!row) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Database write failed" });
  }
  return row;
}

function assertOwnedProject<T>(row: T | undefined): T {
  if (!row) {
    throw new ORPCError("NOT_FOUND", { message: "Project not found" });
  }
  return row;
}

const iconSchema = z
  .object({
    iconKind: z.enum(["emoji", "lucide"]),
    iconValue: z.string().min(1).max(64),
    iconColor: z.string().min(1).max(32).default("neutral"),
  })
  .superRefine((value, ctx) => {
    if (!isAllowedProjectIcon(value.iconKind, value.iconValue)) {
      ctx.addIssue({
        code: "custom",
        message: "Icon is not in the allowlist",
        path: ["iconValue"],
      });
    }
    if (!isAllowedProjectIconColor(value.iconColor)) {
      ctx.addIssue({
        code: "custom",
        message: "Icon color is not in the allowlist",
        path: ["iconColor"],
      });
    }
  });

const projectInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  iconKind: z.enum(["emoji", "lucide"]).default("emoji"),
  iconValue: z.string().min(1).max(64).default("📁"),
  iconColor: z.string().min(1).max(32).default("neutral"),
  memoryMode: z.enum(["default", "project"]).default("default"),
  instructions: z.string().max(8_000).optional().nullable(),
});

async function getOwnedProject(projectId: string, userId: string) {
  const [row] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.userId, userId)))
    .limit(1);
  return assertOwnedProject(row);
}

async function enqueueChatReindex(userId: string, chatId: string, projectId: string | null) {
  await db.insert(memoryJob).values({
    userId,
    type: "chat_reindex",
    status: "pending",
    chatId,
    projectId,
    dedupeKey: buildDedupeKey(["chat_reindex", chatId, projectId ?? "global", String(Date.now())]),
    payload: JSON.stringify({ chatId, projectId }),
  });
}

export const projectRouter = {
  list: protectedProcedure.handler(async ({ context }) => {
    return db
      .select()
      .from(project)
      .where(eq(project.userId, context.session.user.id))
      .orderBy(desc(project.updatedAt));
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .handler(async ({ input, context }) => {
      return getOwnedProject(input.id, context.session.user.id);
    }),

  create: protectedProcedure.input(projectInputSchema).handler(async ({ input, context }) => {
    iconSchema.parse({
      iconKind: input.iconKind,
      iconValue: input.iconValue,
      iconColor: input.iconColor,
    });

    const projectId = crypto.randomUUID();
    const chatId = crypto.randomUUID();
    const userId = context.session.user.id;

    const [projectRows, chatRows] = await db.batch([
      db
        .insert(project)
        .values({
          id: projectId,
          userId,
          name: input.name,
          iconKind: input.iconKind,
          iconValue: input.iconValue,
          iconColor: input.iconColor,
          memoryMode: input.memoryMode,
          instructions: input.instructions?.trim() || null,
        })
        .returning(),
      db
        .insert(chat)
        .values({
          id: chatId,
          userId,
          projectId,
          title: DEFAULT_CHAT_TITLE,
        })
        .returning(),
    ]);

    return {
      project: assertReturnedRow(projectRows[0]),
      initialChat: assertReturnedRow(chatRows[0]),
    };
  }),

  update: protectedProcedure
    .input(
      projectInputSchema.partial().extend({
        id: z.string().min(1),
      }),
    )
    .handler(async ({ input, context }) => {
      const existing = await getOwnedProject(input.id, context.session.user.id);

      if (input.iconKind || input.iconValue || input.iconColor) {
        iconSchema.parse({
          iconKind: input.iconKind ?? existing.iconKind,
          iconValue: input.iconValue ?? existing.iconValue,
          iconColor: input.iconColor ?? existing.iconColor,
        });
      }

      const memoryModeChanged =
        input.memoryMode !== undefined && input.memoryMode !== existing.memoryMode;

      const [row] = await db
        .update(project)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.iconKind !== undefined ? { iconKind: input.iconKind } : {}),
          ...(input.iconValue !== undefined ? { iconValue: input.iconValue } : {}),
          ...(input.iconColor !== undefined ? { iconColor: input.iconColor } : {}),
          ...(input.memoryMode !== undefined ? { memoryMode: input.memoryMode } : {}),
          ...(input.instructions !== undefined
            ? { instructions: input.instructions?.trim() || null }
            : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(project.id, input.id), eq(project.userId, context.session.user.id)))
        .returning();

      const updated = assertOwnedProject(row);

      if (memoryModeChanged) {
        const projectChats = await db
          .select({ id: chat.id })
          .from(chat)
          .where(and(eq(chat.projectId, updated.id), eq(chat.userId, context.session.user.id)));

        for (const projectChat of projectChats) {
          await db.delete(memoryItem).where(eq(memoryItem.sourceChatId, projectChat.id));
          await enqueueChatReindex(context.session.user.id, projectChat.id, updated.id);
        }
      }

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .handler(async ({ input, context }) => {
      const [row] = await db
        .delete(project)
        .where(and(eq(project.id, input.id), eq(project.userId, context.session.user.id)))
        .returning({ id: project.id });

      assertOwnedProject(row);
      return { id: input.id };
    }),

  files: protectedProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .handler(async ({ input, context }) => {
      await getOwnedProject(input.projectId, context.session.user.id);

      return db
        .select({
          id: projectFile.id,
          projectId: projectFile.projectId,
          filename: projectFile.filename,
          mediaType: projectFile.mediaType,
          sizeBytes: projectFile.sizeBytes,
          status: projectFile.status,
          error: projectFile.error,
          createdAt: projectFile.createdAt,
          updatedAt: projectFile.updatedAt,
        })
        .from(projectFile)
        .where(
          and(
            eq(projectFile.projectId, input.projectId),
            eq(projectFile.userId, context.session.user.id),
          ),
        )
        .orderBy(desc(projectFile.createdAt));
    }),

  deleteFile: protectedProcedure
    .input(z.object({ projectId: z.string().min(1), fileId: z.string().min(1) }))
    .handler(async ({ input, context }) => {
      await getOwnedProject(input.projectId, context.session.user.id);

      const [row] = await db
        .delete(projectFile)
        .where(
          and(
            eq(projectFile.id, input.fileId),
            eq(projectFile.projectId, input.projectId),
            eq(projectFile.userId, context.session.user.id),
          ),
        )
        .returning({ id: projectFile.id });

      if (!row) {
        throw new ORPCError("NOT_FOUND", { message: "File not found" });
      }

      return { id: input.fileId };
    }),
};
