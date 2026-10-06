# chestnut-chat

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines Nuxt, Hono, ORPC, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **Nuxt** - The Intuitive Vue Framework
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn-vue** - Accessible shared UI components with tweakcn theme presets
- **Hono** - Lightweight, performant server framework
- **oRPC** - End-to-end type-safe APIs with OpenAPI integration
- **Node.js** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Better-Auth
- **Turborepo** - Optimized monorepo build system
- **Oxlint** - Oxlint + Oxfmt (linting & formatting)

## Getting Started

First, install the dependencies:

```bash
pnpm install
```

## Database Setup

This project uses PostgreSQL with Drizzle ORM.

1. Make sure you have a PostgreSQL database set up.
2. Update your `apps/server/.env` file with your PostgreSQL connection details.

3. Apply the schema to your database:

```bash
pnpm run db:push
```

Then, run the development server:

```bash
pnpm run dev
```

Open [http://localhost:3011](http://localhost:3011) in your browser to see the web application.
The API is running at [http://localhost:3010](http://localhost:3010).

## Git Hooks and Formatting

- Run checks: `pnpm run check`

## UI and Themes

The shared UI in `packages/ui` uses CLI-managed [shadcn-vue](https://shadcn-vue.com) components.
Existing `B*` exports compose those components to retain application props, slots, and models.
Add components from that package directory with `pnpm dlx shadcn-vue@latest add <component>`.

Settings → Customization offers six [tweakcn](https://tweakcn.com) presets, light/dark/system mode,
and an optional corner-radius override. Selecting a preset restores its own radius. Preferences
are saved in the `chestnut-theme` cookie and applied during server rendering. Old color-only
preferences fall back to Modern Minimal.

The preset snapshots in `apps/web/app/utils/themes` come from tweakcn's official
`https://tweakcn.com/r/themes/<name>.json` registry, retrieved on October 6, 2026, under Apache-2.0
(license included beside the snapshots). Switching themes needs no network request. Font stacks
use installed fonts with the preset's fallbacks; no third-party font service is contacted.
The `/ui-test` route previews the same appearance controls and shared components without signing in.
Run theme regression tests with `bun test apps/web/tests/theme.test.ts`.

## Project Structure

```
chestnut-chat/
├── apps/
│   ├── web/         # Frontend application (Nuxt)
│   └── server/      # Backend API (Hono, ORPC)
├── packages/
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `pnpm run dev`: Start all applications in development mode
- `pnpm run build`: Build all applications
- `pnpm run dev:web`: Start only the web application
- `pnpm run dev:server`: Start only the server
- `pnpm run check-types`: Check TypeScript types across all apps
- `pnpm run db:push`: Push schema changes to database
- `pnpm run db:generate`: Generate database client/types
- `pnpm run db:migrate`: Run database migrations
- `pnpm run db:studio`: Open database studio UI
- `pnpm run check`: Run Oxlint and Oxfmt
