# 03 - Auth: GitHub, Google, and Email OTP

## Goal

Extend Better Auth so users can sign in with **GitHub**, **Google**, and
**Email + OTP** (one-time code), in addition to the existing email/password.

## Prerequisites

- None strictly, but read `00-overview.md`. This pairs with the login modal in
  doc 06 (which builds the buttons that call these methods).

## Context & files

Read first:

- `packages/auth/src/index.ts` - Better Auth server config (`createAuth`).
  Currently only `emailAndPassword: { enabled: true }`.
- `packages/env/src/server.ts` - server env validation (zod). You will add
  provider credentials here.
- `apps/web/app/plugins/auth-client.ts` - the Vue auth client. You will add
  client plugins here.
- `packages/db/src/schema/auth.ts` - the `account` and `verification` tables
  already exist and support social + OTP. **No schema change is needed.**

Files you will edit:

- `packages/env/src/server.ts`
- `packages/auth/src/index.ts`
- `apps/web/app/plugins/auth-client.ts`
- `apps/server/.env` (add credentials; gitignored, do not commit)

## Background knowledge

- **Better Auth** social login is configured with a `socialProviders` object on
  the server. Each provider needs a client id + secret from the provider's
  developer console.
- **Email OTP** is a Better Auth **plugin** (`emailOTP` from
  `better-auth/plugins`). It needs a `sendVerificationOTP` callback that
  delivers the code. **We do not have a mail provider in v0.1.0**, so we log the
  OTP to the server console (clearly marked) and leave a TODO. This is enough to
  develop and test the full flow locally.
- The **client** needs matching plugins. The email-OTP client plugin is
  `emailOTPClient` from `better-auth/client/plugins`. Social sign-in does not
  need a client plugin; you call `authClient.signIn.social({ provider })`.
- OAuth callback URLs: Better Auth handles `/api/auth/callback/<provider>` on
  the server (base URL = `BETTER_AUTH_URL`, currently the server on port 3010).
  When you register the OAuth apps, set the callback to
  `http://localhost:3010/api/auth/callback/github` and
  `.../callback/google` for local dev.

## Steps

### 1. Add env vars (`packages/env/src/server.ts`)

Add the four provider fields. Make them **optional** so the app still boots
without OAuth configured (social buttons simply will not work until set):

```ts
export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.url(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
  },
  runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
```

Then add to `apps/server/.env` (use your real OAuth app credentials; leave
blank until you have them):

```env
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### 2. Install the OTP plugin dependency

`emailOTP` ships inside `better-auth`, which is already installed - no new
dependency is required. Just import it.

### 3. Configure the server (`packages/auth/src/index.ts`)

Add `socialProviders` and the `emailOTP` plugin. Only register a social
provider when its credentials are present, so missing env does not crash boot:

```ts
import { createDb } from "@chestnut-chat/db";
import * as schema from "@chestnut-chat/db/schema/auth";
import { env } from "@chestnut-chat/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";

export function createAuth() {
  const db = createDb();

  const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    socialProviders.github = {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    };
  }
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    socialProviders.google = {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    };
  }

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: schema,
    }),
    trustedOrigins: [env.CORS_ORIGIN],
    emailAndPassword: {
      enabled: true,
    },
    socialProviders,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
        httpOnly: true,
      },
    },
    plugins: [
      emailOTP({
        async sendVerificationOTP({ email, otp, type }) {
          // TODO(v0.2.0): send via a real email provider.
          // For local dev we log the OTP so the flow is testable.
          console.log(`[email-otp] type=${type} email=${email} otp=${otp}`);
        },
      }),
    ],
  });
}

export const auth = createAuth();
```

### 4. Configure the client (`apps/web/app/plugins/auth-client.ts`)

Add the matching `emailOTPClient` plugin so `$authClient.emailOtp.*` methods
exist:

```ts
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/vue";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();

  const authClient = createAuthClient({
    baseURL: (import.meta.server && config.serverUrl) || config.public.serverUrl,
    plugins: [emailOTPClient()],
  });

  return {
    provide: {
      authClient: authClient,
    },
  };
});
```

### 5. Client method reference (used by the login modal in doc 06)

These are the calls the UI will make. Document them here so doc 06 can wire
buttons without guessing the API:

```ts
const { $authClient } = useNuxtApp();

// Social
await $authClient.signIn.social({ provider: "github", callbackURL: "/dashboard" });
await $authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" });

// Email OTP - two steps:
// 1) request a code (type "sign-in" creates the user if needed)
await $authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
// 2) verify the code to sign in
await $authClient.signIn.emailOtp({ email, otp });
```

## Acceptance criteria

- [ ] `packages/env/src/server.ts` includes optional GitHub/Google credentials.
- [ ] `packages/auth/src/index.ts` registers `socialProviders` (conditionally)
      and the `emailOTP` plugin with a working `sendVerificationOTP` (logs OTP).
- [ ] `apps/web/app/plugins/auth-client.ts` registers `emailOTPClient()`.
- [ ] Server boots with empty OAuth credentials (no crash).
- [ ] `pnpm run check-types` is clean.
- [ ] (Manual, optional) With OAuth creds set, GitHub/Google sign-in completes
      and redirects to `/dashboard`.
- [ ] (Manual) Requesting an OTP logs `[email-otp] ... otp=XXXXXX` in the server
      console, and verifying that code signs the user in.

## Verification

```bash
pnpm run check-types
pnpm run dev:server   # boot must succeed even with blank OAuth creds
# Trigger OTP from the UI (doc 06) or via /api-reference and watch the console.
```

## Out of scope

- No real transactional email provider (logged OTP is acceptable for v0.1.0).
- No account-linking UI or profile editing (profile is read-only in doc 06).
- No schema changes (the existing `account`/`verification` tables suffice).
