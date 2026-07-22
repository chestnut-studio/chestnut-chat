import type { ProviderModel } from "@chestnut-chat/db/schema/provider";

import { modelSupportsReasoning, modelSupportsVision } from "./model-capabilities";

export const BUILTIN_PROVIDER_IDS = [
  "minimax",
  "qwen",
  "zai",
  "xiaomimimo",
  "doubao",
  "hunyuan",
  "longcat",
  "spark",
  "stepfun",
  "wenxin",
  "kimi",
  "deepseek",
  "openrouter",
] as const;

export type BuiltinProviderId = (typeof BUILTIN_PROVIDER_IDS)[number];
export type ProviderFetchMode = "openai" | "catalog";
export type ProviderAuthMode = "bearer" | "raw";

export interface BuiltinProviderDef {
  id: BuiltinProviderId;
  defaultBaseUrl?: string;
  fetchMode: ProviderFetchMode;
  authModes?: readonly ProviderAuthMode[];
  modelCatalog?: readonly ProviderModel[];
}

interface OpenAICompatibleModelsResponse {
  data?: unknown[];
}

export interface FetchProviderModelsOptions {
  apiKey: string;
  baseUrl?: string | null;
  fetchMode: ProviderFetchMode;
  authModes?: readonly ProviderAuthMode[];
  modelCatalog?: readonly ProviderModel[];
  providerId?: BuiltinProviderId;
}

export class ProviderModelsFetchError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ProviderModelsFetchError";
  }
}

const SPARK_STANDARD_MODEL_CATALOG: readonly ProviderModel[] = [
  { id: "4.0Ultra", name: "Spark 4.0 Ultra", source: "fetched" },
  { id: "generalv3.5", name: "Spark Max", source: "fetched" },
  { id: "max-32k", name: "Spark Max-32K", source: "fetched" },
  { id: "generalv3", name: "Spark Pro", source: "fetched" },
  { id: "pro-128k", name: "Spark Pro-128K", source: "fetched" },
  { id: "lite", name: "Spark Lite", source: "fetched" },
];

const SPARK_REASONING_MODEL_CATALOG: readonly ProviderModel[] = [
  { id: "spark-x", name: "Spark X", supportsReasoning: true, source: "fetched" },
];

export const BUILTIN_PROVIDERS: readonly BuiltinProviderDef[] = [
  {
    id: "minimax",
    defaultBaseUrl: "https://api.minimaxi.com/v1",
    fetchMode: "openai",
  },
  {
    id: "qwen",
    defaultBaseUrl: "https://dashscope-us.aliyuncs.com/compatible-mode/v1",
    fetchMode: "openai",
  },
  {
    id: "zai",
    defaultBaseUrl: "https://api.z.ai/api/paas/v4",
    fetchMode: "openai",
  },
  {
    id: "xiaomimimo",
    defaultBaseUrl: "https://api.xiaomimimo.com/v1",
    fetchMode: "openai",
  },
  {
    id: "doubao",
    defaultBaseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    fetchMode: "openai",
  },
  {
    id: "hunyuan",
    defaultBaseUrl: "https://api.hunyuan.cloud.tencent.com/v1",
    fetchMode: "openai",
  },
  {
    id: "longcat",
    defaultBaseUrl: "https://api.longcat.chat/openai/v1",
    fetchMode: "openai",
  },
  {
    id: "spark",
    defaultBaseUrl: "https://spark-api-open.xf-yun.com/v1",
    // Spark implements the chat-completions API but does not expose GET /v1/models.
    // Keep this catalog in sync with Spark's HTTP API documentation.
    fetchMode: "catalog",
    modelCatalog: SPARK_STANDARD_MODEL_CATALOG,
  },
  {
    id: "stepfun",
    defaultBaseUrl: "https://api.stepfun.com/v1",
    fetchMode: "openai",
  },
  {
    id: "wenxin",
    defaultBaseUrl: "https://qianfan.baidubce.com/v2",
    fetchMode: "openai",
  },
  {
    id: "kimi",
    defaultBaseUrl: "https://api.moonshot.cn/v1",
    fetchMode: "openai",
  },
  {
    id: "deepseek",
    defaultBaseUrl: "https://api.deepseek.com",
    fetchMode: "openai",
  },
  {
    id: "openrouter",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    fetchMode: "openai",
  },
];

export function getBuiltinProviderDef(id: BuiltinProviderId) {
  return BUILTIN_PROVIDERS.find((provider) => provider.id === id);
}

const MINIMAX_BASE_URLS = ["https://api.minimaxi.com/v1", "https://api.minimax.io/v1"] as const;

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, "");
}

export function getSparkModelCatalog(baseUrl: string | null | undefined) {
  const normalized = baseUrl ? normalizeBaseUrl(baseUrl).toLowerCase() : "";
  const isReasoningEndpoint = ["/x2", "/v2", "/agent/v1"].some((path) => normalized.endsWith(path));

  return isReasoningEndpoint
    ? [...SPARK_REASONING_MODEL_CATALOG]
    : [...SPARK_STANDARD_MODEL_CATALOG];
}

function getAlternateMiniMaxBaseUrl(baseUrl: string) {
  const normalized = normalizeBaseUrl(baseUrl);
  if (normalized === MINIMAX_BASE_URLS[0]) return MINIMAX_BASE_URLS[1];
  if (normalized === MINIMAX_BASE_URLS[1]) return MINIMAX_BASE_URLS[0];

  return null;
}

function candidateBaseUrls(baseUrl: string) {
  const normalized = normalizeBaseUrl(baseUrl);
  const alternate = getAlternateMiniMaxBaseUrl(normalized);

  return alternate ? [normalized, alternate] : [normalized];
}

function stripWrappingQuotes(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

export function normalizeProviderApiKey(apiKey: string) {
  return stripWrappingQuotes(apiKey)
    .replace(/^export\s+/i, "")
    .replace(/^(?:openai_api_key|minimax_api_key|minimaxi_api_key|api_key)\s*=\s*/i, "")
    .replace(/^authorization:\s*/i, "")
    .replace(/^bearer\s+/i, "")
    .trim()
    .replace(/^authorization:\s*/i, "")
    .replace(/^bearer\s+/i, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();
}

function recordFrom(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function textFrom(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function booleanFrom(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function stringsFrom(value: unknown, maximum: number) {
  if (!Array.isArray(value)) return undefined;

  const strings = value.flatMap((item) => {
    const trimmed = typeof item === "string" ? item.trim() : "";
    return trimmed ? [trimmed] : [];
  });
  const unique = Array.from(new Set(strings)).slice(0, maximum);
  return unique.length ? unique : undefined;
}

function includesImageInput(modalities: readonly string[] | undefined) {
  // Image-only for now; video input (e.g. Kimi supports_video_in) is ignored.
  return modalities?.some((modality) => /^image$/i.test(modality));
}

function reasoningSupportFrom(record: Record<string, unknown>) {
  const capabilities = recordFrom(record.capabilities);
  const reasoning = recordFrom(record.reasoning);
  const declaredSupport =
    booleanFrom(record.supports_reasoning) ??
    booleanFrom(record.supportsReasoning) ??
    booleanFrom(record.reasoning) ??
    booleanFrom(capabilities?.reasoning) ??
    booleanFrom(capabilities?.thinking);
  if (declaredSupport !== undefined) return declaredSupport;
  if (reasoning) return true;

  const supportedParameters = record.supported_parameters ?? record.supportedParameters;
  if (!Array.isArray(supportedParameters)) return undefined;

  const exposesReasoningParameter = supportedParameters.some(
    (parameter) =>
      typeof parameter === "string" &&
      [
        "enable_thinking",
        "include_reasoning",
        "reasoning",
        "reasoning_effort",
        "thinking",
      ].includes(parameter.toLowerCase()),
  );

  // Parameter lists describe accepted request fields, not every intrinsic
  // capability. Absence therefore cannot prove that a model never reasons.
  return exposesReasoningParameter ? true : undefined;
}

function visionSupportFrom(
  record: Record<string, unknown>,
  inputModalities: readonly string[] | undefined,
) {
  const capabilities = recordFrom(record.capabilities);
  // Kimi / Moonshot: supports_image_in. Video (supports_video_in) is not treated as vision.
  const declaredSupport =
    booleanFrom(record.supports_image_in) ??
    booleanFrom(record.supportsImageIn) ??
    booleanFrom(record.supports_vision) ??
    booleanFrom(record.supportsVision) ??
    booleanFrom(record.vision) ??
    booleanFrom(capabilities?.vision) ??
    booleanFrom(capabilities?.image);

  return declaredSupport ?? includesImageInput(inputModalities);
}

function normalizeModel(item: unknown): ProviderModel | null {
  const record = recordFrom(item);
  if (!record) return null;

  const rawId = textFrom(record.id) ?? textFrom(record.name);
  if (!rawId) return null;

  const architecture = recordFrom(record.architecture);
  const inputModalities =
    stringsFrom(record.input_modalities, 20) ??
    stringsFrom(record.inputModalities, 20) ??
    stringsFrom(architecture?.input_modalities, 20) ??
    stringsFrom(architecture?.inputModalities, 20) ??
    stringsFrom(record.modalities, 20);
  const outputModalities =
    stringsFrom(record.output_modalities, 20) ??
    stringsFrom(record.outputModalities, 20) ??
    stringsFrom(architecture?.output_modalities, 20) ??
    stringsFrom(architecture?.outputModalities, 20);
  const supportedParameters = stringsFrom(
    record.supported_parameters ?? record.supportedParameters,
    100,
  );

  return {
    id: rawId.replace(/^models\//, ""),
    name: textFrom(record.display_name) ?? textFrom(record.displayName),
    ownedBy: textFrom(record.owned_by) ?? textFrom(record.ownedBy),
    supportsReasoning: reasoningSupportFrom(record),
    supportsVision: visionSupportFrom(record, inputModalities),
    inputModalities,
    outputModalities,
    supportedParameters,
    source: "fetched",
  };
}

async function readModelResponse(response: Response) {
  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const record = recordFrom(payload);
    const error = recordFrom(record?.error);
    const message = textFrom(error?.message) ?? textFrom(record?.message) ?? response.statusText;
    throw new ProviderModelsFetchError(response.status, message);
  }
  return payload;
}

function parseOpenAIModels(payload: unknown) {
  const data = (payload as OpenAICompatibleModelsResponse).data;
  return Array.isArray(data) ? data.flatMap((item) => normalizeModel(item) ?? []) : [];
}

/**
 * Fill capability flags for providers whose /models payloads omit them
 * (e.g. DeepSeek) or when catalog metadata is incomplete.
 */
function enrichModelCapabilities(
  providerId: BuiltinProviderId | undefined,
  models: readonly ProviderModel[],
): ProviderModel[] {
  if (!providerId) return [...models];

  return models.map((model) => ({
    ...model,
    supportsReasoning: modelSupportsReasoning(providerId, model.id, model.supportsReasoning),
    supportsVision: modelSupportsVision(providerId, model.id, model.supportsVision),
  }));
}

function authorizationValue(apiKey: string, mode: ProviderAuthMode) {
  return mode === "bearer" ? `Bearer ${apiKey}` : apiKey;
}

function shouldRetryWithNextAuthMode(cause: unknown) {
  return cause instanceof ProviderModelsFetchError
    ? cause.status === 401 ||
        cause.status === 403 ||
        /\b(api[-_\s]?key|auth(?:orization)?|unauthorized|forbidden)\b/i.test(cause.message)
    : false;
}

async function fetchOpenAICompatibleModels(
  apiKey: string,
  baseUrl: string,
  authModes: readonly ProviderAuthMode[] = ["bearer"],
) {
  const normalizedApiKey = normalizeProviderApiKey(apiKey);
  let lastError: unknown;

  for (const candidateBaseUrl of candidateBaseUrls(baseUrl)) {
    for (const authMode of authModes) {
      try {
        const response = await fetch(`${candidateBaseUrl}/models`, {
          headers: {
            Accept: "application/json",
            Authorization: authorizationValue(normalizedApiKey, authMode),
          },
        });
        return parseOpenAIModels(await readModelResponse(response));
      } catch (cause) {
        lastError = cause;
        if (!shouldRetryWithNextAuthMode(cause)) throw cause;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Failed to fetch provider models");
}

export async function fetchProviderModels(options: FetchProviderModelsOptions) {
  switch (options.fetchMode) {
    case "catalog": {
      const catalog =
        options.providerId === "spark"
          ? getSparkModelCatalog(options.baseUrl)
          : options.modelCatalog
            ? [...options.modelCatalog]
            : [];
      return enrichModelCapabilities(options.providerId, catalog);
    }
    case "openai": {
      if (!options.baseUrl) return [];
      const models = await fetchOpenAICompatibleModels(
        options.apiKey,
        options.baseUrl,
        options.authModes,
      );
      return enrichModelCapabilities(options.providerId, models);
    }
  }
}
