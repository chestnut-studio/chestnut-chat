import { createDeepSeek, type DeepSeekLanguageModelChatOptions } from "@ai-sdk/deepseek";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { decryptApiKey } from "@chestnut-chat/api/providers/encryption";
import {
  getBuiltinProviderDef,
  normalizeProviderApiKey,
  type BuiltinProviderId,
} from "@chestnut-chat/api/providers/models";
import { auth } from "@chestnut-chat/auth";
import { db } from "@chestnut-chat/db";
import { chat, message } from "@chestnut-chat/db/schema/chat";
import { providerSetting } from "@chestnut-chat/db/schema/provider";
import { env } from "@chestnut-chat/env/server";
import {
  consumeStream,
  convertToModelMessages,
  createUIMessageStreamResponse,
  generateText,
  isTextUIPart,
  smoothStream,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";

type ChatRequestBody = {
  messages: UIMessage[];
  chatId: string;
  model?: string;
  reasoning?: boolean;
  trigger?: "submit-message" | "regenerate-message";
  webSearch?: boolean;
};

const SUPPORTED_DEEPSEEK_MODELS = ["deepseek-v4-flash", "deepseek-v4-pro"] as const;
type SupportedDeepSeekModel = (typeof SUPPORTED_DEEPSEEK_MODELS)[number];
type ChatProviderKind = "builtin" | "custom";
type ChatModelTarget = {
  kind: ChatProviderKind;
  providerId: string;
  modelId: string;
};
type ChatRequestBodyRecord = Record<string, unknown>;
type MiniMaxReasoningDetail = {
  text?: unknown;
};

const DEFAULT_CHAT_TITLE = "New Chat";
const DEFAULT_MODEL = "builtin:openrouter:openrouter%2Ffree";
const TITLE_MAX_LENGTH = 60;
const WORD_STREAM_CHUNKING = new Intl.Segmenter(undefined, { granularity: "word" });
const MINIMAX_PROVIDER_ID = "minimax";
const OPENROUTER_PROVIDER_ID = "openrouter";
const OPENROUTER_FREE_MODEL_ID = "openrouter/free";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const MINIMAX_BASE_URLS = ["https://api.minimaxi.com/v1", "https://api.minimax.io/v1"] as const;

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

function normalizeProviderBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, "");
}

function getAlternateMiniMaxBaseUrl(baseUrl: string) {
  const normalized = normalizeProviderBaseUrl(baseUrl);
  if (normalized === MINIMAX_BASE_URLS[0]) return MINIMAX_BASE_URLS[1];
  if (normalized === MINIMAX_BASE_URLS[1]) return MINIMAX_BASE_URLS[0];

  return null;
}

function fetchInputUrl(input: FetchInput) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();

  return input.url;
}

async function hasMiniMaxInvalidApiKey(response: Response) {
  if (response.ok) return false;

  const text = await response
    .clone()
    .text()
    .catch(() => "");

  return /\b2049\b|invalid\s+api\s*key/i.test(text);
}

function createMiniMaxRetryFetch(baseUrl: string) {
  const normalizedBaseUrl = normalizeProviderBaseUrl(baseUrl);
  const alternateBaseUrl = getAlternateMiniMaxBaseUrl(normalizedBaseUrl);

  return async (input: FetchInput, init?: FetchInit) => {
    const retryInput = input instanceof Request ? input.clone() : input;
    const response = await fetch(input, init);
    if (!(await hasMiniMaxInvalidApiKey(response)))
      return normalizeMiniMaxReasoningResponse(response);
    if (!alternateBaseUrl) return normalizeMiniMaxReasoningResponse(response);

    const inputUrl = fetchInputUrl(input);
    if (!inputUrl.startsWith(normalizedBaseUrl)) return normalizeMiniMaxReasoningResponse(response);

    const retryUrl = `${alternateBaseUrl}${inputUrl.slice(normalizedBaseUrl.length)}`;
    if (retryInput instanceof Request) {
      return normalizeMiniMaxReasoningResponse(
        await fetch(new Request(retryUrl, retryInput), init),
      );
    }

    return normalizeMiniMaxReasoningResponse(await fetch(retryUrl, init));
  };
}

function miniMaxReasoningText(value: unknown) {
  if (!Array.isArray(value)) return undefined;

  const text = value
    .map((detail: MiniMaxReasoningDetail) =>
      typeof detail === "object" && detail && typeof detail.text === "string" ? detail.text : "",
    )
    .join("");
  return text || undefined;
}

function normalizeMiniMaxJson(value: unknown) {
  if (!value || typeof value !== "object") return value;

  const response = value as {
    choices?: Array<{
      index?: number;
      delta?: { reasoning_content?: string; reasoning?: string; reasoning_details?: unknown };
      message?: { reasoning_content?: string; reasoning?: string; reasoning_details?: unknown };
    }>;
  };

  for (const choice of response.choices ?? []) {
    const messageReasoning = miniMaxReasoningText(choice.message?.reasoning_details);
    if (messageReasoning && !choice.message?.reasoning_content && !choice.message?.reasoning) {
      choice.message!.reasoning_content = messageReasoning;
    }
  }

  return response;
}

function normalizeMiniMaxSseLine(line: string, reasoningBuffers: Map<number, string>) {
  if (!line.startsWith("data:")) return line;

  const payload = line.slice(5).trimStart();
  if (!payload || payload === "[DONE]") return line;

  try {
    const value = JSON.parse(payload) as {
      choices?: Array<{
        index?: number;
        delta?: { reasoning_content?: string; reasoning?: string; reasoning_details?: unknown };
      }>;
    };

    for (const choice of value.choices ?? []) {
      const reasoningText = miniMaxReasoningText(choice.delta?.reasoning_details);
      if (!reasoningText || choice.delta?.reasoning_content || choice.delta?.reasoning) continue;

      const index = choice.index ?? 0;
      const previous = reasoningBuffers.get(index) ?? "";
      const delta = reasoningText.startsWith(previous)
        ? reasoningText.slice(previous.length)
        : reasoningText;
      reasoningBuffers.set(index, reasoningText);

      if (delta) {
        choice.delta!.reasoning_content = delta;
      }
    }

    return `data: ${JSON.stringify(value)}`;
  } catch {
    return line;
  }
}

function normalizeMiniMaxSseStream(body: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const reasoningBuffers = new Map<number, string>();
  let buffered = "";

  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffered += decoder.decode(chunk, { stream: true });
        const lines = buffered.split(/\r?\n/);
        buffered = lines.pop() ?? "";

        for (const line of lines) {
          controller.enqueue(
            encoder.encode(`${normalizeMiniMaxSseLine(line, reasoningBuffers)}\n`),
          );
        }
      },
      flush(controller) {
        const remaining = buffered + decoder.decode();
        if (remaining) {
          controller.enqueue(encoder.encode(normalizeMiniMaxSseLine(remaining, reasoningBuffers)));
        }
      },
    }),
  );
}

function normalizedMiniMaxHeaders(response: Response) {
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return headers;
}

async function normalizeMiniMaxReasoningResponse(response: Response) {
  if (!response.ok) return response;

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("text/event-stream") && response.body) {
    return new Response(normalizeMiniMaxSseStream(response.body), {
      status: response.status,
      statusText: response.statusText,
      headers: normalizedMiniMaxHeaders(response),
    });
  }

  if (!contentType.includes("application/json")) return response;

  return new Response(JSON.stringify(normalizeMiniMaxJson(await response.json())), {
    status: response.status,
    statusText: response.statusText,
    headers: normalizedMiniMaxHeaders(response),
  });
}

function isSupportedDeepSeekModel(modelId: string): modelId is SupportedDeepSeekModel {
  return SUPPORTED_DEEPSEEK_MODELS.includes(modelId as SupportedDeepSeekModel);
}

function decodeChatModelValue(value: string): ChatModelTarget | null {
  const [kind, providerId, modelId, ...rest] = value.split(":");
  if ((kind !== "builtin" && kind !== "custom") || !providerId || !modelId || rest.length) {
    return null;
  }

  try {
    return {
      kind,
      providerId: decodeURIComponent(providerId),
      modelId: decodeURIComponent(modelId),
    };
  } catch {
    return null;
  }
}

function providerWhere(userId: string, target: ChatModelTarget) {
  return and(
    eq(providerSetting.userId, userId),
    eq(providerSetting.kind, target.kind),
    eq(providerSetting.providerId, target.providerId),
  );
}

function providerHasModel(row: typeof providerSetting.$inferSelect, modelId: string) {
  return row.models.some((model) => model.id === modelId);
}

function stripUndefined<T extends ChatRequestBodyRecord>(body: T): ChatRequestBodyRecord {
  return Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined));
}

function transformMiniMaxChatRequestBody(body: ChatRequestBodyRecord): ChatRequestBodyRecord {
  return stripUndefined({
    model: body.model,
    messages: body.messages,
    max_completion_tokens: body.max_completion_tokens ?? body.max_tokens,
    temperature: body.temperature,
    top_p: body.top_p,
    tools: body.tools,
    tool_choice: body.tool_choice,
    thinking: body.thinking,
    reasoning_split: body.reasoning_split,
    service_tier: body.service_tier,
    stream: body.stream,
    stream_options: body.stream_options,
  });
}

async function getConfiguredProviderModel(target: ChatModelTarget, userId: string) {
  const [row] = await db.select().from(providerSetting).where(providerWhere(userId, target));
  if (!row) {
    throw new Error("Provider is not configured.");
  }
  if (!row.enabled) {
    throw new Error("Provider is disabled.");
  }
  if (!providerHasModel(row, target.modelId)) {
    throw new Error("Model is not configured for this provider.");
  }

  const baseURL =
    row.kind === "builtin"
      ? (row.baseUrl ?? getBuiltinProviderDef(row.providerId as BuiltinProviderId)?.defaultBaseUrl)
      : row.baseUrl;

  if (!baseURL) {
    throw new Error("Provider base URL is not configured.");
  }

  const normalizedBaseURL = normalizeProviderBaseUrl(baseURL);
  const isMiniMax = row.providerId === MINIMAX_PROVIDER_ID;
  const provider = createOpenAICompatible({
    name: row.providerId,
    apiKey: normalizeProviderApiKey(decryptApiKey(row.apiKeyEncrypted)),
    baseURL: normalizedBaseURL,
    fetch: isMiniMax ? createMiniMaxRetryFetch(normalizedBaseURL) : undefined,
    transformRequestBody: isMiniMax ? transformMiniMaxChatRequestBody : undefined,
  });

  return {
    model: provider.chatModel(target.modelId),
    modelId: target.modelId,
    providerId: row.providerId,
    providerOptions: undefined,
  };
}

async function resolveChatModel(model: string | undefined, userId: string) {
  const modelValue = model ?? DEFAULT_MODEL;
  const target = decodeChatModelValue(modelValue);

  if (target) {
    if (
      target.kind === "builtin" &&
      target.providerId === OPENROUTER_PROVIDER_ID &&
      target.modelId === OPENROUTER_FREE_MODEL_ID
    ) {
      const [row] = await db.select().from(providerSetting).where(providerWhere(userId, target));
      if (!row) {
        if (!env.OPENROUTER_API_KEY) {
          throw new Error(
            "OpenRouter is not configured. Set OPENROUTER_API_KEY in apps/server/.env.",
          );
        }
        const openRouter = createOpenAICompatible({
          name: OPENROUTER_PROVIDER_ID,
          apiKey: normalizeProviderApiKey(env.OPENROUTER_API_KEY),
          baseURL: OPENROUTER_BASE_URL,
        });
        return {
          model: openRouter.chatModel(target.modelId),
          modelId: target.modelId,
          providerId: OPENROUTER_PROVIDER_ID,
          providerOptions: undefined,
        };
      }
    }

    if (target.kind === "builtin" && target.providerId === "deepseek") {
      const [row] = await db.select().from(providerSetting).where(providerWhere(userId, target));
      if (!row && isSupportedDeepSeekModel(target.modelId)) {
        if (!env.DEEPSEEK_API_KEY) {
          throw new Error("DeepSeek is not configured. Set DEEPSEEK_API_KEY in apps/server/.env.");
        }
        const deepSeek = createDeepSeek({ apiKey: env.DEEPSEEK_API_KEY });
        return {
          model: deepSeek(target.modelId),
          modelId: target.modelId,
          providerId: "deepseek",
          providerOptions: {
            deepseek: {
              thinking: { type: target.modelId === "deepseek-v4-pro" ? "enabled" : "disabled" },
            } satisfies DeepSeekLanguageModelChatOptions,
          },
        };
      }
    }

    return getConfiguredProviderModel(target, userId);
  }

  if (!isSupportedDeepSeekModel(modelValue)) {
    throw new Error(`Unsupported model: ${model}`);
  }
  if (!env.DEEPSEEK_API_KEY) {
    throw new Error("DeepSeek is not configured. Set DEEPSEEK_API_KEY in apps/server/.env.");
  }

  const deepSeek = createDeepSeek({ apiKey: env.DEEPSEEK_API_KEY });
  return {
    model: deepSeek(modelValue),
    modelId: modelValue,
    providerId: "deepseek",
    providerOptions: {
      deepseek: {
        thinking: { type: modelValue === "deepseek-v4-pro" ? "enabled" : "disabled" },
      } satisfies DeepSeekLanguageModelChatOptions,
    },
  };
}

function messageText(row: UIMessage) {
  return row.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("");
}

function cleanTitle(value: string) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[#>*\-\d.)\s]+/, "")
    .replace(/[\s.!?,:;\u3002\uff01\uff1f\uff0c\u3001\uff1b\uff1a]+$/u, "")
    .trim();
}

async function generateAiTitle(
  deepSeekClient: ReturnType<typeof createDeepSeek>,
  userMessage: string,
  chatId: string,
  userId: string,
) {
  try {
    const { text } = await generateText({
      model: deepSeekClient("deepseek-v4-flash"),
      messages: [
        {
          role: "user",
          content: `Generate a concise title (max 6 words) for a conversation that starts with the following message. Reply with ONLY the title, no quotes, no trailing punctuation:\n\n${userMessage.slice(0, 500)}`,
        },
      ],
      maxOutputTokens: 30,
    });
    const title = cleanTitle(text);
    if (title) {
      await db
        .update(chat)
        .set({ title: title.slice(0, TITLE_MAX_LENGTH), updatedAt: new Date() })
        .where(and(eq(chat.id, chatId), eq(chat.userId, userId)));
    }
  } catch (error) {
    console.error("Failed to generate AI chat title:", error);
  }
}

export async function handleAiChat(c: Context): Promise<Response> {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  let body: ChatRequestBody;
  try {
    body = (await c.req.json()) as ChatRequestBody;
  } catch {
    return c.json({ error: "Invalid JSON request body" }, 400);
  }

  const { messages, chatId, reasoning, webSearch } = body;

  if (!chatId || !Array.isArray(messages)) {
    return c.json({ error: "chatId and messages are required" }, 400);
  }

  let resolvedModel: Awaited<ReturnType<typeof resolveChatModel>>;
  try {
    resolvedModel = await resolveChatModel(body.model, session.user.id);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "Unsupported model" }, 400);
  }

  const [owned] = await db
    .select({ title: chat.title })
    .from(chat)
    .where(and(eq(chat.id, chatId), eq(chat.userId, session.user.id)));

  if (!owned) {
    return c.json({ error: "Chat not found" }, 404);
  }

  // TODO(v0.2.0): wire provider web search when enabled.
  void webSearch;

  const lastUser = [...messages].reverse().find((row) => row.role === "user");
  const titleDeepSeek = env.DEEPSEEK_API_KEY
    ? createDeepSeek({ apiKey: env.DEEPSEEK_API_KEY })
    : null;
  const [existingMessage] = await db
    .select({ id: message.id })
    .from(message)
    .where(eq(message.chatId, chatId))
    .limit(1);
  const shouldSummarizeTitle =
    !existingMessage && owned.title === DEFAULT_CHAT_TITLE && body.trigger !== "regenerate-message";

  if (lastUser && body.trigger !== "regenerate-message") {
    await db.insert(message).values({
      chatId,
      role: "user",
      parts: lastUser.parts,
    });

    if (shouldSummarizeTitle && titleDeepSeek) {
      void generateAiTitle(titleDeepSeek, messageText(lastUser), chatId, session.user.id);
    }
  }

  const result = streamText({
    model: resolvedModel.model,
    messages: await convertToModelMessages(messages),
    abortSignal: c.req.raw.signal,
    experimental_transform: smoothStream({
      chunking: WORD_STREAM_CHUNKING,
      delayInMs: 12,
    }),
    providerOptions:
      resolvedModel.providerId === MINIMAX_PROVIDER_ID
        ? {
            minimax: {
              thinking: {
                type: reasoning && resolvedModel.modelId === "MiniMax-M3" ? "adaptive" : "disabled",
              },
              reasoning_split: !!reasoning,
            },
          }
        : resolvedModel.providerOptions && "deepseek" in resolvedModel.providerOptions
          ? {
              deepseek: {
                thinking: {
                  type:
                    reasoning || resolvedModel.modelId === "deepseek-v4-pro"
                      ? "enabled"
                      : "disabled",
                },
              } satisfies DeepSeekLanguageModelChatOptions,
            }
          : undefined,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      onEnd: async ({ responseMessage }) => {
        await db.insert(message).values({
          chatId,
          role: "assistant",
          parts: responseMessage.parts,
          model: body.model ?? resolvedModel.modelId,
        });
        await db.update(chat).set({ updatedAt: new Date() }).where(eq(chat.id, chatId));
      },
    }),
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Transfer-Encoding": "chunked",
      "X-Accel-Buffering": "no",
    },
    consumeSseStream: consumeStream,
  });
}
