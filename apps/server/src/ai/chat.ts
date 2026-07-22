import { auth } from "@chestnut-chat/auth";
import type { ReasoningEffort } from "@chestnut-chat/api/providers/model-capabilities";
import { env } from "@chestnut-chat/env/server";
import {
  consumeStream,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  isFileUIPart,
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
import { deepSeekProviderOptions } from "./deepseek";
import { kimiProviderOptions } from "./kimi";
import { miniMaxProviderOptions } from "./minimax";
import { resolveChatModel } from "./models";
import { searchWeb } from "./web-search";

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

function chatProviderOptions(
  providerId: string,
  modelId: string,
  reasoning: boolean | undefined,
  reasoningEffort: ReasoningEffort | undefined,
) {
  return (
    deepSeekProviderOptions(providerId, reasoning, reasoningEffort) ??
    kimiProviderOptions(providerId, modelId, reasoning, reasoningEffort) ??
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

function isImageFilePart(part: ChatUIMessage["parts"][number]) {
  return isFileUIPart(part) && part.mediaType.toLowerCase().startsWith("image/");
}

function messagesContainImages(messages: ChatUIMessage[]) {
  return messages.some((message) => message.parts.some(isImageFilePart));
}

function documentPartToText(filename: string, extractedText: string) {
  return `Attached file: ${filename}\n\n"""\n${extractedText}\n"""`;
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

  if (!resolvedModel.supportsVision && messagesContainImages(messages)) {
    return c.json(
      {
        error:
          "The selected model does not support image input. Choose a vision-capable model or remove images.",
      },
      400,
    );
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
        messages: await convertToModelMessages<ChatUIMessage>(messages, {
          convertDataPart: (part) => {
            if (part.type === "data-document") {
              return {
                type: "text",
                text: documentPartToText(part.data.filename, part.data.extractedText),
              };
            }
          },
        }),
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
