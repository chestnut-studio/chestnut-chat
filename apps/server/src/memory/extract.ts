import {
  filterMemoryCandidates,
  transcriptLikelyHasDurableFacts,
  type ExtractedMemoryCandidate,
} from "@chestnut-chat/api/memory/filter";
import { resolveMemoryNamespace } from "@chestnut-chat/api/memory/namespace";
import { db } from "@chestnut-chat/db";
import { memoryItem } from "@chestnut-chat/db/schema/memory";
import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";

import { messageText } from "../ai/utils";
import type { ChatUIMessage } from "../ai/chat-types";
import { embedTexts } from "./embeddings";
import { getMemoryChatModel, isMemoryChatDeepSeek } from "./models";
import { loadOwnedChat } from "./context";

const memoryTypeSchema = z.enum(["fact", "preference", "goal", "decision", "constraint"]);

const extractionItemSchema = z.object({
  memoryKey: z.string(),
  memoryType: memoryTypeSchema,
  content: z.string(),
  importance: z.number().min(0).max(1).optional(),
});

const extractionSchema = z.object({
  items: z.array(extractionItemSchema).max(5),
});

const MAX_EMPTY_RETRIES = 2;

function buildExtractionPrompt(transcript: string, attempt: number) {
  const retryHint =
    attempt > 1
      ? [
          "",
          "Previous attempt returned no items, but the user message appears to contain durable personal information.",
          "Extract those facts now. Do not return an empty items array unless there is truly nothing durable.",
        ]
      : [];

  return [
    "Extract at most five durable user facts, preferences, goals, decisions, or constraints.",
    "Durable examples: occupation, name, location, lasting preferences, long-term goals.",
    "Example durable Chinese: 「我是一个全栈工程师」→ profession fact.",
    "Ignore passwords, API keys, auth codes, and one-off transient requests.",
    "Use stable snake_case memoryKey values.",
    "Respond with a JSON object only. Example:",
    '{"items":[{"memoryKey":"preferred_name","memoryType":"fact","content":"The user\'s name is Ada","importance":0.9}]}',
    'If nothing durable is present, return {"items":[]}.',
    ...retryHint,
    "",
    transcript,
  ].join("\n");
}

function repairJsonText(text: string) {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const candidate = fenced?.[1]?.trim() ?? text.trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start >= 0 && end > start) return candidate.slice(start, end + 1);
  return candidate;
}

function parseExtractionObject(value: unknown): ExtractedMemoryCandidate[] {
  const parsed = extractionSchema.safeParse(value);
  if (parsed.success) return parsed.data.items;

  // Models sometimes return a bare array.
  const asArray = z.array(extractionItemSchema).max(5).safeParse(value);
  if (asArray.success) return asArray.data;

  return [];
}

async function runExtractionAttempt(input: {
  model: LanguageModel;
  transcript: string;
  attempt: number;
  useDeepSeekJsonObject: boolean;
}) {
  const prompt = buildExtractionPrompt(input.transcript, input.attempt);
  const providerOptions = {
    deepseek: {
      thinking: { type: "disabled" as const },
    },
  };
  const repair = async ({ text }: { text: string }) => repairJsonText(text);

  // DeepSeek json_schema compatibility mode often returns empty items.
  // Prefer plain json_object + local Zod validation.
  if (input.useDeepSeekJsonObject) {
    const result = await generateObject({
      model: input.model,
      output: "no-schema",
      providerOptions,
      prompt,
      experimental_repairText: repair,
    });
    return parseExtractionObject(result.object);
  }

  const result = await generateObject({
    model: input.model,
    schema: extractionSchema,
    providerOptions,
    prompt,
    experimental_repairText: repair,
  });
  return result.object.items;
}

export async function extractAndPersistMemories(input: {
  chatId: string;
  userId: string;
  userMessage: ChatUIMessage;
  assistantMessage: ChatUIMessage;
}) {
  const model = getMemoryChatModel();
  if (!model) return { saved: 0, skipped: "memory_chat_unconfigured" as const };

  const owned = await loadOwnedChat(input.chatId, input.userId);
  if (!owned) return { saved: 0, skipped: "chat_not_found" as const };

  const namespace = resolveMemoryNamespace({
    projectId: owned.projectId,
    memoryMode: owned.project?.memoryMode ?? null,
  });

  const userText = messageText(input.userMessage);
  const transcript = [`User: ${userText}`, `Assistant: ${messageText(input.assistantMessage)}`].join(
    "\n",
  );
  const likelyDurable = transcriptLikelyHasDurableFacts(userText);
  const useDeepSeekJsonObject = isMemoryChatDeepSeek();
  const maxAttempts = likelyDurable ? 1 + MAX_EMPTY_RETRIES : 1;

  let rawItems: ExtractedMemoryCandidate[] = [];
  let accepted: ExtractedMemoryCandidate[] = [];
  let attemptsUsed = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    attemptsUsed = attempt;
    rawItems = await runExtractionAttempt({
      model,
      transcript,
      attempt,
      useDeepSeekJsonObject,
    });
    accepted = filterMemoryCandidates(rawItems, 5);

    console.info("memory_extract_attempt", {
      chatId: input.chatId,
      attempt,
      mode: useDeepSeekJsonObject ? "deepseek_json_object" : "schema",
      rawCount: rawItems.length,
      acceptedCount: accepted.length,
      likelyDurable,
    });

    if (accepted.length > 0) break;
    if (!likelyDurable) break;
  }

  if (!accepted.length) {
    console.info("memory_extract_empty", {
      chatId: input.chatId,
      attempts: attemptsUsed,
      likelyDurable,
      mode: useDeepSeekJsonObject ? "deepseek_json_object" : "schema",
    });
    return { saved: 0, rawCount: rawItems.length, acceptedCount: 0, attempts: attemptsUsed };
  }

  const embeddings = await embedTexts(accepted.map((item) => item.content));
  const values = accepted.map((item, index) => ({
    userId: input.userId,
    projectId: namespace.projectId,
    sourceChatId: input.chatId,
    sourceMessageId: input.userMessage.id,
    memoryKey: item.memoryKey,
    memoryType: item.memoryType,
    content: item.content,
    importance: item.importance ?? 0.5,
    embedding: embeddings?.[index] ?? null,
  }));

  await db.insert(memoryItem).values(values);

  console.info("memory_extract_saved", {
    chatId: input.chatId,
    saved: values.length,
    rawCount: rawItems.length,
    acceptedCount: accepted.length,
    attempts: attemptsUsed,
    hasEmbedding: Boolean(embeddings),
    scope: namespace.scope,
    projectId: namespace.projectId,
  });

  return {
    saved: values.length,
    rawCount: rawItems.length,
    acceptedCount: accepted.length,
    attempts: attemptsUsed,
  };
}
