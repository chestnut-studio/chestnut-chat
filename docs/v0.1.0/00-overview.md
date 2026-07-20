# v0.1.0 - Execution Plan Overview

> Read this file first. It explains the goal, the tech stack, the rules every
> doc follows, the recommended build order, and how to verify your work.
> Each numbered doc (`01`..`10`) is one self-contained task. Do them in order.

## What we are building

A ChatGPT-style chatbot UI on top of the existing `chestnut-chat` monorepo.
The full feature list is in [`functions.md`](./functions.md). At a high level:

- A **Dashboard page** with a collapsible **Sidebar** (new chat, search, grouped
  chat history with rename/archive/delete/pin, user menu + settings, login).
- A **Chat Section** with a **chat box** (textarea, model picker, reasoning
  toggle, web-search toggle, file attach, submit) and a **message list** that
  renders markdown with copy / regenerate / edit actions.
- LLM responses streamed from **DeepSeek** via the **Vercel AI SDK**.

## Locked technical decisions (do not change these)

| Area            | Decision                                                                 |
| --------------- | ------------------------------------------------------------------------ |
| LLM integration | **Vercel AI SDK** (`ai`, `@ai-sdk/vue`, `@ai-sdk/deepseek`)              |
| Model provider  | **DeepSeek only** for v0.1.0 (`deepseek-chat`, `deepseek-reasoner`)     |
| UI languages    | **`@nuxtjs/i18n`** module (English + Simplified Chinese to start)        |
| Web search      | **UI toggle only** in v0.1.0. Persist the flag, do not call a search API |
| File attach     | **UI only** in v0.1.0. Show selected files, do not upload/store yet      |

## Tech stack (already in the repo)

This is a **pnpm + Turborepo monorepo**, ESM, strict TypeScript.

```
chestnut-chat/
├── apps/
│   ├── web/      # Nuxt 4 + Nuxt UI v4 + Tailwind v4. Dev: http://localhost:3011
│   └── server/   # Hono + oRPC + Better Auth. Dev: http://localhost:3010
├── packages/
│   ├── api/      # oRPC routers + procedures + request context
│   ├── auth/     # Better Auth server config
│   ├── db/       # Drizzle schema + Neon Postgres client
│   ├── env/      # Server + Nuxt env validation (zod)
│   └── config/   # Shared tsconfig
```

Key facts you will rely on constantly:

- Frontend lives in `apps/web/app/` (Nuxt 4 puts source under `app/`).
- Components: `apps/web/app/components/`. Pages: `apps/web/app/pages/`.
  Layouts: `apps/web/app/layouts/`. Plugins: `apps/web/app/plugins/`.
  Middleware: `apps/web/app/middleware/`.
- Two injected plugins are available in any component via `useNuxtApp()`:
  - `$authClient` - Better Auth Vue client (`apps/web/app/plugins/auth-client.ts`)
  - `$orpc` - oRPC + TanStack Query utils (`apps/web/app/plugins/orpc.ts`)
- API routes are oRPC procedures in `packages/api/src/routers/`. They are
  consumed from Vue with `$orpc.<route>.queryOptions()` /
  `$orpc.<route>.mutationOptions()` + TanStack Vue Query.
- The Hono server entry is `apps/server/src/index.ts`. It already mounts:
  - Better Auth at `/api/auth/*`
  - oRPC RPC at `/rpc`
  - OpenAPI reference at `/api-reference`
- Database access: `import { db } from "@chestnut-chat/db"`. Schema tables are
  exported from `packages/db/src/schema/index.ts`.
- Theme is `primary: emerald`, `neutral: neutral` (see
  `apps/web/app/app.config.ts`). Use lucide icons named `i-lucide-*`.

> If anything in the repo contradicts this overview, the **repo wins**. Read the
> real file before editing. Do not invent file paths.

## The template every task doc follows

Each doc has these sections. Read them top to bottom before writing code:

1. **Goal** - one sentence on what this doc delivers.
2. **Prerequisites** - which docs must be done first.
3. **Context & files** - exact files to read and create/edit.
4. **Background knowledge** - the concepts you need (so you do not guess).
5. **Steps** - numbered, concrete edits with code.
6. **Acceptance criteria** - a checklist; the task is done when all pass.
7. **Verification** - exact commands to run.
8. **Out of scope** - what NOT to build here.

## Recommended build order

Build bottom-up: data first, then API, then UI. Each doc lists its own
prerequisites, but the happy path is simply 01 -> 10.

1. `01-db-schema-chat.md` - `chat` + `message` tables.
2. `02-api-chat-routers.md` - oRPC routes for chat CRUD + message reads.
3. `03-auth-providers.md` - GitHub, Google, Email OTP sign-in.
4. `04-dashboard-shell.md` - dashboard layout: collapsible sidebar + chat panel.
5. `05-sidebar-history.md` - new chat, search, grouped history, item actions.
6. `06-user-and-auth-ui.md` - user menu, settings modal, login modal.
7. `07-i18n.md` - `@nuxtjs/i18n` + language switcher used by the settings modal.
8. `08-chat-box.md` - the composer (textarea, model, reasoning, web, attach).
9. `09-chat-streaming-backend.md` - DeepSeek streaming endpoint + persistence.
10. `10-chat-messages-ui.md` - markdown render + message actions.

## Global rules for the implementing agent

- **Match existing style.** Before writing a component, open a sibling file
  (e.g. `apps/web/app/components/UserMenu.vue`) and copy its conventions:
  `<script setup lang="ts">`, `useNuxtApp()`, `toast` from `vue-sonner`, Nuxt
  UI `U*` components, lucide icons.
- **Prefer Nuxt UI components** (`UButton`, `UInput`, `UModal`, `UDropdownMenu`,
  `UDashboardSidebar`, etc.) over hand-rolled HTML/CSS.
- **Use the catalog / workspace versions.** Add deps with
  `pnpm add <pkg> --filter <workspace>`; do not hand-edit the lockfile.
- **Keep packages reusable.** API/db/auth logic belongs in `packages/*`, not
  inside `apps/*`.
- **Do not commit secrets.** New env vars go through `packages/env` and the
  per-app `.env` files (which are gitignored).
- **Comments are rare.** Use clear names; only comment non-obvious intent.
- **No new formatter/linter.** Formatting is Oxfmt; linting is Oxlint.

## How to verify any change

Run the narrowest useful check first, then broaden:

```bash
# Type-check everything (run after most changes)
pnpm run check-types

# Lint + format
pnpm run check

# Manual run
pnpm run dev:web      # Nuxt app on http://localhost:3011
pnpm run dev:server   # Hono API on http://localhost:3010
pnpm run dev          # both

# Database (only after schema changes)
pnpm run db:push      # apply schema to the database
pnpm run db:studio    # inspect tables
```

A task is **Done** only when:

- Its acceptance criteria checklist passes.
- `pnpm run check-types` is clean.
- `pnpm run check` is clean.
- The feature works when run manually (where applicable).

## Environment variables added across v0.1.0

You will add these as you go (each doc says when). Keep `packages/env` and the
relevant `.env` in sync:

- Server (`apps/server/.env`, validated in `packages/env/src/server.ts`):
  - `DEEPSEEK_API_KEY` (doc 09)
  - `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` (doc 03)
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (doc 03)
- Web (`apps/web/.env`): no new public vars required for v0.1.0.

> Tip for env work: you may temporarily set `SKIP_ENV_VALIDATION=1` for tooling
> commands that should not require runtime secrets (e.g. type-checks). Never
> ship that in normal runtime.
