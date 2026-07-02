import type { ProviderModel } from "~/composables/useProviderKeys";
import type { ProviderFetchMode } from "~/types/providers";

interface OpenAIModelsResponse {
  data?: unknown[];
}

interface GeminiModelsResponse {
  models?: unknown[];
}

export interface FetchProviderModelsOptions {
  apiKey: string;
  baseUrl?: string;
  fetchMode: ProviderFetchMode;
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, "");
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
  const data = (payload as OpenAIModelsResponse).data;
  return Array.isArray(data) ? data.flatMap((item) => normalizeModel(item) ?? []) : [];
}

function parseGeminiModels(payload: unknown) {
  const data = (payload as GeminiModelsResponse).models;
  return Array.isArray(data) ? data.flatMap((item) => normalizeModel(item) ?? []) : [];
}

async function fetchOpenAICompatibleModels(apiKey: string, baseUrl: string) {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/models`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  return parseOpenAIModels(await readModelResponse(response));
}

async function fetchAnthropicModels(apiKey: string) {
  const response = await fetch("https://api.anthropic.com/v1/models", {
    headers: {
      "anthropic-version": "2023-06-01",
      "x-api-key": apiKey,
    },
  });
  return parseOpenAIModels(await readModelResponse(response));
}

async function fetchGeminiModels(apiKey: string) {
  const url = new URL("https://generativelanguage.googleapis.com/v1beta/models");
  url.searchParams.set("key", apiKey);
  const response = await fetch(url);
  return parseGeminiModels(await readModelResponse(response));
}

export async function fetchProviderModels(options: FetchProviderModelsOptions) {
  if (options.fetchMode === "anthropic") return fetchAnthropicModels(options.apiKey);
  if (options.fetchMode === "gemini") return fetchGeminiModels(options.apiKey);
  if (!options.baseUrl) return [];

  return fetchOpenAICompatibleModels(options.apiKey, options.baseUrl);
}
