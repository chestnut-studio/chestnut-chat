import { createEnv } from "@t3-oss/env-nuxt";
import { z } from "zod";

export const env = createEnv({
  client: {
    // Optional: when unset, the app calls the API same-origin (through the
    // Nuxt dev proxy in orbs, or a reverse proxy in production).
    NUXT_PUBLIC_SERVER_URL: z.url().optional(),
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
