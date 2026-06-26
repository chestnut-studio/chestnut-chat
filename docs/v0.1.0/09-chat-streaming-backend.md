# 09 - Streaming backend: DeepSeek via Vercel AI SDK + persistence

## Goal

Add a `POST /ai/chat` endpoint on the Hono server that streams a DeepSeek
response (with optional reasoning) back to the AI SDK `Chat` client, and
persists the user message and the assistant message to the database.

## Prerequisites

- `01-db-schema-chat.md` (the `message` table).
- `02-api-chat-routers.md` (ownership pattern reference).
- `08-chat-box.md` (the client posts to this endpoint).

## Context & files

Read first:

- `apps/server/src/index.ts` - the Hono app. Note the ordering: a catch-all
  `app.use("/*", ...)` handles oRPC + OpenAPI then calls `next()`. You must
  register `POST /ai/chat` **before** that catch-all middleware.
- `packages/api/src/context.ts` - shows how a session is fetched:
  `auth.api.getSession({ headers: context.req.raw.headers })`.
- `packages/db/src/schema/chat.ts` - `chat` + `message` tables.
- `apps/server/.env` - where `DEEPSEEK_API_KEY` goes (gitignored).

Files you will install / create / edit:

- Install `ai`, `@ai-sdk/deepseek` in `apps/server`.
- **Edit** `packages/env/src/server.ts` (add `DEEPSEEK_API_KEY`).
- **Create** `apps/server/src/ai/chat.ts` (the handler).
- **Edit** `apps/server/src/index.ts` (register the route).
- **Edit** `apps/server/.env`.

## Background knowledge

- The client sends `{ messages, chatId, model, reasoning, webSearch }` as JSON.
  `messages` is an array of AI SDK **UI messages** (each `{ id, role, parts }`).
- Convert UI messages to model messages with `convertToModelMessages(messages)`
  before passing to `streamText`.
- **DeepSeek provider**: `import { deepseek } from "@ai-sdk/deepseek"`. It reads
  `DEEPSEEK_API_KEY` from the environment automatically. Models:
  - `deepseek-chat` (no reasoning)
  - `deepseek-reasoner` (reasoning; streams a thinking/`reasoning` part)
- **Reasoning**: if the request asks for reasoning, use the `deepseek-reasoner`
  model. You can additionally pass
  `providerOptions: { deepseek: { thinking: { type: "enabled" } } }`.
- **Streaming back to the UI**: `streamText(...).toUIMessageStreamResponse()`
  returns a `Response` whose body is the UI message stream the client `Chat`
  understands. It also accepts `{ originalMessages, onFinish }` so you can
  persist the final messages.
- **Auth**: validate the session from request headers. If there is no user,
  return `401`. Also verify the `chatId` belongs to that user before saving.
- **CORS**: the existing `cors(...)` middleware covers `/*` and already allows
  `POST` with `credentials: true`, so `/ai/chat` is covered. Do not change CORS.
- **web search** is ignored on the server in v0.1.0 (the flag is accepted but
  unused). Leave a clear TODO.

## Steps

### 1. Install server deps

```bash
pnpm add ai @ai-sdk/deepseek --filter server
```

### 2. Add the env var (`packages/env/src/server.ts`)

```ts
server: {
  // ...existing fields...
  DEEPSEEK_API_KEY: z.string().min(1),
},
```

Add to `apps/server/.env`:

```env
DEEPSEEK_API_KEY=sk-your-deepseek-key
```

> If you do not yet have a key, you can keep the field optional
> (`z.string().optional()`) so the server still boots, but the endpoint will
> fail until a key is set. Prefer required once you have a key.

### 3. The handler `apps/server/src/ai/chat.ts`

```ts
import { db } from "@chestnut-chat/db";
import { chat, message } from "@chestnut-chat/db/schema/chat";
import { auth } from "@chestnut-chat/auth";
import { deepseek } from "@ai-sdk/deepseek";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";

type ChatRequestBody = {
  messages: UIMessage[];
  chatId: string;
  model?: string;
  reasoning?: boolean;
  webSearch?: boolean;
};

export async function handleAiChat(c: Context): Promise<Response> {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = (await c.req.json()) as ChatRequestBody;
  const { messages, chatId, reasoning, webSearch } = body;

  // Ownership check.
  const [owned] = await db
    .select({ id: chat.id })
    .from(chat)
    .where(and(eq(chat.id, chatId), eq(chat.userId, session.user.id)));
  if (!owned) {
    return c.json({ error: "Chat not found" }, 404);
  }

  // webSearch is accepted but unused in v0.1.0.
  // TODO(v0.2.0): wire a provider web-search tool when enabled.
  void webSearch;

  const modelId = reasoning ? "deepseek-reasoner" : (body.model ?? "deepseek-chat");

  // Persist the newest user message (last item in the incoming list).
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (lastUser) {
    await db.insert(message).values({
      chatId,
      role: "user",
      parts: lastUser.parts as never,
    });
  }

  const result = streamText({
    model: deepseek(modelId),
    messages: await convertToModelMessages(messages),
    providerOptions: reasoning ? { deepseek: { thinking: { type: "enabled" } } } : undefined,
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    onFinish: async ({ responseMessage }) => {
      if (responseMessage) {
        await db.insert(message).values({
          chatId,
          role: "assistant",
          parts: responseMessage.parts as never,
          model: modelId,
        });
        await db.update(chat).set({ updatedAt: new Date() }).where(eq(chat.id, chatId));
      }
    },
  });
}
```

Notes:

- `parts` is typed loosely with `as never` to satisfy the Drizzle `jsonb`
  `$type` without fighting AI SDK's union types. That is acceptable here.
- If your installed AI SDK version's `onFinish` exposes `messages` instead of
  `responseMessage`, persist the last assistant message from that array
  instead. Verify the callback signature in the installed `ai` package types.
- We insert the user message before streaming and the assistant message on
  finish. Because the client seeds history from the DB on load (doc 08), do not
  double-insert: only the **newest** user message is saved per request.

### 4. Register the route (`apps/server/src/index.ts`)

Import the handler and register it **before** the existing catch-all
`app.use("/*", ...)` block:

```ts
import { handleAiChat } from "./ai/chat";

// ...after `app.on([...], "/api/auth/*", ...)` and before the oRPC catch-all:
app.post("/ai/chat", (c) => handleAiChat(c));
```

Placement matters: the oRPC catch-all `app.use("/*")` runs for every path; by
registering `app.post("/ai/chat")` earlier, Hono matches it first. (If you place
it after, the catch-all's `next()` would still fall through to it, but ordering
it first is clearer and avoids surprises.)

### 5. Confirm streaming works end-to-end

Start both apps and send a message from the UI built in doc 08.

## Acceptance criteria

- [ ] `ai` + `@ai-sdk/deepseek` installed in `apps/server`.
- [ ] `DEEPSEEK_API_KEY` is validated in `packages/env` and present in
      `apps/server/.env`.
- [ ] `POST /ai/chat` validates the session (401 when signed out) and chat
      ownership (404 when the chat is not the user's).
- [ ] Sending a message streams a DeepSeek response token-by-token into the UI.
- [ ] Selecting "DeepSeek Reasoner" (or toggling reasoning) streams a reasoning
      part followed by the answer.
- [ ] The user message and assistant message are saved to the `message` table;
      reloading `/chat/<id>` shows the full prior conversation.
- [ ] `chat.updatedAt` bumps after each exchange (so the sidebar re-sorts).
- [ ] `pnpm run check-types` is clean.

## Verification

```bash
pnpm add ai @ai-sdk/deepseek --filter server
pnpm run check-types
pnpm run dev            # web (3011) + server (3010)
# In the UI: send a message and watch it stream; toggle reasoning; reload to
# confirm persistence. Inspect rows with `pnpm run db:studio`.
```

## Out of scope

- Real web search (flag accepted, unused).
- File/attachment ingestion (DeepSeek text-only here).
- Streaming resume, rate limiting, and per-message token accounting.
