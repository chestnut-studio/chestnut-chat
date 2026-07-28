import { createDeepSeek } from "@ai-sdk/deepseek";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { env } from "@chestnut-chat/env/server";
import type { EmbeddingModel, LanguageModel } from "ai";

const EMBEDDING_DIMENSIONS = 1536;

function isDeepSeekEndpoint(baseURL: string) {
  try {
    return new URL(baseURL).hostname.includes("deepseek");
  } catch {
    return false;
  }
}

export function isMemoryChatConfigured() {
  return Boolean(env.MEMORY_CHAT_BASE_URL && env.MEMORY_CHAT_API_KEY && env.MEMORY_CHAT_MODEL);
}

/** DeepSeek only supports json_object; schema mode injects JSON Schema and is flaky. */
export function isMemoryChatDeepSeek() {
  return Boolean(env.MEMORY_CHAT_BASE_URL && isDeepSeekEndpoint(env.MEMORY_CHAT_BASE_URL));
}

export function isMemoryEmbeddingConfigured() {
  return Boolean(
    env.MEMORY_EMBEDDING_BASE_URL && env.MEMORY_EMBEDDING_API_KEY && env.MEMORY_EMBEDDING_MODEL,
  );
}

export function getMemoryChatModel(): LanguageModel | null {
  if (!isMemoryChatConfigured()) return null;

  const baseURL = env.MEMORY_CHAT_BASE_URL!;
  const apiKey = env.MEMORY_CHAT_API_KEY!;
  const modelId = env.MEMORY_CHAT_MODEL!;

  // DeepSeek only supports json_object (not json_schema). Use the native
  // provider so we can disable thinking during structured extraction.
  if (isDeepSeekEndpoint(baseURL)) {
    return createDeepSeek({ apiKey, baseURL }).chat(modelId);
  }

  const provider = createOpenAICompatible({
    name: "memory-chat",
    baseURL,
    apiKey,
    supportsStructuredOutputs: true,
  });

  return provider.chatModel(modelId);
}

export function getMemoryEmbeddingModel(): EmbeddingModel | null {
  if (!isMemoryEmbeddingConfigured()) return null;

  const provider = createOpenAICompatible({
    name: "memory-embedding",
    baseURL: env.MEMORY_EMBEDDING_BASE_URL!,
    apiKey: env.MEMORY_EMBEDDING_API_KEY!,
  });

  return provider.textEmbeddingModel(env.MEMORY_EMBEDDING_MODEL!);
}

export function assertEmbeddingDimensions(embedding: number[]) {
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Expected embedding dimensions ${EMBEDDING_DIMENSIONS}, received ${embedding.length}`,
    );
  }
}

export { EMBEDDING_DIMENSIONS };
