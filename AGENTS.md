# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project Overview

`chestnut-chat` is an AI chat application built on Better-T-Stack, managed with pnpm and Turborepo. It supports streaming chat, multiple model providers, projects and files, web search, and persistent memory.

- `apps/web`: Nuxt 4/Vue 3 frontend using shadcn-vue, Tailwind CSS v4, Better Auth Vue client, oRPC, TanStack Vue Query, AI SDK Vue, and markstream-vue. Default local dev port is 3011.
- `apps/server`: Node/Hono backend with Better Auth, oRPC/OpenAPI, AI SDK streaming and uploads, and a database-backed memory worker. Default local dev port is 3010, configurable with `PORT`.
- `packages/api`: Shared oRPC routers for chats, projects, and providers, request context, and shared chat/provider/memory utilities.
- `packages/auth`: Better Auth server configuration.
- `packages/db`: Drizzle schemas and migrations for auth, chat, projects, providers, and memory; Neon serverless PostgreSQL database client.
- `packages/env`: Server and Nuxt environment validation.
- `packages/config`: Shared TypeScript config.
- `packages/ui`: CLI-managed shadcn-vue components with compatibility compositions for the existing `B*` API.

The repo uses ESM (`"type": "module"`), strict TypeScript, workspace packages, and catalog dependency versions in `pnpm-workspace.yaml`.

## Common Commands

Use pnpm from the repository root. `package.json` pins pnpm 11.11.0.

- `pnpm install`: Install dependencies.
- `pnpm run dev`: Run all persistent dev tasks through Turbo.
- `pnpm run dev:web`: Run only the Nuxt app.
- `pnpm run dev:server`: Run only the Hono server.
- `pnpm run build`: Build all apps/packages.
- `pnpm run check-types`: Type-check all configured workspaces.
- `pnpm --filter web exec nuxt typecheck`: Type-check the Nuxt frontend explicitly; it currently has no `check-types` script, so the root command does not check it.
- `pnpm run check`: Run Oxlint, then Oxfmt in write mode (may format unrelated files).
- `pnpm run test`: Run the API package's Vitest suite, not all workspace tests.
- `bun test apps/web/tests/theme.test.ts`: Run frontend theme regression tests.
- `pnpm run memory:backfill`: Enqueue extraction jobs for existing standalone chats; writes to the configured database.
- `pnpm run db:push`: Push Drizzle schema changes.
- `pnpm run db:generate`: Generate Drizzle migrations in `packages/db/src/migrations` (does not apply them).
- `pnpm run db:migrate`: Run Drizzle migrations.
- `pnpm run db:studio`: Open Drizzle Studio.

Root formatting/linting is Oxlint plus Oxfmt. Lefthook runs `pnpm oxlint --fix {staged_files}` and `pnpm oxfmt --write {staged_files}` on pre-commit.

## Environment

Server environment is validated in `packages/env/src/server.ts`:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET` with at least 32 characters
- `BETTER_AUTH_URL` and `CORS_ORIGIN` (URLs)
- `NODE_ENV` (defaults to `development`) and `PORT` (defaults to 3010)
- Optional `PROVIDER_ENCRYPTION_SECRET` (at least 32 characters); provider-key encryption falls back to `BETTER_AUTH_SECRET`. Changing the effective secret makes existing stored keys undecryptable without re-encryption.
- Optional `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` and `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` for social login
- Optional `RESEND_API_KEY` and `RESEND_FROM_EMAIL` for email OTP delivery; required for sending OTPs in production
- Optional `DEEPSEEK_API_KEY` and `OPENROUTER_API_KEY`
- Optional `MEMORY_CHAT_BASE_URL`, `MEMORY_CHAT_API_KEY`, `MEMORY_CHAT_MODEL` and `MEMORY_EMBEDDING_BASE_URL`, `MEMORY_EMBEDDING_API_KEY`, `MEMORY_EMBEDDING_MODEL`; each model configuration needs all three values

Nuxt public environment is validated in `packages/env/src/web.ts`:

- `NUXT_PUBLIC_SERVER_URL` is optional; when unset, browser API calls are same-origin.

`NUXT_SERVER_URL` is a Nuxt server runtime override for SSR fetches and the API proxy, not a public browser setting. `apps/web/server/middleware/api-proxy.ts` forwards `/api`, `/ai`, `/rpc`, and `/api-reference` to it, with a local development fallback to port 3010. Production needs an explicit proxy target or reverse-proxy routing for same-origin API calls.

Drizzle config loads environment from `apps/server/.env`. Do not commit `.env` files. Use `SKIP_ENV_VALIDATION=1` only for tooling situations where validation would block non-runtime work.

## Monorepo Conventions

- Prefer workspace imports such as `@chestnut-chat/api`, `@chestnut-chat/auth`, `@chestnut-chat/db`, and `@chestnut-chat/env`.
- Keep reusable API, auth, database, and env logic in packages rather than duplicating it inside apps.
- Add new packages under `packages/*` and new apps under `apps/*`; both are already included in `pnpm-workspace.yaml`.
- Keep package exports aligned with existing `package.json` patterns before importing package internals from another workspace.
- Do not edit generated/build output, `.turbo`, `node_modules`, or lockfile content by hand.

## Frontend Guidelines

- Build app UI in `apps/web/app` with Vue single-file components and Nuxt conventions.
- Use Composition API with `<script setup lang="ts">`. English and Chinese translations live in `apps/web/i18n/locales`; use `useI18n()`/`$t` for user-facing text.
- Prefer shadcn-vue components from `@chestnut-chat/ui/components/ui/*` over custom controls. Add components with the shadcn-vue CLI from `packages/ui`; preserve existing `B*` contracts when modifying compatibility compositions.
- Use semantic Tailwind tokens (`bg-background`, `text-foreground`, `border-border`). Theme presets from tweakcn live in `apps/web/app/utils/themes`; `useThemePreferences` persists them in a cookie, and `app.vue` applies their CSS variables during SSR.
- Global CSS is intentionally minimal in `apps/web/app/assets/css/main.css`; prefer component-level Tailwind classes. Use `useColorMode()` for light/dark/system mode.
- Use the provided plugins:
  - `$authClient` from `apps/web/app/plugins/auth-client.ts`
  - `$orpc` from `apps/web/app/plugins/orpc.ts`
  - TanStack Query setup from `apps/web/app/plugins/vue-query.ts`
- Protected chat, project, and settings pages use `definePageMeta({ layout: "dashboard", middleware: ["auth"] })`. The home page is public and opens the login modal when authentication is needed.
- Keep auth redirects in `apps/web/app/middleware/auth.ts` and shared session state in `useAuthSession`; use the existing login modal, OTP, and sign-out composables rather than duplicating session handling.
- For API calls from Vue, prefer `$orpc.<route>.queryOptions()` with TanStack Vue Query instead of ad hoc fetch calls.
- Streaming chat uses AI SDK Vue in `components/chat/Workspace.vue`; markdown rendering lives in `components/chat/Markdown.vue` with markstream-vue and Shiki. Keep renderer CSS imports in `assets/css/main.css` in their existing order.

## Backend and API Guidelines

- Hono server entrypoint is `apps/server/src/index.ts`.
- Preserve the current route ownership:
  - Better Auth: `/api/auth/*`
  - Auth provider availability: `/api/auth-options`
  - AI chat streaming: `/ai/chat`
  - Chat attachments: `/ai/attachments`
  - Project file uploads: `/ai/projects/:projectId/files`
  - oRPC RPC handler: `/rpc`
  - OpenAPI reference handler: `/api-reference`
  - Health text endpoint: `/`
- Extend the existing `chat.ts`, `project.ts`, and `providers.ts` routers under `packages/api/src/routers`; compose routers in `index.ts`.
- Use `publicProcedure` for unauthenticated routes and `protectedProcedure` for routes requiring `context.session.user`.
- Request context is created in `packages/api/src/context.ts`; extend it there when procedures need new shared request state.
- Keep CORS behavior tied to `env.CORS_ORIGIN` and include credentials when the browser must send auth cookies.
- AI handlers live in `apps/server/src/ai`, outside oRPC. Preserve session and resource-ownership checks on chat, upload, and provider operations; never expose decrypted provider keys or raw upstream streaming errors to clients.

## Memory Guidelines

- Runtime context building, retrieval, extraction, summarization, file indexing, and job processing live in `apps/server/src/memory`. Shared namespace, chunking, filtering, ranking, budget, and retry rules live in `packages/api/src/memory`.
- The Hono server starts the memory worker after listening. Jobs are persisted in Postgres with deduplication, leases, and retries; preserve these contracts when changing queue behavior.
- Use `resolveMemoryNamespace` for global versus project-scoped memory, and retain user/project isolation in retrieval and writes.
- Embeddings must have 1536 dimensions, matching `schema/memory.ts` and the assertion in `apps/server/src/memory/models.ts`.

## Auth Guidelines

- Better Auth server config lives in `packages/auth/src/index.ts`.
- The Drizzle adapter uses the schema from `packages/db/src/schema/auth.ts`; keep Better Auth table changes in sync with Better Auth requirements.
- Email/password and email OTP auth are enabled; GitHub and Google are enabled only when their credential pairs are present. The Vue client uses `emailOTPClient()`.
- OTP delivery uses Resend; without Resend configuration, non-production OTPs are logged by the server. Treat those logs as sensitive.
- Trusted origins, base URL, and secret come from validated server env.
- Cookie attributes are configured in `advanced.defaultCookieAttributes` (`sameSite: "lax"`, `secure: true`, `httpOnly: true`). Cross-subdomain cookies for `bobbylin.top` are enabled only in production. Preserve the distinction between separate-origin local configuration and same-origin orb proxying when changing auth behavior.

## Database Guidelines

- Database access is centralized in `packages/db/src/index.ts`.
- The project uses Neon serverless Postgres via `@neondatabase/serverless` and `drizzle-orm/neon-http`.
- Schema exports are rooted at `packages/db/src/schema/index.ts`.
- Add application tables beside the existing schema files and export them through `schema/index.ts`.
- Prefer Drizzle schema and query APIs over raw SQL unless there is a clear need.
- Use root database scripts (`pnpm run db:*`) so Turbo targets the `@chestnut-chat/db` package consistently.
- `db:push` and `db:migrate` first enable `vector` and `pg_trgm` through `src/ensure-extensions.ts`. Both modify the configured database; do not run them against shared/production databases without explicit authorization.
- Migration files and metadata live in `packages/db/src/migrations`; generate them with Drizzle rather than editing generated snapshots by hand.

## Code Style

- Follow strict TypeScript from `packages/config/tsconfig.base.json`.
- Avoid unused locals/parameters; TypeScript is configured to reject them.
- Prefer explicit type imports where the existing code does.
- Keep ESM syntax and avoid CommonJS.
- Let Oxfmt handle formatting. Do not introduce a second formatter.
- Keep comments rare and useful; prefer readable names and small functions.

## Verification

For code changes, run the narrowest useful checks first, then broaden when needed.

- Frontend or shared UI changes: render and inspect the affected states, run `pnpm --filter web exec nuxt typecheck` plus `pnpm run check-types`, and run theme tests when changing appearance preferences.
- Server/API changes: run relevant endpoint checks and `pnpm run test`, then `pnpm run check-types`. API tests live alongside source files as `*.test.ts` and run in Vitest's Node environment.
- Database schema changes: generate and review migrations, and report any remaining apply step. Do not treat a shared database push/migration or memory backfill as a routine verification command.
- For non-mutating lint/format checks, use `pnpm exec oxlint` and `pnpm exec oxfmt --check <changed-files>`. Use `pnpm exec oxfmt --write <changed-files>` to format only the files you changed.

## Local Agent and Tooling Notes

- Local skills live under `.agents/skills`; use the relevant available skill for the task. The application UI uses shadcn-vue, not BoardUI or Nuxt UI.
- `.vscode/settings.json` disables Biome and uses OXC/Oxfmt formatting on save.
- In Amp orbs, `.agents/setup` installs dependencies and creates a placeholder `apps/server/.env` only if missing. Real environment values take precedence; placeholders do not provide a usable database.
- `.amp/services.yaml` declares supervised `server` and `web` services. Use `amp orb services ensure` to start them and obtain public portal URLs rather than starting unmanaged background dev servers. Share the returned portal URL, not a sandbox-local URL.
- Browser API traffic goes through the web portal's same-origin proxy; the web service receives the server portal URL as `NUXT_SERVER_URL`. There is no local Postgres service.

## Current Repo Notes

- The README is the user-facing quickstart; keep AGENTS.md focused on operational guidance for coding agents.
- There is currently no `/ui-test` page despite the README mentioning it; use existing app pages for visual checks.
