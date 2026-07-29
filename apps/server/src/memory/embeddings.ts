import { embed, embedMany } from "ai";

import { assertEmbeddingDimensions, getMemoryEmbeddingModel } from "./models";

export async function embedText(value: string): Promise<number[] | null> {
  const model = getMemoryEmbeddingModel();
  if (!model) return null;

  const result = await embed({ model, value });
  assertEmbeddingDimensions(result.embedding);
  return result.embedding;
}

export async function embedTexts(values: string[]): Promise<number[][] | null> {
  const model = getMemoryEmbeddingModel();
  if (!model || values.length === 0) return null;

  const result = await embedMany({ model, values });
  for (const embedding of result.embeddings) {
    assertEmbeddingDimensions(embedding);
  }
  return result.embeddings;
}
