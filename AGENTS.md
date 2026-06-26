# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project Overview

`chestnut-chat` is a Better-T-Stack TypeScript monorepo managed with pnpm and Turborepo.

- `apps/web`: Nuxt 4 frontend using Nuxt UI v4, Tailwind CSS v4, Better Auth Vue client, oRPC client utilities, and TanStack Vue Query. Dev server runs on `http://localhost:3011`.
- `apps/server`: Node/Hono backend. It mounts Better Auth at `/api/auth/*`, serves oRPC at `/rpc`, exposes an OpenAPI reference at `/api-reference`, and listens on `http://localhost:3010`.
- `packages/api`: Shared oRPC router/procedure layer and request context.
- `packages/auth`: Better Auth server configuration.
- `packages/db`: Drizzle schema and Neon serverless PostgreSQL database client.
- `packages/env`: Server and Nuxt environment validation.
- `packages/config`: Shared TypeScript config.

The repo uses ESM (`"type": "module"`), strict TypeScript, workspace packages, and catalog dependency versions in `pnpm-workspace.yaml`.

## Common Commands

Use pnpm from the repository root.

- `pnpm install`: Install dependencies.
- `pnpm run dev`: Run all persistent dev tasks through Turbo.
- `pnpm run dev:web`: Run only the Nuxt app.
- `pnpm run dev:server`: Run only the Hono server.
- `pnpm run build`: Build all apps/packages.
- `pnpm run check-types`: Type-check all configured workspaces.
- `pnpm run check`: Run Oxlint and Oxfmt.
- `pnpm run db:push`: Push Drizzle schema changes.
- `pnpm run db:generate`: Generate Drizzle migrations.
- `pnpm run db:migrate`: Run Drizzle migrations.
- `pnpm run db:studio`: Open Drizzle Studio.

Root formatting/linting is Oxlint plus Oxfmt. Lefthook runs `pnpm oxlint --fix {staged_files}` and `pnpm oxfmt --write {staged_files}` on pre-commit.

## Environment

Server environment is validated in `packages/env/src/server.ts`:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET` with at least 32 characters
- `BETTER_AUTH_URL`
- `CORS_ORIGIN`
- `NODE_ENV`

Nuxt public environment is validated in `packages/env/src/web.ts`:

- `NUXT_PUBLIC_SERVER_URL`

Drizzle config loads environment from `apps/server/.env`. Do not commit `.env` files. Use `SKIP_ENV_VALIDATION=1` only for tooling situations where validation would block non-runtime work.

## Monorepo Conventions

- Prefer workspace imports such as `@chestnut-chat/api`, `@chestnut-chat/auth`, `@chestnut-chat/db`, and `@chestnut-chat/env`.
- Keep reusable API, auth, database, and env logic in packages rather than duplicating it inside apps.
- Add new packages under `packages/*` and new apps under `apps/*`; both are already included in `pnpm-workspace.yaml`.
- Keep package exports aligned with existing `package.json` patterns before importing package internals from another workspace.
- Do not edit generated/build output, `.turbo`, `node_modules`, or lockfile content by hand.

## Frontend Guidelines

- Build app UI in `apps/web/app` with Vue single-file components and Nuxt conventions.
- Prefer Nuxt UI components (`UButton`, `UCard`, `UPageHeader`, `UAuthForm`, etc.) and lucide Iconify names (`i-lucide-*`) over custom controls.
- Theme tokens are configured in `apps/web/app/app.config.ts` with `primary: "emerald"` and `neutral: "neutral"`.
- Global CSS is intentionally minimal in `apps/web/app/assets/css/main.css`; prefer component-level Tailwind/Nuxt UI classes.
- Use the provided plugins:
  - `$authClient` from `apps/web/app/plugins/auth-client.ts`
  - `$orpc` from `apps/web/app/plugins/orpc.ts`
  - TanStack Query setup from `apps/web/app/plugins/vue-query.ts`
- For protected pages, use Nuxt route middleware as `dashboard.vue` does with `definePageMeta({ middleware: ["auth"] })`.
- Keep auth redirects centralized in `apps/web/app/middleware/auth.ts` and login/session handling near the existing login/user-menu components.
- For API calls from Vue, prefer `$orpc.<route>.queryOptions()` with TanStack Vue Query instead of ad hoc fetch calls.

## Backend and API Guidelines

- Hono server entrypoint is `apps/server/src/index.ts`.
- Preserve the current route ownership:
  - Better Auth: `/api/auth/*`
  - oRPC RPC handler: `/rpc`
  - OpenAPI reference handler: `/api-reference`
  - Health text endpoint: `/`
- Add oRPC routes in `packages/api/src/routers/index.ts` or split routers under `packages/api/src/routers` as the API grows.
- Use `publicProcedure` for unauthenticated routes and `protectedProcedure` for routes requiring `context.session.user`.
- Request context is created in `packages/api/src/context.ts`; extend it there when procedures need new shared request state.
- Keep CORS behavior tied to `env.CORS_ORIGIN` and include credentials when the browser must send auth cookies.

## Auth Guidelines

- Better Auth server config lives in `packages/auth/src/index.ts`.
- The Drizzle adapter uses the schema from `packages/db/src/schema/auth.ts`; keep Better Auth table changes in sync with Better Auth requirements.
- Email/password auth is currently enabled.
- Trusted origins, base URL, and secret come from validated server env.
- Cookie attributes are configured in `advanced.defaultCookieAttributes`; be careful when changing `sameSite`, `secure`, or `httpOnly` because the frontend and API run on separate origins in development.

## Database Guidelines

- Database access is centralized in `packages/db/src/index.ts`.
- The project uses Neon serverless Postgres via `@neondatabase/serverless` and `drizzle-orm/neon-http`.
- Schema exports are rooted at `packages/db/src/schema/index.ts`.
- Add application tables beside the existing schema files and export them through `schema/index.ts`.
- Prefer Drizzle schema and query APIs over raw SQL unless there is a clear need.
- Use root database scripts (`pnpm run db:*`) so Turbo targets the `@chestnut-chat/db` package consistently.

## Code Style

- Follow strict TypeScript from `packages/config/tsconfig.base.json`.
- Avoid unused locals/parameters; TypeScript is configured to reject them.
- Prefer explicit type imports where the existing code does.
- Keep ESM syntax and avoid CommonJS.
- Let Oxfmt handle formatting. Do not introduce a second formatter.
- Keep comments rare and useful; prefer readable names and small functions.

## Verification

For code changes, run the narrowest useful checks first, then broaden when needed.

- Frontend or shared UI changes: `pnpm run dev:web` for manual testing, then `pnpm run check-types`.
- Server/API changes: `pnpm run dev:server` or relevant endpoint checks, then `pnpm run check-types`.
- Database schema changes: update Drizzle schema, run the appropriate `pnpm run db:*` command, and mention any migration or push requirement.
- Before handing off larger changes, run `pnpm run check` when practical.

## Local Agent and Tooling Notes

- Local MCP configs exist for Better-T-Stack, Context7, Nuxt, Nuxt UI, Neon, and Better Auth in `.mcp.json`, `.codex/config.toml`, `.cursor/mcp.json`, and `.vscode/mcp.json`.
- Local skills live under `.agents/skills` for Nuxt UI, Hono, Better Auth, Turborepo, and Neon/Postgres. Use them when working deeply in those areas.
- `.vscode/settings.json` disables Biome and uses OXC/Oxfmt formatting on save.

## Current Repo Notes

- `docs/v0.1.0/functions.md` exists but is currently empty.
- The README is the user-facing quickstart; keep AGENTS.md focused on operational guidance for coding agents.
