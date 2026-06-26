# 02 - API: oRPC chat routers

## Goal

Add type-safe oRPC routes so the frontend can: list chats, create a chat,
rename, pin/unpin, archive/unarchive, delete a chat, and list a chat's messages.

## Prerequisites

- `01-db-schema-chat.md` (the `chat` and `message` tables must exist).

## Context & files

Read first (these are the exact patterns to copy):

- `packages/api/src/index.ts` - defines `publicProcedure` and
  `protectedProcedure`. `protectedProcedure` guarantees `context.session.user`.
- `packages/api/src/routers/index.ts` - the root router (`appRouter`). It also
  exports `AppRouter` and `AppRouterClient` types used by the web client.
- `packages/api/src/context.ts` - request context shape (`{ auth, session }`).

Files you will create / edit:

- **Create** `packages/api/src/routers/chat.ts`
- **Edit** `packages/api/src/routers/index.ts` (mount the new router)

## Background knowledge

- **oRPC procedure shape**: `protectedProcedure.input(zodSchema).handler(({ input, context }) => { ... })`.
  - `.input(...)` validates the request with a zod schema.
  - `context.session.user.id` is the logged-in user id (always present on
    `protectedProcedure`).
- **All chat routes are `protectedProcedure`** because chats belong to a user.
- **Ownership**: every query/mutation must filter by `userId = context.session.user.id`
  so a user can never read or mutate another user's chats. Use Drizzle's
  `and(eq(chat.id, input.id), eq(chat.userId, userId))`.
- **Importing the db and tables**:
  - `import { db } from "@chestnut-chat/db";`
  - `import { chat, message } from "@chestnut-chat/db/schema/chat";`
  - Drizzle operators: `import { and, asc, desc, eq } from "drizzle-orm";`
- **Routers nest as plain objects**. We mount the chat router under a `chat`
  key in `appRouter`, so the client calls become `$orpc.chat.list`,
  `$orpc.chat.create`, etc.
- `zod` is already a dependency (`import { z } from "zod"`).

## Steps

### 1. Create `packages/api/src/routers/chat.ts`

```ts
import { db } from "@chestnut-chat/db";
import { chat, message } from "@chestnut-chat/db/schema/chat";
import { ORPCError } from "@orpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";

async function assertOwnedChat(chatId: string, userId: string) {
  const [row] = await db
    .select({ id: chat.id })
    .from(chat)
    .where(and(eq(chat.id, chatId), eq(chat.userId, userId)));
  if (!row) {
    throw new ORPCError("NOT_FOUND", { message: "Chat not found" });
  }
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
      return row;
    }),

  rename: protectedProcedure
    .input(z.object({ id: z.string(), title: z.string().min(1).max(200) }))
    .handler(async ({ input, context }) => {
      await assertOwnedChat(input.id, context.session.user.id);
      const [row] = await db
        .update(chat)
        .set({ title: input.title })
        .where(eq(chat.id, input.id))
        .returning();
      return row;
    }),

  setPinned: protectedProcedure
    .input(z.object({ id: z.string(), pinned: z.boolean() }))
    .handler(async ({ input, context }) => {
      await assertOwnedChat(input.id, context.session.user.id);
      const [row] = await db
        .update(chat)
        .set({ pinned: input.pinned })
        .where(eq(chat.id, input.id))
        .returning();
      return row;
    }),

  setArchived: protectedProcedure
    .input(z.object({ id: z.string(), archived: z.boolean() }))
    .handler(async ({ input, context }) => {
      await assertOwnedChat(input.id, context.session.user.id);
      const [row] = await db
        .update(chat)
        .set({ archived: input.archived })
        .where(eq(chat.id, input.id))
        .returning();
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      await assertOwnedChat(input.id, context.session.user.id);
      await db.delete(chat).where(eq(chat.id, input.id));
      return { id: input.id };
    }),

  messages: protectedProcedure
    .input(z.object({ chatId: z.string() }))
    .handler(async ({ input, context }) => {
      await assertOwnedChat(input.chatId, context.session.user.id);
      return db
        .select()
        .from(message)
        .where(eq(message.chatId, input.chatId))
        .orderBy(asc(message.createdAt));
    }),
};
```

Notes:

- `list` returns pinned chats first, then most-recently-updated. Archived chats
  are still returned; the sidebar (doc 05) decides how to display them.
- `delete` relies on the `onDelete: "cascade"` from doc 01 to remove messages.
- `ORPCError("NOT_FOUND")` / `ORPCError("UNAUTHORIZED")` are the standard way to
  signal errors; the client surfaces `error.message`.

### 2. Mount the router in `packages/api/src/routers/index.ts`

Edit the file to import and spread/attach the chat router:

```ts
import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { chatRouter } from "./chat";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  privateData: protectedProcedure.handler(({ context }) => {
    return {
      message: "This is private",
      user: context.session?.user,
    };
  }),
  chat: chatRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
```

## How the frontend will call these (for later docs - reference only)

```ts
const { $orpc } = useNuxtApp();
const chats = useQuery($orpc.chat.list.queryOptions());

const createChat = useMutation($orpc.chat.create.mutationOptions());
await createChat.mutateAsync({ title: "New Chat" });
```

## Acceptance criteria

- [ ] `packages/api/src/routers/chat.ts` exports `chatRouter` with `list`,
      `create`, `rename`, `setPinned`, `setArchived`, `delete`, `messages`.
- [ ] Every route is `protectedProcedure` and filters by the session user id.
- [ ] `appRouter` includes `chat: chatRouter`; `AppRouter`/`AppRouterClient`
      still exported.
- [ ] `pnpm run check-types` is clean.
- [ ] (Manual) With the server running, the routes appear in the OpenAPI
      reference at `http://localhost:3010/api-reference`.

## Verification

```bash
pnpm run check-types
pnpm run dev:server
# Visit http://localhost:3010/api-reference and confirm chat.* routes exist.
```

## Out of scope

- No message **writing** route here. Assistant + user messages are persisted by
  the streaming endpoint in doc 09.
- No pagination/search on the server; history search is client-side in doc 05.
