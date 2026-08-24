import { isFileUIPart, isTextUIPart } from "ai";
import {
  normalizeWebSearchQueries,
  type WebSearchSource,
} from "@chestnut-chat/api/chat/web-search";
import { decryptApiKeyForRequest } from "@chestnut-chat/api/providers/encryption";
import { normalizeBaseUrl, normalizeProviderApiKey } from "@chestnut-chat/api/providers/models";
import { db } from "@chestnut-chat/db";
import { providerSetting } from "@chestnut-chat/db/schema/provider";
import { and, eq } from "drizzle-orm";

import type { ChatMessageUsage, ChatUIMessage } from "./chat-types";
import { DEEPSEEK_PROVIDER_ID } from "./deepseek";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const MAX_INPUT_MESSAGES = 32;

export type DeepSeekResponsesEvent =
  | { type: "search-progress"; query: string }
  | { type: "search-complete"; sources: WebSearchSource[] }
  | { type: "reasoning-delta"; delta: string }
  | { type: "text-delta"; delta: string }
  | { type: "finish"; usage: ChatMessageUsage | undefined };

type DeepSeekResponsesChatInput = {
  modelId: string;
  userId: string;
  instructions: string;
  messages: ChatUIMessage[];
  abortSignal: AbortSignal;
};

function objectFrom(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function textFrom(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function httpUrlFrom(value: unknown) {
  const text = textFrom(value);
  if (!text) return undefined;

  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function responsesInputMessages(messages: ChatUIMessage[]) {
  const input: unknown[] = [];
  for (const message of messages.slice(-MAX_INPUT_MESSAGES)) {
    if (message.role !== "user" && message.role !== "assistant") continue;

    const content: unknown[] = [];
    for (const part of message.parts) {
      if (isTextUIPart(part) && part.text.trim()) {
        content.push({ type: "input_text", text: part.text });
      } else if (part.type === "data-document") {
        content.push({
          type: "input_text",
          text: `Attached file: ${part.data.filename}\n\n"""\n${part.data.extractedText}\n"""`,
        });
      } else if (
        isFileUIPart(part) &&
        typeof part.mediaType === "string" &&
        part.mediaType.toLowerCase().startsWith("image/") &&
        part.url.startsWith("data:")
      ) {
        content.push({ type: "input_image", image_url: { url: part.url } });
      }
    }

    if (content.length) {
      input.push({ role: message.role, content });
    }
  }
  return input;
}

function usageFromResponse(response: Record<string, unknown>): ChatMessageUsage | undefined {
  const usage = objectFrom(response.usage);
  if (!usage) return undefined;

  const inputDetails = objectFrom(usage.input_tokens_details);
  const outputDetails = objectFrom(usage.output_tokens_details);

  return {
    inputTokens: typeof usage.input_tokens === "number" ? usage.input_tokens : undefined,
    outputTokens: typeof usage.output_tokens === "number" ? usage.output_tokens : undefined,
    totalTokens: typeof usage.total_tokens === "number" ? usage.total_tokens : undefined,
    cachedInputTokens:
      typeof inputDetails?.cached_tokens === "number" ? inputDetails.cached_tokens : undefined,
    reasoningTokens:
      typeof outputDetails?.reasoning_tokens === "number"
        ? outputDetails.reasoning_tokens
        : undefined,
  };
}

function openedPageSources(output: unknown) {
  if (!Array.isArray(output)) return [];

  const sources: WebSearchSource[] = [];
  for (const rawItem of output) {
    const item = objectFrom(rawItem);
    if (textFrom(item?.type) !== "web_search_call" || textFrom(item?.status) !== "completed") {
      continue;
    }

    const action = objectFrom(item?.action);
    if (textFrom(action?.type) !== "open_page") continue;

    const url = httpUrlFrom(action?.url);
    if (!url || sources.some((source) => source.url === url)) continue;

    sources.push({ sourceId: `web-source-${sources.length + 1}`, url });
  }
  return sources;
}

function responseError(status: number, body: string) {
  try {
    const payload = objectFrom(JSON.parse(body));
    const error = objectFrom(payload?.error);
    const message = textFrom(error?.message) ?? textFrom(payload?.message);
    if (message) return `Web search failed (${status}): ${message}`;
  } catch {
    // Use the generic error below when the upstream response is not JSON.
  }

  return `Web search failed with status ${status}.`;
}

async function deepSeekCredential(userId: string) {
  const [row] = await db
    .select({
      apiKeyEncrypted: providerSetting.apiKeyEncrypted,
      baseUrl: providerSetting.baseUrl,
    })
    .from(providerSetting)
    .where(
      and(
        eq(providerSetting.userId, userId),
        eq(providerSetting.kind, "builtin"),
        eq(providerSetting.providerId, DEEPSEEK_PROVIDER_ID),
        eq(providerSetting.enabled, true),
      ),
    );

  if (row) {
    return {
      apiKey: normalizeProviderApiKey(decryptApiKeyForRequest(row.apiKeyEncrypted)),
      baseUrl: normalizeBaseUrl(row.baseUrl ?? DEEPSEEK_BASE_URL),
    };
  }

  if (process.env.DEEPSEEK_API_KEY) {
    return {
      apiKey: normalizeProviderApiKey(process.env.DEEPSEEK_API_KEY),
      baseUrl: DEEPSEEK_BASE_URL,
    };
  }

  throw new Error(
    "DeepSeek web search requires an enabled DeepSeek provider or DEEPSEEK_API_KEY in apps/server/.env.",
  );
}

/**
 * Streams a DeepSeek Responses API call that carries its own built-in web
 * search tool. Emits search progress, opened source pages, reasoning and
 * answer deltas, and a final usage-bearing finish event.
 */
export async function* streamDeepSeekResponsesChat({
  modelId,
  userId,
  instructions,
  messages,
  abortSignal,
}: DeepSeekResponsesChatInput): AsyncIterable<DeepSeekResponsesEvent> {
  const credential = await deepSeekCredential(userId);

  const response = await fetch(`${credential.baseUrl}/v1/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credential.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelId,
      instructions,
      input: responsesInputMessages(messages),
      tools: [{ type: "web_search" }],
      tool_choice: "auto",
      stream: true,
    }),
    signal: abortSignal,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(responseError(response.status, body));
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("Web search returned an empty response body.");

  const decoder = new TextDecoder();
  let buffer = "";
  let eventType = "";
  let dataLines: string[] = [];
  let sawSearchCall = false;
  let pendingSources: WebSearchSource[] = [];

  // Buffer incoming text deltas to word boundaries so the chat stream receives
  // whole words instead of single tokens; the front-end typewriter paces by
  // word and Markdown renderers see closed syntax instead of dangling markers.
  const WORD_BUFFER_MAX_LENGTH = 24;
  let textBuffer = "";
  let reasoningBuffer = "";

  const emitWordBuffer = (kind: "text" | "reasoning"): DeepSeekResponsesEvent[] => {
    const buf = kind === "text" ? textBuffer : reasoningBuffer;
    const events: DeepSeekResponsesEvent[] = [];

    // Cut the buffered text into chunks: split at whitespace (kept attached)
    // and further split chunks that exceed the cap, so the stream delivers
    // words instead of single tokens while CJK (which has no spaces) still
    // moves in reasonably sized pieces.
    let offset = 0;
    while (offset < buf.length) {
      const spaceIndex = buf.indexOf(" ", offset);
      let chunkEnd: number;
      if (spaceIndex !== -1) {
        chunkEnd = spaceIndex + 1;
      } else {
        chunkEnd = buf.length;
      }
      if (chunkEnd - offset > WORD_BUFFER_MAX_LENGTH) {
        chunkEnd = offset + WORD_BUFFER_MAX_LENGTH;
      }
      events.push(
        kind === "text"
          ? { type: "text-delta", delta: buf.slice(offset, chunkEnd) }
          : { type: "reasoning-delta", delta: buf.slice(offset, chunkEnd) },
      );
      offset = chunkEnd;
    }

    if (kind === "text") {
      textBuffer = "";
    } else {
      reasoningBuffer = "";
    }
    return events;
  };

  const flushTextDelta = (delta: string): DeepSeekResponsesEvent[] => {
    textBuffer += delta;
    // Wait for a full word (whitespace) or a long run before emitting, so
    // single-character tokens are batched into meaningful chunks.
    if (!/\s/u.test(textBuffer) && textBuffer.length < WORD_BUFFER_MAX_LENGTH) return [];
    return emitWordBuffer("text");
  };

  const flushReasoningDelta = (delta: string): DeepSeekResponsesEvent[] => {
    reasoningBuffer += delta;
    if (!/\s/u.test(reasoningBuffer) && reasoningBuffer.length < WORD_BUFFER_MAX_LENGTH) {
      return [];
    }
    return emitWordBuffer("reasoning");
  };

  const flushRemainingWordBuffers = (): DeepSeekResponsesEvent[] => {
    const events: DeepSeekResponsesEvent[] = [];
    if (textBuffer) {
      events.push({ type: "text-delta", delta: textBuffer });
      textBuffer = "";
    }
    if (reasoningBuffer) {
      events.push({ type: "reasoning-delta", delta: reasoningBuffer });
      reasoningBuffer = "";
    }
    return events;
  };

  const flushEvent = (): DeepSeekResponsesEvent[] => {
    if (!eventType || !dataLines.length) return [];

    const data = dataLines.join("\n");
    const event = eventType;
    eventType = "";
    dataLines = [];

    let payload: Record<string, unknown> | null = null;
    try {
      payload = objectFrom(JSON.parse(data));
    } catch {
      return [];
    }
    if (!payload) return [];

    switch (event) {
      case "response.web_search_call.in_progress":
      case "response.web_search_call.searching":
        sawSearchCall = true;
        return [{ type: "search-progress", query: "" }];
      case "response.output_item.done": {
        const item = objectFrom(payload.item);
        if (textFrom(item?.type) !== "web_search_call") return [];

        const action = objectFrom(item?.action);
        if (textFrom(action?.type) === "search") {
          const queries = normalizeWebSearchQueries(action?.queries).filter(
            (query) => !query.startsWith("ws_call_id="),
          );
          if (queries.length) {
            sawSearchCall = true;
            return [{ type: "search-progress", query: queries.join(" · ") }];
          }
        } else if (
          textFrom(action?.type) === "open_page" &&
          textFrom(item?.status) === "completed"
        ) {
          const url = httpUrlFrom(action?.url);
          if (url && !pendingSources.some((source) => source.url === url)) {
            pendingSources.push({ sourceId: `web-source-${pendingSources.length + 1}`, url });
            return [{ type: "search-complete", sources: [...pendingSources] }];
          }
        }
        return [];
      }
      case "response.reasoning_text.delta":
        return flushReasoningDelta(typeof payload.delta === "string" ? payload.delta : "");
      case "response.output_text.delta":
        return flushTextDelta(typeof payload.delta === "string" ? payload.delta : "");
      case "response.completed": {
        const responseObject = objectFrom(payload.response);
        const events: DeepSeekResponsesEvent[] = [];
        events.push(...flushRemainingWordBuffers());
        if (sawSearchCall) {
          const finalSources = openedPageSources(responseObject?.output);
          events.push({
            type: "search-complete",
            sources: finalSources.length ? finalSources : pendingSources,
          });
        }
        events.push({ type: "finish", usage: usageFromResponse(responseObject ?? {}) });
        return events;
      }
      case "response.failed": {
        const responseObject = objectFrom(payload.response);
        const error = objectFrom(responseObject?.error);
        throw new Error(
          textFrom(error?.message) ??
            textFrom(responseObject?.error) ??
            "DeepSeek web search failed.",
        );
      }
      default:
        return [];
    }
  };

  const processLine = (rawLine: string) => {
    const line = rawLine.replace(/\r$/, "");
    if (line === "") {
      for (const event of flushEvent()) {
        emitted.push(event);
      }
    } else if (line.startsWith("event:")) {
      eventType = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  };

  const emitted: DeepSeekResponsesEvent[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    let lineEnd: number;
    while ((lineEnd = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, lineEnd);
      buffer = buffer.slice(lineEnd + 1);
      processLine(line);
    }
    for (const event of emitted) {
      yield event;
    }
    emitted.length = 0;
  }

  // Drain the final chunk: the last SSE block may not be followed by a blank
  // line, and a chunk boundary can cut a multi-byte UTF-8 sequence.
  buffer += decoder.decode();
  if (buffer) {
    let lineEnd: number;
    while ((lineEnd = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, lineEnd);
      buffer = buffer.slice(lineEnd + 1);
      processLine(line);
    }
    if (buffer) processLine(buffer);
  }
  for (const event of flushEvent()) {
    yield event;
  }
}
