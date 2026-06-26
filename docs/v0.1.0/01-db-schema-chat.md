# 01 - Database schema: `chat` and `message`

## Goal

Add two Drizzle tables, `chat` and `message`, plus their relations, and export
them so the rest of the app can store conversations and messages.

## Prerequisites

- None. This is the first build task. Read `00-overview.md` first.

## Context & files

Read these before editing (they are the patterns to copy):

- `packages/db/src/schema/auth.ts` - existing table style (`pgTable`, `text`,
  `timestamp`, `boolean`, `index`, `relations`). Copy this style exactly.
- `packages/db/src/schema/index.ts` - currently `export * from "./auth";`.
- `packages/db/src/index.ts` - `createDb()` reads `import * as schema from "./schema"`.

Files you will create / edit:

- **Create** `packages/db/src/schema/chat.ts`
- **Edit** `packages/db/src/schema/index.ts` (add one export line)

## Background knowledge

- This project uses **Drizzle ORM** with **Neon serverless Postgres**. Tables
  are declared with `pgTable`. The `user` table already exists in `auth.ts`
  with a `text("id")` primary key.
- A chat belongs to a user. A message belongs to a chat. We use
  `onDelete: "cascade"` so deleting a user removes their chats, and deleting a
  chat removes its messages.
- We store message content as **`jsonb`** holding the Vercel AI SDK "UI message
  parts" array. This is forward-compatible with reasoning blocks, tool calls,
  and attachments. You do not need to understand AI SDK parts now; just store
  whatever the streaming endpoint (doc 09) gives us. The shape is roughly
  `Array<{ type: string; text?: string; ... }>`.
- IDs: generate a UUID by default with Drizzle's `$defaultFn`. Use the global
  `crypto.randomUUID()` (available in Node 22+ and the browser).

## Steps

### 1. Create `packages/db/src/schema/chat.ts`

```ts
import { relations } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const chat = pgTable(
  "chat",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("New Chat"),
    pinned: boolean("pinned").default(false).notNull(),
    archived: boolean("archived").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("chat_userId_idx").on(table.userId)],
);

export type MessagePart = {
  type: string;
  text?: string;
  [key: string]: unknown;
};

export const message = pgTable(
  "message",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    chatId: text("chat_id")
      .notNull()
      .references(() => chat.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    parts: jsonb("parts").$type<MessagePart[]>().notNull(),
    model: text("model"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("message_chatId_idx").on(table.chatId)],
);

export const chatRelations = relations(chat, ({ one, many }) => ({
  user: one(user, {
    fields: [chat.userId],
    references: [user.id],
  }),
  messages: many(message),
}));

export const messageRelations = relations(message, ({ one }) => ({
  chat: one(chat, {
    fields: [message.chatId],
    references: [chat.id],
  }),
}));
```

Notes:

- `role` is a free-text string but only ever `"user"`, `"assistant"`, or
  `"system"`. We keep it as `text` (not a pg enum) to avoid migration friction.
- `model` records which model produced an assistant message (nullable for user
  messages). Useful later, harmless now.

### 2. Export the new schema

Edit `packages/db/src/schema/index.ts`:

```ts
export * from "./auth";
export * from "./chat";
```

### 3. Push the schema to the database

From the repo root:

```bash
pnpm run db:push
```

This applies the new tables. If `db:push` cannot connect, confirm
`apps/server/.env` has a valid `DATABASE_URL` (this is the Neon connection
string). Do not invent a value; if it is missing, stop and report it.

## Acceptance criteria

- [ ] `packages/db/src/schema/chat.ts` exists with `chat` and `message` tables
      and both relations.
- [ ] `packages/db/src/schema/index.ts` re-exports `./chat`.
- [ ] `pnpm run db:push` succeeds and the `chat` and `message` tables exist
      (verify with `pnpm run db:studio`).
- [ ] `pnpm run check-types` is clean.

## Verification

```bash
pnpm run db:push
pnpm run check-types
pnpm run db:studio   # confirm "chat" and "message" tables exist, then close
```

## Out of scope

- No oRPC routes here (that is doc 02).
- No message-writing logic (doc 09 writes messages from the streaming endpoint).
- Do not add attachment or file tables; file attach is UI-only in v0.1.0.
