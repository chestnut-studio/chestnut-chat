import { auth } from "@chestnut-chat/auth";
import {
  REASONING_EFFORTS,
  type ReasoningEffort,
} from "@chestnut-chat/api/providers/model-capabilities";
import { env } from "@chestnut-chat/env/server";
import {
  consumeStream,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  isFileUIPart,
  smoothStream,
  streamText,
  toUIMessageStream,
} from "ai";
import type { Context } from "hono";
import { z } from "zod";

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
import { messageText } from "./utils";
import { searchWeb } from "./web-search";

const WORD_STREAM_CHUNKING = new Intl.Segmenter(undefined, { granularity: "word" });
const STREAM_HEADERS = {
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "Transfer-Encoding": "chunked",
  "X-Accel-Buffering": "no",
};
const DEFAULT_STREAM_ERROR = "The AI provider could not complete the request.";

const chatRequestSchema = z.object({
  chatId: z.string().min(1),
  messages: z.array(z.any()),
  model: z.string().optional(),
  reasoning: z.boolean().optional(),
  reasoningEffort: z.enum(REASONING_EFFORTS).optional(),
  trigger: z.enum(["submit-message", "regenerate-message"]).optional(),
  webSearch: z.boolean().optional(),
});

async function requestBody(c: Context): Promise<ChatRequestBody | null> {
  let json: unknown;
  try {
    json = await c.req.json();
  } catch {
    return null;
  }

  const parsed = chatRequestSchema.safeParse(json);
  return parsed.success ? (parsed.data as ChatRequestBody) : null;
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
  let shouldGenerateTitle = false;
  if (lastUserMessage && !isRegeneration) {
    const isFirstMessage = !(await hasMessages(chatId));
    try {
      await saveUserMessage(chatId, lastUserMessage);
    } catch (error) {
      console.error(
        "Failed to save user message:",
        error instanceof Error ? error.message : String(error),
      );
      return c.json({ error: "Failed to save message" }, 500);
    }
    shouldGenerateTitle =
      isFirstMessage && title === DEFAULT_CHAT_TITLE && Boolean(env.DEEPSEEK_API_KEY);
  }

  const searchQuery = lastUserMessage ? messageText(lastUserMessage).trim() : "";
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

      const titleTask =
        shouldGenerateTitle && lastUserMessage
          ? generateAiTitle(lastUserMessage, chatId, session.user.id).then((nextTitle) => {
              if (!nextTitle) return;
              writer.write({
                type: "data-chat-title",
                data: { title: nextTitle },
                transient: true,
              });
            })
          : Promise.resolve();

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
            data: {
              query: searchQuery,
              status: "complete",
              sources: searchResult.sources,
            },
          });
          for (const { excerpt: _, ...source } of searchResult.sources) {
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
      await titleTask;
    },
    onEnd: async ({ responseMessage }) => {
      try {
        await saveAssistantMessage(chatId, responseMessage, body.model ?? resolvedModel.modelId);
      } catch (error) {
        console.error(
          "Failed to save assistant message:",
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  });

  return createUIMessageStreamResponse({
    stream,
    headers: STREAM_HEADERS,
    consumeSseStream: consumeStream,
  });
}
