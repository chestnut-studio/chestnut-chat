import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { decryptApiKey } from "@chestnut-chat/api/providers/encryption";
import {
  getBuiltinProviderDef,
  getSparkModelCatalog,
  normalizeProviderApiKey,
  type BuiltinProviderId,
} from "@chestnut-chat/api/providers/models";
import { db } from "@chestnut-chat/db";
import { providerSetting } from "@chestnut-chat/db/schema/provider";
import { env } from "@chestnut-chat/env/server";
import { and, eq } from "drizzle-orm";

import type { ChatModelTarget, ResolvedChatModel } from "./chat-types";
import { createMiniMaxRetryFetch, transformMiniMaxChatRequestBody } from "./minimax";

const DEFAULT_MODEL = "builtin:openrouter:openrouter%2Ffree";
const DEEPSEEK_PROVIDER_ID = "deepseek";
const MINIMAX_PROVIDER_ID = "minimax";
const OPENROUTER_PROVIDER_ID = "openrouter";
const SPARK_PROVIDER_ID = "spark";
const OPENROUTER_FREE_MODEL_ID = "openrouter/free";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, "");
}

function decodeChatModelValue(value: string): ChatModelTarget | null {
  const [kind, providerId, modelId, ...rest] = value.split(":");
  if ((kind !== "builtin" && kind !== "custom") || !providerId || !modelId || rest.length) {
    return null;
  }

  try {
    return {
      kind,
      providerId: decodeURIComponent(providerId),
      modelId: decodeURIComponent(modelId),
    };
  } catch {
    return null;
  }
}

function providerWhere(userId: string, target: ChatModelTarget) {
  return and(
    eq(providerSetting.userId, userId),
    eq(providerSetting.kind, target.kind),
    eq(providerSetting.providerId, target.providerId),
  );
}

function hasModel(row: typeof providerSetting.$inferSelect, modelId: string) {
  return row.models.some((model) => model.id === modelId);
}

async function configuredProviderModel(
  target: ChatModelTarget,
  userId: string,
): Promise<ResolvedChatModel> {
  const [row] = await db.select().from(providerSetting).where(providerWhere(userId, target));
  if (!row) throw new Error("Provider is not configured.");
  if (!row.enabled) throw new Error("Provider is disabled.");
  if (!hasModel(row, target.modelId)) throw new Error("Model is not configured for this provider.");

  const baseUrl =
    row.kind === "builtin"
      ? (row.baseUrl ?? getBuiltinProviderDef(row.providerId as BuiltinProviderId)?.defaultBaseUrl)
      : row.baseUrl;
  if (!baseUrl) throw new Error("Provider base URL is not configured.");

  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const isMiniMax = row.providerId === MINIMAX_PROVIDER_ID;
  if (
    row.providerId === SPARK_PROVIDER_ID &&
    !getSparkModelCatalog(normalizedBaseUrl).some((model) => model.id === target.modelId)
  ) {
    const availableModelIds = getSparkModelCatalog(normalizedBaseUrl)
      .map((model) => model.id)
      .join(", ");
    throw new Error(
      `Spark model "${target.modelId}" is incompatible with ${normalizedBaseUrl}. Choose: ${availableModelIds}.`,
    );
  }
  const apiKey = normalizeProviderApiKey(decryptApiKey(row.apiKeyEncrypted));
  if (row.providerId === DEEPSEEK_PROVIDER_ID) {
    const provider = createDeepSeek({ apiKey, baseURL: normalizedBaseUrl });

    return {
      model: provider.chat(target.modelId),
      modelId: target.modelId,
      providerId: row.providerId,
    };
  }

  const provider = createOpenAICompatible({
    name: row.providerId,
    apiKey,
    baseURL: normalizedBaseUrl,
    fetch: isMiniMax ? createMiniMaxRetryFetch(normalizedBaseUrl) : undefined,
    transformRequestBody: isMiniMax ? transformMiniMaxChatRequestBody : undefined,
  });

  return {
    model: provider.chatModel(target.modelId),
    modelId: target.modelId,
    providerId: row.providerId,
  };
}

export function openRouterFreeModel(): ResolvedChatModel {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error("OpenRouter is not configured. Set OPENROUTER_API_KEY in apps/server/.env.");
  }

  const openRouter = createOpenAICompatible({
    name: OPENROUTER_PROVIDER_ID,
    apiKey: normalizeProviderApiKey(env.OPENROUTER_API_KEY),
    baseURL: OPENROUTER_BASE_URL,
  });
  return {
    model: openRouter.chatModel(OPENROUTER_FREE_MODEL_ID),
    modelId: OPENROUTER_FREE_MODEL_ID,
    providerId: OPENROUTER_PROVIDER_ID,
  };
}

export async function resolveChatModel(
  modelValue: string | undefined,
  userId: string,
): Promise<ResolvedChatModel> {
  const selectedModel = modelValue ?? DEFAULT_MODEL;
  const target = decodeChatModelValue(selectedModel);
  if (!target) throw new Error(`Unsupported model: ${selectedModel}`);

  if (
    target.kind === "builtin" &&
    target.providerId === OPENROUTER_PROVIDER_ID &&
    target.modelId === OPENROUTER_FREE_MODEL_ID
  ) {
    const [configuredProvider] = await db
      .select({ id: providerSetting.id })
      .from(providerSetting)
      .where(providerWhere(userId, target));
    if (!configuredProvider) return openRouterFreeModel();
  }

  return configuredProviderModel(target, userId);
}
