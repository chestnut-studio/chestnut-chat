import type { ProviderModel } from "@chestnut-chat/db/schema/provider";

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
export type ProviderFetchMode = "openai";
export type ProviderAuthMode = "bearer" | "raw";

export interface BuiltinProviderDef {
  id: BuiltinProviderId;
  defaultBaseUrl?: string;
  fetchMode: ProviderFetchMode;
  authModes?: readonly ProviderAuthMode[];
}

interface OpenAICompatibleModelsResponse {
  data?: unknown[];
}

export interface FetchProviderModelsOptions {
  apiKey: string;
  baseUrl?: string | null;
  fetchMode: ProviderFetchMode;
  authModes?: readonly ProviderAuthMode[];
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
    fetchMode: "openai",
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

function normalizeModel(item: unknown): ProviderModel | null {
  const record = recordFrom(item);
  if (!record) return null;

  const rawId = textFrom(record.id) ?? textFrom(record.name);
  if (!rawId) return null;

  return {
    id: rawId.replace(/^models\//, ""),
    name: textFrom(record.display_name) ?? textFrom(record.displayName),
    ownedBy: textFrom(record.owned_by) ?? textFrom(record.ownedBy),
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
  if (!options.baseUrl) return [];

  switch (options.fetchMode) {
    case "openai":
      return fetchOpenAICompatibleModels(options.apiKey, options.baseUrl, options.authModes);
  }
}
