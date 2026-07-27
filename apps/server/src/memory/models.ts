import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { env } from "@chestnut-chat/env/server";
import type { EmbeddingModel, LanguageModel } from "ai";

const EMBEDDING_DIMENSIONS = 1536;

export function isMemoryChatConfigured() {
  return Boolean(env.MEMORY_CHAT_BASE_URL && env.MEMORY_CHAT_API_KEY && env.MEMORY_CHAT_MODEL);
}

export function isMemoryEmbeddingConfigured() {
  return Boolean(
    env.MEMORY_EMBEDDING_BASE_URL && env.MEMORY_EMBEDDING_API_KEY && env.MEMORY_EMBEDDING_MODEL,
  );
}

export function getMemoryChatModel(): LanguageModel | null {
  if (!isMemoryChatConfigured()) return null;

  const provider = createOpenAICompatible({
    name: "memory-chat",
    baseURL: env.MEMORY_CHAT_BASE_URL!,
    apiKey: env.MEMORY_CHAT_API_KEY!,
  });

  return provider.chatModel(env.MEMORY_CHAT_MODEL!);
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
