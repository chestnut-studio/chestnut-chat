import { db } from "@chestnut-chat/db";
import { chat, message } from "@chestnut-chat/db/schema/chat";
import { ORPCError } from "@orpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";

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

export const chatRouter = {
  list: protectedProcedure.handler(async ({ context }) => {
    return db
      .select()
      .from(chat)
      .where(eq(chat.userId, context.session.user.id))
      .orderBy(desc(chat.pinned), desc(chat.updatedAt));
  }),

  create: protectedProcedure
    .input(z.object({ title: z.string().min(1).max(200).optional() }))
    .handler(async ({ input, context }) => {
      const [row] = await db
        .insert(chat)
        .values({
          userId: context.session.user.id,
          title: input.title ?? "New Chat",
        })
        .returning();

      return assertReturnedRow(row);
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
