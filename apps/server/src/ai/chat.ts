import { createDeepSeek, type DeepSeekLanguageModelChatOptions } from "@ai-sdk/deepseek";
import { auth } from "@chestnut-chat/auth";
import { db } from "@chestnut-chat/db";
import { chat, message } from "@chestnut-chat/db/schema/chat";
import { env } from "@chestnut-chat/env/server";
import {
  consumeStream,
  convertToModelMessages,
  createUIMessageStreamResponse,
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

const SUPPORTED_MODELS = ["deepseek-v4-flash", "deepseek-v4-pro"] as const;
type SupportedModel = (typeof SUPPORTED_MODELS)[number];

const DEFAULT_CHAT_TITLE = "New Chat";
const DEFAULT_MODEL: SupportedModel = "deepseek-v4-flash";
const TITLE_MAX_LENGTH = 60;
const TITLE_WORD_LIMIT = 8;
const TITLE_CHARACTER_LIMIT = 24;
const WORD_STREAM_CHUNKING = new Intl.Segmenter(undefined, { granularity: "word" });

function resolveModel(model: string | undefined): SupportedModel | null {
  const modelId = model ?? DEFAULT_MODEL;
  return SUPPORTED_MODELS.includes(modelId as SupportedModel) ? (modelId as SupportedModel) : null;
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

function summarizeChatTitle(value: string) {
  const normalized = cleanTitle(value);
  if (!normalized) return DEFAULT_CHAT_TITLE;

  const [firstSentence = normalized] = normalized.split(/(?<=[.!?\u3002\uff01\uff1f])\s+/u);
  const candidate = cleanTitle(
    firstSentence.length <= TITLE_MAX_LENGTH ? firstSentence : normalized,
  );
  if (candidate.length <= TITLE_MAX_LENGTH) return candidate;

  const words = candidate.split(/\s+/);
  const title =
    words.length > 1
      ? words.slice(0, TITLE_WORD_LIMIT).join(" ")
      : Array.from(candidate).slice(0, TITLE_CHARACTER_LIMIT).join("");

  return cleanTitle(title).slice(0, TITLE_MAX_LENGTH) || DEFAULT_CHAT_TITLE;
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

  const modelId = resolveModel(body.model);
  if (!modelId) {
    return c.json({ error: `Unsupported model: ${body.model}` }, 400);
  }

  if (!env.DEEPSEEK_API_KEY) {
    return c.json(
      { error: "DeepSeek is not configured. Set DEEPSEEK_API_KEY in apps/server/.env." },
      503,
    );
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
  const deepSeek = createDeepSeek({ apiKey: env.DEEPSEEK_API_KEY });
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

    if (shouldSummarizeTitle) {
      await db
        .update(chat)
        .set({ title: summarizeChatTitle(messageText(lastUser)), updatedAt: new Date() })
        .where(and(eq(chat.id, chatId), eq(chat.userId, session.user.id)));
    }
  }

  const result = streamText({
    model: deepSeek(modelId),
    messages: await convertToModelMessages(messages),
    abortSignal: c.req.raw.signal,
    experimental_transform: smoothStream({
      chunking: WORD_STREAM_CHUNKING,
      delayInMs: 12,
    }),
    providerOptions: {
      deepseek: {
        thinking: { type: reasoning || modelId === "deepseek-v4-pro" ? "enabled" : "disabled" },
      } satisfies DeepSeekLanguageModelChatOptions,
    },
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
          model: modelId,
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
