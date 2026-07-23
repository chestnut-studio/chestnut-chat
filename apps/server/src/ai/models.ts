import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { decryptApiKey } from "@chestnut-chat/api/providers/encryption";
import { modelSupportsVision } from "@chestnut-chat/api/providers/model-capabilities";
import {
  getBuiltinProviderDef,
  getSparkModelCatalog,
  normalizeBaseUrl,
  normalizeProviderApiKey,
  type BuiltinProviderId,
} from "@chestnut-chat/api/providers/models";
import { db } from "@chestnut-chat/db";
import { providerSetting } from "@chestnut-chat/db/schema/provider";
import { env } from "@chestnut-chat/env/server";
import { and, eq } from "drizzle-orm";

import type { ChatModelTarget, ResolvedChatModel } from "./chat-types";
import { DEEPSEEK_PROVIDER_ID } from "./deepseek";
import { KIMI_PROVIDER_ID, transformKimiChatRequestBody } from "./kimi";
import {
  createMiniMaxRetryFetch,
  MINIMAX_PROVIDER_ID,
  transformMiniMaxChatRequestBody,
} from "./minimax";
import { OPENROUTER_BASE_URL, OPENROUTER_PROVIDER_ID, type RequestBody } from "./utils";

const DEFAULT_MODEL = "builtin:openrouter:openrouter%2Ffree";
const SPARK_PROVIDER_ID = "spark";
const OPENROUTER_FREE_MODEL_ID = "openrouter/free";
const DEEPSEEK_TITLE_MODEL_ID = "deepseek-v4-flash";
const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

type RequestBodyTransform = (body: RequestBody) => RequestBody;

function providerRequestTransforms(
  providerId: string,
  normalizedBaseUrl: string,
): {
  fetch?: ReturnType<typeof createMiniMaxRetryFetch>;
  transformRequestBody?: RequestBodyTransform;
} {
  switch (providerId) {
    case MINIMAX_PROVIDER_ID:
      return {
        fetch: createMiniMaxRetryFetch(normalizedBaseUrl),
        transformRequestBody: transformMiniMaxChatRequestBody,
      };
    case KIMI_PROVIDER_ID:
      return {
        transformRequestBody: transformKimiChatRequestBody,
      };
    default:
      return {};
  }
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
  const declaredVision = row.models.find((model) => model.id === target.modelId)?.supportsVision;
  const supportsVision = modelSupportsVision(row.providerId, target.modelId, declaredVision);

  if (row.providerId === DEEPSEEK_PROVIDER_ID) {
    const provider = createDeepSeek({ apiKey, baseURL: normalizedBaseUrl });

    return {
      model: provider.chat(target.modelId),
      modelId: target.modelId,
      providerId: row.providerId,
      supportsVision,
    };
  }

  const { fetch: providerFetch, transformRequestBody } = providerRequestTransforms(
    row.providerId,
    normalizedBaseUrl,
  );
  const provider = createOpenAICompatible({
    name: row.providerId,
    apiKey,
    baseURL: normalizedBaseUrl,
    fetch: providerFetch,
    transformRequestBody,
  });

  return {
    model: provider.chatModel(target.modelId),
    modelId: target.modelId,
    providerId: row.providerId,
    supportsVision,
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
    supportsVision: modelSupportsVision(OPENROUTER_PROVIDER_ID, OPENROUTER_FREE_MODEL_ID),
  };
}

export function deepSeekTitleModel(): ResolvedChatModel {
  if (!env.DEEPSEEK_API_KEY) {
    throw new Error("DeepSeek is not configured. Set DEEPSEEK_API_KEY in apps/server/.env.");
  }

  const provider = createDeepSeek({
    apiKey: normalizeProviderApiKey(env.DEEPSEEK_API_KEY),
    baseURL: DEEPSEEK_BASE_URL,
  });
  return {
    model: provider.chat(DEEPSEEK_TITLE_MODEL_ID),
    modelId: DEEPSEEK_TITLE_MODEL_ID,
    providerId: DEEPSEEK_PROVIDER_ID,
    supportsVision: modelSupportsVision(DEEPSEEK_PROVIDER_ID, DEEPSEEK_TITLE_MODEL_ID),
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
