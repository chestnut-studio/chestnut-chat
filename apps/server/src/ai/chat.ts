import { auth } from "@chestnut-chat/auth";
import type { DeepSeekLanguageModelChatOptions } from "@ai-sdk/deepseek";
import {
  modelRequiresReasoning,
  type ReasoningEffort,
} from "@chestnut-chat/api/providers/model-capabilities";
import { env } from "@chestnut-chat/env/server";
import {
  consumeStream,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  isTextUIPart,
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
import type { ChatRequestBody, ChatUIMessage } from "./chat-types";
import { resolveChatModel } from "./models";
import { searchWeb } from "./web-search";

const MINIMAX_PROVIDER_ID = "minimax";
const MINIMAX_REASONING_MODEL_ID = "MiniMax-M3";
const DEEPSEEK_PROVIDER_ID = "deepseek";
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

  if (modelRequiresReasoning(providerId, modelId)) {
    return {
      minimax: {
        reasoning_split: true,
      },
    };
  }

  if (modelId.toLowerCase() !== MINIMAX_REASONING_MODEL_ID.toLowerCase()) return undefined;

  return {
    minimax: {
      thinking: {
        type: reasoning ? "adaptive" : "disabled",
      },
      reasoning_split: Boolean(reasoning),
    },
  };
}

function deepSeekProviderOptions(
  providerId: string,
  reasoning: boolean | undefined,
  reasoningEffort: ReasoningEffort | undefined,
) {
  if (providerId !== DEEPSEEK_PROVIDER_ID) return undefined;

  return {
    deepseek: {
      thinking: { type: reasoning ? "enabled" : "disabled" },
      ...(reasoning ? { reasoningEffort: reasoningEffort ?? "high" } : {}),
    } satisfies DeepSeekLanguageModelChatOptions,
  };
}

function chatProviderOptions(
  providerId: string,
  modelId: string,
  reasoning: boolean | undefined,
  reasoningEffort: ReasoningEffort | undefined,
) {
  return (
    deepSeekProviderOptions(providerId, reasoning, reasoningEffort) ??
    miniMaxProviderOptions(providerId, modelId, reasoning)
  );
}

function streamErrorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : DEFAULT_STREAM_ERROR;
}

function messageText(message: ChatUIMessage) {
  return message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("")
    .trim();
}

export async function handleAiChat(c: Context): Promise<Response> {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return c.json({ error: "Unauthorized" }, 401);

  const body = await requestBody(c);
  if (!body) return c.json({ error: "Invalid JSON request body" }, 400);

  const { chatId, messages, reasoning, reasoningEffort, trigger, webSearch } = body;
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

  const searchQuery = lastUserMessage ? messageText(lastUserMessage) : "";
  const searchProgressId =
    webSearch && searchQuery ? `web-search-${crypto.randomUUID()}` : undefined;
  const lastMessage = messages.at(-1);
  const responseMessageId =
    lastMessage?.role === "assistant" ? lastMessage.id : crypto.randomUUID();
  const stream = createUIMessageStream<ChatUIMessage>({
    originalMessages: messages,
    onError: streamErrorMessage,
    execute: async ({ writer }) => {
      writer.write({ type: "start", messageId: responseMessageId });

      let webSearchInstructions: string | undefined;
      if (searchProgressId) {
        writer.write({
          type: "data-web-search",
          id: searchProgressId,
          data: { query: searchQuery, status: "searching" },
        });

        try {
          const searchResult = await searchWeb(searchQuery, session.user.id, c.req.raw.signal);
          webSearchInstructions = searchResult.instructions;

          writer.write({
            type: "data-web-search",
            id: searchProgressId,
            data: { query: searchQuery, status: "complete" },
          });
          for (const source of searchResult.sources) {
            writer.write({ type: "source-url", ...source });
          }
        } catch (error) {
          writer.write({
            type: "data-web-search",
            id: searchProgressId,
            data: {
              query: searchQuery,
              status: "error",
              error: streamErrorMessage(error),
            },
          });
          throw error;
        }
      }

      const result = streamText({
        model: resolvedModel.model,
        instructions: webSearchInstructions,
        messages: await convertToModelMessages(messages),
        abortSignal: c.req.raw.signal,
        experimental_transform: smoothStream({ chunking: WORD_STREAM_CHUNKING, delayInMs: 12 }),
        providerOptions: chatProviderOptions(
          resolvedModel.providerId,
          resolvedModel.modelId,
          reasoning,
          reasoningEffort,
        ),
      });

      writer.merge(toUIMessageStream({ stream: result.stream, sendStart: false }));
    },
    onEnd: async ({ responseMessage }) => {
      await saveAssistantMessage(chatId, responseMessage, body.model ?? resolvedModel.modelId);
      await titleGeneration;
    },
  });

  return createUIMessageStreamResponse({
    stream,
    headers: STREAM_HEADERS,
    consumeSseStream: consumeStream,
  });
}
