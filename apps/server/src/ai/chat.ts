import { auth } from "@chestnut-chat/auth";
import { env } from "@chestnut-chat/env/server";
import {
  consumeStream,
  convertToModelMessages,
  createUIMessageStreamResponse,
  smoothStream,
  streamText,
  toUIMessageStream,
} from "ai";
import type { Context } from "hono";

import {
  DEFAULT_CHAT_TITLE,
  getChatTitle,
  hasMessages,
  saveAssistantMessage,
  saveUserMessage,
} from "./chat-store";
import { generateAiTitle } from "./chat-title";
import type { ChatRequestBody } from "./chat-types";
import { resolveChatModel } from "./models";

const MINIMAX_PROVIDER_ID = "minimax";
const MINIMAX_REASONING_MODEL_ID = "MiniMax-M3";
const WORD_STREAM_CHUNKING = new Intl.Segmenter(undefined, { granularity: "word" });
const STREAM_HEADERS = {
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "Transfer-Encoding": "chunked",
  "X-Accel-Buffering": "no",
};
const DEFAULT_STREAM_ERROR = "The AI provider could not complete the request.";

async function requestBody(c: Context): Promise<ChatRequestBody | null> {
  try {
    return (await c.req.json()) as ChatRequestBody;
  } catch {
    return null;
  }
}

function miniMaxProviderOptions(
  providerId: string,
  modelId: string,
  reasoning: boolean | undefined,
) {
  if (providerId !== MINIMAX_PROVIDER_ID) return undefined;

  return {
    minimax: {
      thinking: {
        type: reasoning && modelId === MINIMAX_REASONING_MODEL_ID ? "adaptive" : "disabled",
      },
      reasoning_split: Boolean(reasoning),
    },
  };
}

function streamErrorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : DEFAULT_STREAM_ERROR;
}

export async function handleAiChat(c: Context): Promise<Response> {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return c.json({ error: "Unauthorized" }, 401);

  const body = await requestBody(c);
  if (!body) return c.json({ error: "Invalid JSON request body" }, 400);

  const { chatId, messages, reasoning, trigger, webSearch } = body;
  if (!chatId || !Array.isArray(messages)) {
    return c.json({ error: "chatId and messages are required" }, 400);
  }

  let resolvedModel;
  try {
    resolvedModel = await resolveChatModel(body.model, session.user.id);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "Unsupported model" }, 400);
  }

  const title = await getChatTitle(chatId, session.user.id);
  if (title === null) return c.json({ error: "Chat not found" }, 404);

  // TODO(v0.2.0): wire provider web search when enabled.
  void webSearch;

  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
  const isRegeneration = trigger === "regenerate-message";
  let titleGeneration: Promise<void> | undefined;
  if (lastUserMessage && !isRegeneration) {
    const isFirstMessage = !(await hasMessages(chatId));
    await saveUserMessage(chatId, lastUserMessage);

    titleGeneration =
      isFirstMessage && title === DEFAULT_CHAT_TITLE && env.OPENROUTER_API_KEY
        ? generateAiTitle(lastUserMessage, chatId, session.user.id)
        : undefined;
  }

  const result = streamText({
    model: resolvedModel.model,
    messages: await convertToModelMessages(messages),
    abortSignal: c.req.raw.signal,
    experimental_transform: smoothStream({ chunking: WORD_STREAM_CHUNKING, delayInMs: 12 }),
    providerOptions: miniMaxProviderOptions(
      resolvedModel.providerId,
      resolvedModel.modelId,
      reasoning,
    ),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      onError: streamErrorMessage,
      onEnd: async ({ responseMessage }) => {
        await saveAssistantMessage(chatId, responseMessage, body.model ?? resolvedModel.modelId);
        await titleGeneration;
      },
    }),
    headers: STREAM_HEADERS,
    consumeSseStream: consumeStream,
  });
}
