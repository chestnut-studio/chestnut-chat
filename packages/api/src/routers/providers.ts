import { db } from "@chestnut-chat/db";
import { providerSetting } from "@chestnut-chat/db/schema/provider";
import type { ProviderKind, ProviderModel } from "@chestnut-chat/db/schema/provider";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";
import { decryptApiKey, encryptApiKey } from "../providers/encryption";
import {
  BUILTIN_PROVIDER_IDS,
  ProviderModelsFetchError,
  fetchProviderModels,
  getBuiltinProviderDef,
  normalizeProviderApiKey,
} from "../providers/models";

const builtinProviderIdSchema = z.enum(BUILTIN_PROVIDER_IDS);
const providerNameSchema = z.string().trim().min(1).max(120);
const apiKeySchema = z
  .string()
  .trim()
  .max(10_000)
  .transform(normalizeProviderApiKey)
  .pipe(z.string().min(1).max(10_000));
const baseUrlSchema = z.string().trim().max(500).optional().nullable();

const providerModelSchema = z.object({
  id: z.string().trim().min(1).max(300),
  name: z.string().trim().min(1).max(300).optional(),
  ownedBy: z.string().trim().min(1).max(300).optional(),
  source: z.enum(["fetched", "manual"]),
});

const providerModelsSchema = z.array(providerModelSchema).max(500);

const createFields = {
  name: providerNameSchema,
  apiKey: apiKeySchema,
  baseUrl: baseUrlSchema,
  enabled: z.boolean().optional(),
  models: providerModelsSchema.optional(),
};

const updateFields = {
  name: providerNameSchema.optional(),
  apiKey: apiKeySchema.optional(),
  baseUrl: baseUrlSchema,
  enabled: z.boolean().optional(),
  models: providerModelsSchema.optional(),
};

const providerTargetSchemas = [
  z.object({ kind: z.literal("builtin"), id: builtinProviderIdSchema }),
  z.object({ kind: z.literal("custom"), id: z.string().trim().min(1).max(120) }),
] as const;

const providerCreateInputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("builtin"),
    id: builtinProviderIdSchema,
    ...createFields,
  }),
  z.object({
    kind: z.literal("custom"),
    ...createFields,
  }),
]);

const providerUpdateInputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("builtin"),
    id: builtinProviderIdSchema,
    ...updateFields,
  }),
  z.object({
    kind: z.literal("custom"),
    id: z.string().trim().min(1).max(120),
    ...updateFields,
  }),
]);

const providerTargetSchema = z.discriminatedUnion("kind", providerTargetSchemas);

type ProviderTarget = z.infer<typeof providerTargetSchema>;

function cleanOptional(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function assertReturnedRow<T>(row: T | undefined): T {
  if (!row) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Database write failed" });
  }

  return row;
}

function providerWhere(userId: string, target: ProviderTarget) {
  return and(
    eq(providerSetting.userId, userId),
    eq(providerSetting.kind, target.kind),
    eq(providerSetting.providerId, target.id),
  );
}

async function getOwnedProvider(userId: string, target: ProviderTarget) {
  const [row] = await db.select().from(providerSetting).where(providerWhere(userId, target));

  if (!row) {
    throw new ORPCError("NOT_FOUND", { message: "Provider not found" });
  }

  return row;
}

function toProviderDto(row: typeof providerSetting.$inferSelect) {
  return {
    kind: row.kind,
    id: row.providerId,
    name: row.name,
    baseUrl: row.baseUrl ?? undefined,
    enabled: row.enabled,
    models: row.models,
    lastModelsSyncAt: row.lastModelsSyncAt?.toISOString(),
    hasApiKey: true,
  };
}

function resolveFetchOptions(row: typeof providerSetting.$inferSelect) {
  if (row.kind === "custom") {
    return {
      apiKey: decryptApiKey(row.apiKeyEncrypted),
      baseUrl: row.baseUrl,
      fetchMode: "openai" as const,
    };
  }

  const def = getBuiltinProviderDef(row.providerId as (typeof BUILTIN_PROVIDER_IDS)[number]);
  if (!def) {
    throw new ORPCError("NOT_FOUND", { message: "Provider definition not found" });
  }

  return {
    apiKey: decryptApiKey(row.apiKeyEncrypted),
    baseUrl: row.baseUrl ?? def.defaultBaseUrl,
    fetchMode: def.fetchMode,
    authModes: def.authModes,
  };
}

function toProviderFetchError(cause: unknown) {
  if (cause instanceof ProviderModelsFetchError) {
    const messagePrefix =
      cause.status === 401 || cause.status === 403
        ? "Provider rejected the API key"
        : "Provider model fetch failed";

    return new ORPCError(cause.status === 429 ? "TOO_MANY_REQUESTS" : "BAD_GATEWAY", {
      message: `${messagePrefix}: ${cause.message}`,
      data: { providerStatus: cause.status },
    });
  }

  return new ORPCError("BAD_GATEWAY", {
    message: cause instanceof Error ? cause.message : "Failed to fetch provider models",
  });
}

export const providersRouter = {
  list: protectedProcedure.handler(async ({ context }) => {
    const rows = await db
      .select()
      .from(providerSetting)
      .where(eq(providerSetting.userId, context.session.user.id));

    return rows.map(toProviderDto);
  }),

  create: protectedProcedure
    .input(providerCreateInputSchema)
    .handler(async ({ input, context }) => {
      const kind: ProviderKind = input.kind;
      const providerId = input.kind === "builtin" ? input.id : crypto.randomUUID();
      const [row] = await db
        .insert(providerSetting)
        .values({
          userId: context.session.user.id,
          kind,
          providerId,
          name: input.name,
          apiKeyEncrypted: encryptApiKey(input.apiKey),
          baseUrl: cleanOptional(input.baseUrl),
          enabled: input.enabled ?? true,
          models: input.models ?? [],
        })
        .returning();

      return toProviderDto(assertReturnedRow(row));
    }),

  update: protectedProcedure
    .input(providerUpdateInputSchema)
    .handler(async ({ input, context }) => {
      const updates: Partial<typeof providerSetting.$inferInsert> = {};

      if (input.name !== undefined) updates.name = input.name;
      if (input.apiKey !== undefined) updates.apiKeyEncrypted = encryptApiKey(input.apiKey);
      if (input.baseUrl !== undefined) updates.baseUrl = cleanOptional(input.baseUrl);
      if (input.enabled !== undefined) updates.enabled = input.enabled;
      if (input.models !== undefined) {
        updates.models = input.models as ProviderModel[];
        updates.lastModelsSyncAt = new Date();
      }

      const [row] = await db
        .update(providerSetting)
        .set(updates)
        .where(providerWhere(context.session.user.id, input))
        .returning();

      if (!row) {
        throw new ORPCError("NOT_FOUND", { message: "Provider not found" });
      }

      return toProviderDto(row);
    }),

  delete: protectedProcedure.input(providerTargetSchema).handler(async ({ input, context }) => {
    await db.delete(providerSetting).where(providerWhere(context.session.user.id, input));

    return input;
  }),

  fetchModels: protectedProcedure
    .input(providerTargetSchema)
    .handler(async ({ input, context }) => {
      const row = await getOwnedProvider(context.session.user.id, input);

      try {
        return await fetchProviderModels(resolveFetchOptions(row));
      } catch (cause) {
        throw toProviderFetchError(cause);
      }
    }),
};
