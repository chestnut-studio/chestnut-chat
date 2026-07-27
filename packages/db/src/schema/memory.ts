import { relations } from "drizzle-orm";
import {
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  vector,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { chat, message } from "./chat";
import { project } from "./project";

export const memoryItemTypeEnum = pgEnum("memory_item_type", [
  "fact",
  "preference",
  "goal",
  "decision",
  "constraint",
]);

export const memoryJobTypeEnum = pgEnum("memory_job_type", [
  "extract",
  "summarize",
  "file_index",
  "chat_reindex",
]);

export const memoryJobStatusEnum = pgEnum("memory_job_status", [
  "pending",
  "running",
  "completed",
  "failed",
]);

export const chatSummary = pgTable(
  "chat_summary",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    chatId: text("chat_id")
      .notNull()
      .references(() => chat.id, { onDelete: "cascade" })
      .unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    summary: text("summary").notNull(),
    lastMessageId: text("last_message_id").references(() => message.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("chat_summary_chatId_idx").on(table.chatId),
    index("chat_summary_userId_idx").on(table.userId),
  ],
);

export const memoryItem = pgTable(
  "memory_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => project.id, { onDelete: "cascade" }),
    sourceChatId: text("source_chat_id").references(() => chat.id, { onDelete: "cascade" }),
    sourceMessageId: text("source_message_id").references(() => message.id, {
      onDelete: "set null",
    }),
    memoryKey: text("memory_key").notNull(),
    memoryType: memoryItemTypeEnum("memory_type").notNull(),
    content: text("content").notNull(),
    importance: doublePrecision("importance").notNull().default(0.5),
    embedding: vector("embedding", { dimensions: 1536 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("memory_item_userId_idx").on(table.userId),
    index("memory_item_projectId_idx").on(table.projectId),
    index("memory_item_sourceChatId_idx").on(table.sourceChatId),
    index("memory_item_user_key_idx").on(table.userId, table.memoryKey),
    index("memory_item_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
    index("memory_item_content_trgm_idx").using("gin", table.content.op("gin_trgm_ops")),
  ],
);

export const memoryJob = pgTable(
  "memory_job",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: memoryJobTypeEnum("type").notNull(),
    status: memoryJobStatusEnum("status").notNull().default("pending"),
    chatId: text("chat_id").references(() => chat.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => project.id, { onDelete: "cascade" }),
    fileId: text("file_id"),
    dedupeKey: text("dedupe_key").notNull(),
    attempts: integer("attempts").notNull().default(0),
    leaseUntil: timestamp("lease_until"),
    error: text("error"),
    payload: text("payload"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("memory_job_dedupeKey_idx").on(table.dedupeKey),
    index("memory_job_status_lease_idx").on(table.status, table.leaseUntil),
    index("memory_job_userId_idx").on(table.userId),
    index("memory_job_chatId_idx").on(table.chatId),
    index("memory_job_projectId_idx").on(table.projectId),
  ],
);

export const chatSummaryRelations = relations(chatSummary, ({ one }) => ({
  chat: one(chat, {
    fields: [chatSummary.chatId],
    references: [chat.id],
  }),
  user: one(user, {
    fields: [chatSummary.userId],
    references: [user.id],
  }),
}));

export const memoryItemRelations = relations(memoryItem, ({ one }) => ({
  user: one(user, {
    fields: [memoryItem.userId],
    references: [user.id],
  }),
  project: one(project, {
    fields: [memoryItem.projectId],
    references: [project.id],
  }),
  sourceChat: one(chat, {
    fields: [memoryItem.sourceChatId],
    references: [chat.id],
  }),
}));

export const memoryJobRelations = relations(memoryJob, ({ one }) => ({
  user: one(user, {
    fields: [memoryJob.userId],
    references: [user.id],
  }),
  chat: one(chat, {
    fields: [memoryJob.chatId],
    references: [chat.id],
  }),
  project: one(project, {
    fields: [memoryJob.projectId],
    references: [project.id],
  }),
}));
