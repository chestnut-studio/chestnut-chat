import { relations } from "drizzle-orm";
import { index, integer, pgEnum, pgTable, text, timestamp, vector } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const memoryModeEnum = pgEnum("memory_mode", ["default", "project"]);
export const projectIconKindEnum = pgEnum("project_icon_kind", ["emoji", "lucide"]);
export const projectFileStatusEnum = pgEnum("project_file_status", [
  "pending",
  "indexed",
  "failed",
]);

export const project = pgTable(
  "project",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    iconKind: projectIconKindEnum("icon_kind").notNull().default("emoji"),
    iconValue: text("icon_value").notNull().default("📁"),
    iconColor: text("icon_color").notNull().default("neutral"),
    memoryMode: memoryModeEnum("memory_mode").notNull().default("default"),
    instructions: text("instructions"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("project_userId_idx").on(table.userId)],
);

export const projectFile = pgTable(
  "project_file",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    mediaType: text("media_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    extractedText: text("extracted_text"),
    status: projectFileStatusEnum("status").notNull().default("pending"),
    error: text("error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("project_file_projectId_idx").on(table.projectId),
    index("project_file_userId_idx").on(table.userId),
  ],
);

export const projectFileChunk = pgTable(
  "project_file_chunk",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    fileId: text("file_id")
      .notNull()
      .references(() => projectFile.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("project_file_chunk_fileId_idx").on(table.fileId),
    index("project_file_chunk_projectId_idx").on(table.projectId),
    index("project_file_chunk_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
    index("project_file_chunk_content_trgm_idx").using("gin", table.content.op("gin_trgm_ops")),
  ],
);

export const projectRelations = relations(project, ({ one, many }) => ({
  user: one(user, {
    fields: [project.userId],
    references: [user.id],
  }),
  files: many(projectFile),
}));

export const projectFileRelations = relations(projectFile, ({ one, many }) => ({
  project: one(project, {
    fields: [projectFile.projectId],
    references: [project.id],
  }),
  user: one(user, {
    fields: [projectFile.userId],
    references: [user.id],
  }),
  chunks: many(projectFileChunk),
}));

export const projectFileChunkRelations = relations(projectFileChunk, ({ one }) => ({
  file: one(projectFile, {
    fields: [projectFileChunk.fileId],
    references: [projectFile.id],
  }),
  project: one(project, {
    fields: [projectFileChunk.projectId],
    references: [project.id],
  }),
}));
