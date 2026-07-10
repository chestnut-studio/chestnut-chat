import type { ProviderModel } from "~/composables/useProviderKeys";
import type { ProviderFetchMode } from "~/types/providers";

interface OpenAICompatibleModelsResponse {
  data?: unknown[];
}

export interface FetchProviderModelsOptions {
  apiKey: string;
  baseUrl?: string;
  fetchMode: ProviderFetchMode;
  modelCatalog?: readonly ProviderModel[];
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, "");
}

function normalizeProviderApiKey(apiKey: string) {
  return apiKey
    .trim()
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
    throw new Error(message);
  }
  return payload;
}

function parseOpenAIModels(payload: unknown) {
  const data = (payload as OpenAICompatibleModelsResponse).data;
  return Array.isArray(data) ? data.flatMap((item) => normalizeModel(item) ?? []) : [];
}

async function fetchOpenAICompatibleModels(apiKey: string, baseUrl: string) {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/models`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${normalizeProviderApiKey(apiKey)}`,
    },
  });
  return parseOpenAIModels(await readModelResponse(response));
}

export async function fetchProviderModels(options: FetchProviderModelsOptions) {
  switch (options.fetchMode) {
    case "catalog":
      return options.modelCatalog ? [...options.modelCatalog] : [];
    case "openai":
      if (!options.baseUrl) return [];
      return fetchOpenAICompatibleModels(options.apiKey, options.baseUrl);
  }
}
