import { db } from "@chestnut-chat/db";
import { chat, message, type ChatLastOptions } from "@chestnut-chat/db/schema/chat";
import { memoryItem, memoryJob } from "@chestnut-chat/db/schema/memory";
import { project } from "@chestnut-chat/db/schema/project";
import { ORPCError } from "@orpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { buildDedupeKey } from "../memory/jobs";
import { protectedProcedure } from "../index";

function assertReturnedRow<T>(row: T | undefined): T {
  if (!row) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Database write failed" });
  }

  return row;
}

function assertOwnedRow<T>(row: T | undefined): T {
  if (!row) {
    throw new ORPCError("NOT_FOUND", { message: "Chat not found" });
  }

  return row;
}

async function assertOwnedProject(projectId: string, userId: string) {
  const [row] = await db
    .select({ id: project.id })
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.userId, userId)))
    .limit(1);

  if (!row) {
    throw new ORPCError("NOT_FOUND", { message: "Project not found" });
  }

  return row.id;
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

export const chatRouter = {
  list: protectedProcedure.handler(async ({ context }) => {
    return db
      .select()
      .from(chat)
      .where(eq(chat.userId, context.session.user.id))
      .orderBy(desc(chat.pinned), desc(chat.updatedAt));
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .handler(async ({ input, context }) => {
      const [row] = await db
        .select({
          chat,
          project: {
            id: project.id,
            name: project.name,
            iconKind: project.iconKind,
            iconValue: project.iconValue,
            iconColor: project.iconColor,
            memoryMode: project.memoryMode,
          },
        })
        .from(chat)
        .leftJoin(project, eq(chat.projectId, project.id))
        .where(and(eq(chat.id, input.id), eq(chat.userId, context.session.user.id)))
        .limit(1);

      if (!row) {
        throw new ORPCError("NOT_FOUND", { message: "Chat not found" });
      }

      return {
        ...row.chat,
        project: row.project?.id
          ? {
              id: row.project.id,
              name: row.project.name,
              iconKind: row.project.iconKind,
              iconValue: row.project.iconValue,
              iconColor: row.project.iconColor,
              memoryMode: row.project.memoryMode,
            }
          : null,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200).optional(),
        projectId: z.string().min(1).optional().nullable(),
      }),
    )
    .handler(async ({ input, context }) => {
      const projectId = input.projectId
        ? await assertOwnedProject(input.projectId, context.session.user.id)
        : null;

      const [row] = await db
        .insert(chat)
        .values({
          userId: context.session.user.id,
          title: input.title ?? "New Chat",
          projectId,
        })
        .returning();

      return assertReturnedRow(row);
    }),

  move: protectedProcedure
    .input(
      z.object({
        chatId: z.string().min(1),
        projectId: z.string().min(1).nullable(),
      }),
    )
    .handler(async ({ input, context }) => {
      const [ownedChat] = await db
        .select()
        .from(chat)
        .where(and(eq(chat.id, input.chatId), eq(chat.userId, context.session.user.id)))
        .limit(1);
      const owned = assertOwnedRow(ownedChat);

      const nextProjectId = input.projectId
        ? await assertOwnedProject(input.projectId, context.session.user.id)
        : null;

      if (owned.projectId === nextProjectId) {
        return owned;
      }

      const [row] = await db
        .update(chat)
        .set({ projectId: nextProjectId, updatedAt: new Date() })
        .where(and(eq(chat.id, input.chatId), eq(chat.userId, context.session.user.id)))
        .returning();

      const moved = assertOwnedRow(row);
      await db.delete(memoryItem).where(eq(memoryItem.sourceChatId, moved.id));
      await enqueueChatReindex(context.session.user.id, moved.id, nextProjectId);
      return moved;
    }),

  rename: protectedProcedure
    .input(z.object({ id: z.string(), title: z.string().min(1).max(200) }))
    .handler(async ({ input, context }) => {
      const [row] = await db
        .update(chat)
        .set({ title: input.title })
        .where(and(eq(chat.id, input.id), eq(chat.userId, context.session.user.id)))
        .returning();

      return assertOwnedRow(row);
    }),

  setPinned: protectedProcedure
    .input(z.object({ id: z.string(), pinned: z.boolean() }))
    .handler(async ({ input, context }) => {
      const [row] = await db
        .update(chat)
        .set({ pinned: input.pinned })
        .where(and(eq(chat.id, input.id), eq(chat.userId, context.session.user.id)))
        .returning();

      return assertOwnedRow(row);
    }),

  setArchived: protectedProcedure
    .input(z.object({ id: z.string(), archived: z.boolean() }))
    .handler(async ({ input, context }) => {
      const [row] = await db
        .update(chat)
        .set({ archived: input.archived })
        .where(and(eq(chat.id, input.id), eq(chat.userId, context.session.user.id)))
        .returning();

      return assertOwnedRow(row);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const [row] = await db
        .delete(chat)
        .where(and(eq(chat.id, input.id), eq(chat.userId, context.session.user.id)))
        .returning({ id: chat.id });

      assertOwnedRow(row);
      return { id: input.id };
    }),

  fork: protectedProcedure
    .input(
      z.object({
        chatId: z.string().min(1),
        messageId: z.string().min(1),
        options: z
          .object({
            model: z.string().min(1),
            reasoning: z.boolean(),
            reasoningEffort: z.enum(["low", "high", "max"]),
            webSearch: z.boolean(),
          })
          .optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      const [sourceChat] = await db
        .select()
        .from(chat)
        .where(and(eq(chat.id, input.chatId), eq(chat.userId, userId)))
        .limit(1);
      const source = assertOwnedRow(sourceChat);

      const rows = await db
        .select()
        .from(message)
        .where(eq(message.chatId, input.chatId))
        .orderBy(asc(message.createdAt));

      const targetIndex = rows.findIndex((row) => row.id === input.messageId);
      if (targetIndex === -1) {
        throw new ORPCError("NOT_FOUND", { message: "Message not found" });
      }

      const forkRows = rows.slice(0, targetIndex + 1);
      if (!forkRows.length) {
        throw new ORPCError("BAD_REQUEST", { message: "No messages to fork" });
      }

      const lastOptions: ChatLastOptions | null = input.options ?? source.lastOptions ?? null;

      const [newChat] = await db
        .insert(chat)
        .values({
          userId,
          projectId: source.projectId,
          title: source.title,
          lastOptions,
        })
        .returning();
      const created = assertReturnedRow(newChat);

      await db.insert(message).values(
        forkRows.map((forkRow) => ({
          id: crypto.randomUUID(),
          chatId: created.id,
          role: forkRow.role,
          parts: forkRow.parts,
          metadata: forkRow.metadata,
          model: forkRow.model,
          createdAt: forkRow.createdAt,
        })),
      );

      await enqueueChatReindex(userId, created.id, source.projectId);
      return created;
    }),

  messages: protectedProcedure
    .input(z.object({ chatId: z.string() }))
    .handler(async ({ input, context }) => {
      const rows = await db
        .select({ message })
        .from(message)
        .innerJoin(chat, eq(message.chatId, chat.id))
        .where(and(eq(message.chatId, input.chatId), eq(chat.userId, context.session.user.id)))
        .orderBy(asc(message.createdAt));

      return rows.map((row) => row.message);
    }),
};
