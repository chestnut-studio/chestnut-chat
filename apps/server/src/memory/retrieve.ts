import { preferNewestByKey, type ExtractedMemoryCandidate } from "@chestnut-chat/api/memory/filter";
import { resolveMemoryNamespace } from "@chestnut-chat/api/memory/namespace";
import { reciprocalRankFusion } from "@chestnut-chat/api/memory/ranking";
import { db } from "@chestnut-chat/db";
import { memoryItem } from "@chestnut-chat/db/schema/memory";
import { projectFileChunk } from "@chestnut-chat/db/schema/project";
import { and, cosineDistance, desc, eq, isNull, sql } from "drizzle-orm";

import { embedText } from "./embeddings";

export type RetrievedMemory = {
  id: string;
  memoryKey: string;
  content: string;
  createdAt: Date;
};

export type RetrievedChunk = {
  id: string;
  content: string;
  fileId: string;
};

type MemoryHit = RetrievedMemory & { score?: number };
type ChunkHit = RetrievedChunk & { score?: number };

async function semanticMemories(
  userId: string,
  projectId: string | null,
  queryEmbedding: number[],
  limit: number,
): Promise<MemoryHit[]> {
  const distance = cosineDistance(memoryItem.embedding, queryEmbedding);
  const scope =
    projectId === null ? isNull(memoryItem.projectId) : eq(memoryItem.projectId, projectId);

  const rows = await db
    .select({
      id: memoryItem.id,
      memoryKey: memoryItem.memoryKey,
      content: memoryItem.content,
      createdAt: memoryItem.createdAt,
      distance,
    })
    .from(memoryItem)
    .where(and(eq(memoryItem.userId, userId), scope))
    .orderBy(distance)
    .limit(limit);

  return rows.map(({ distance: _, ...row }) => row);
}

async function lexicalMemories(
  userId: string,
  projectId: string | null,
  query: string,
  limit: number,
): Promise<MemoryHit[]> {
  const scope =
    projectId === null ? isNull(memoryItem.projectId) : eq(memoryItem.projectId, projectId);

  const rows = await db
    .select({
      id: memoryItem.id,
      memoryKey: memoryItem.memoryKey,
      content: memoryItem.content,
      createdAt: memoryItem.createdAt,
      rank: sql<number>`similarity(${memoryItem.content}, ${query})`,
    })
    .from(memoryItem)
    .where(and(eq(memoryItem.userId, userId), scope, sql`${memoryItem.content} % ${query}`))
    .orderBy(desc(sql`similarity(${memoryItem.content}, ${query})`))
    .limit(limit);

  return rows.map(({ rank: _, ...row }) => row);
}

async function semanticChunks(
  projectId: string,
  queryEmbedding: number[],
  limit: number,
): Promise<ChunkHit[]> {
  const distance = cosineDistance(projectFileChunk.embedding, queryEmbedding);
  const rows = await db
    .select({
      id: projectFileChunk.id,
      content: projectFileChunk.content,
      fileId: projectFileChunk.fileId,
      distance,
    })
    .from(projectFileChunk)
    .where(eq(projectFileChunk.projectId, projectId))
    .orderBy(distance)
    .limit(limit);

  return rows.map(({ distance: _, ...row }) => row);
}

async function lexicalChunks(projectId: string, query: string, limit: number): Promise<ChunkHit[]> {
  const rows = await db
    .select({
      id: projectFileChunk.id,
      content: projectFileChunk.content,
      fileId: projectFileChunk.fileId,
      rank: sql<number>`similarity(${projectFileChunk.content}, ${query})`,
    })
    .from(projectFileChunk)
    .where(
      and(eq(projectFileChunk.projectId, projectId), sql`${projectFileChunk.content} % ${query}`),
    )
    .orderBy(desc(sql`similarity(${projectFileChunk.content}, ${query})`))
    .limit(limit);

  return rows.map(({ rank: _, ...row }) => row);
}

export async function retrieveMemoriesAndChunks(input: {
  userId: string;
  projectId: string | null;
  memoryMode: "default" | "project" | null;
  query: string;
  memoryLimit?: number;
  chunkLimit?: number;
}) {
  const started = Date.now();
  const memoryLimit = input.memoryLimit ?? 8;
  const chunkLimit = input.chunkLimit ?? 6;
  const namespace = resolveMemoryNamespace({
    projectId: input.projectId,
    memoryMode: input.memoryMode,
  });

  const query = input.query.trim();
  if (!query) {
    return {
      memories: [] as RetrievedMemory[],
      chunks: [] as RetrievedChunk[],
      latencyMs: Date.now() - started,
    };
  }

  // Semantic paths degrade to empty results (like the lexical paths below) so
  // an embedding provider outage or dimension mismatch cannot kill the chat.
  let embedding: number[] | null = null;
  try {
    embedding = await embedText(query);
  } catch (error) {
    console.error("memory_embedding_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  let memorySemantic: MemoryHit[] = [];
  try {
    memorySemantic = embedding
      ? await semanticMemories(input.userId, namespace.projectId, embedding, memoryLimit * 2)
      : [];
  } catch (error) {
    console.error("memory_semantic_retrieval_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  let memoryLexical: MemoryHit[] = [];
  try {
    memoryLexical = await lexicalMemories(
      input.userId,
      namespace.projectId,
      query,
      memoryLimit * 2,
    );
  } catch {
    memoryLexical = [];
  }

  const fusedMemories = reciprocalRankFusion([memorySemantic, memoryLexical], {
    key: (item) => item.id,
  })
    .map((entry) => entry.item)
    .slice(0, memoryLimit * 2);

  const memories = preferNewestByKey(fusedMemories).slice(0, memoryLimit);

  let chunks: RetrievedChunk[] = [];
  if (input.projectId) {
    let chunkSemantic: ChunkHit[] = [];
    try {
      chunkSemantic = embedding
        ? await semanticChunks(input.projectId, embedding, chunkLimit * 2)
        : [];
    } catch (error) {
      console.error("memory_chunk_semantic_retrieval_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    let chunkLexical: ChunkHit[] = [];
    try {
      chunkLexical = await lexicalChunks(input.projectId, query, chunkLimit * 2);
    } catch {
      chunkLexical = [];
    }
    chunks = reciprocalRankFusion([chunkSemantic, chunkLexical], { key: (item) => item.id })
      .map((entry) => entry.item)
      .slice(0, chunkLimit);
  }

  return {
    memories,
    chunks,
    latencyMs: Date.now() - started,
  };
}

export type { ExtractedMemoryCandidate };
