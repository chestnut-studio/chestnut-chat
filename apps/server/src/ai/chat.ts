import { auth } from "@chestnut-chat/auth";
import {
  REASONING_EFFORTS,
  type ReasoningEffort,
} from "@chestnut-chat/api/providers/model-capabilities";
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
  listChatMessages,
  saveAssistantMessage,
  saveChatLastOptions,
  saveUserMessage,
  truncateFromMessage,
} from "./chat-store";
import { generateAiTitle } from "./chat-title";
import type { ChatMessageUsage, ChatRequestBody, ChatUIMessage } from "./chat-types";
import { chatMessageUsageFromLanguageModelUsage } from "./chat-types";
import { deepSeekProviderOptions } from "./deepseek";
import { kimiProviderOptions } from "./kimi";
import { miniMaxProviderOptions } from "./minimax";
import { resolveChatModel } from "./models";
import { messageText } from "./utils";
import { searchWeb } from "./web-search";
import { buildChatContext } from "../memory/context";
import { enqueuePostChatJobs } from "../memory/queue";

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
  message: z.any().optional(),
  messages: z.array(z.any()).optional(),
  messageId: z.string().optional(),
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

function resolveIncomingMessage(body: ChatRequestBody): ChatUIMessage | null {
  if (body.message && typeof body.message === "object") {
    return body.message as ChatUIMessage;
  }
  if (body.messages?.length) {
    return [...body.messages].reverse().find((message) => message.role === "user") ?? null;
  }
  return null;
}

export async function handleAiChat(c: Context): Promise<Response> {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return c.json({ error: "Unauthorized" }, 401);

  const body = await requestBody(c);
  if (!body) return c.json({ error: "Invalid JSON request body" }, 400);

  const { chatId, reasoning, reasoningEffort, trigger, webSearch, messageId } = body;
  const incomingMessage = resolveIncomingMessage(body);
  const isRegeneration = trigger === "regenerate-message";

  let resolvedModel;
  try {
    resolvedModel = await resolveChatModel(body.model, session.user.id);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "Unsupported model" }, 400);
  }

  const title = await getChatTitle(chatId, session.user.id);
  if (title === null) return c.json({ error: "Chat not found" }, 404);

  const selectedModel = body.model ?? resolvedModel.modelId;
  try {
    await saveChatLastOptions(chatId, session.user.id, {
      model: selectedModel,
      reasoning: Boolean(reasoning),
      reasoningEffort: reasoningEffort ?? "high",
      webSearch: Boolean(webSearch),
    });
  } catch (error) {
    console.error(
      "Failed to save chat composer options:",
      error instanceof Error ? error.message : String(error),
    );
  }

  try {
    if (isRegeneration && messageId) {
      await truncateFromMessage(chatId, messageId, "regenerate");
    } else if (!isRegeneration && messageId) {
      // Edit flow: client may send the edited message id to replace from that point.
      const existing = await listChatMessages(chatId);
      if (existing.some((row) => row.id === messageId)) {
        await truncateFromMessage(chatId, messageId, "edit");
      }
    }
  } catch (error) {
    console.error("Failed to truncate chat branch:", error);
    return c.json({ error: "Failed to prepare chat history" }, 500);
  }

  let savedUserMessage = incomingMessage;
  let shouldGenerateTitle = false;
  if (incomingMessage && !isRegeneration) {
    if (messagesContainImages([incomingMessage]) && !resolvedModel.supportsVision) {
      return c.json(
        {
          error:
            "The selected model does not support image input. Choose a vision-capable model or remove images.",
        },
        400,
      );
    }

    try {
      const row = await saveUserMessage(chatId, incomingMessage);
      savedUserMessage = {
        ...incomingMessage,
        id: row?.id ?? incomingMessage.id,
      };
    } catch (error) {
      console.error(
        "Failed to save user message:",
        error instanceof Error ? error.message : String(error),
      );
      return c.json({ error: "Failed to save message" }, 500);
    }
    // Keep trying while the chat still has the default title. Project chats can
    // lose the first-message window when buildChatContext is slow and the client retries.
    shouldGenerateTitle = title === DEFAULT_CHAT_TITLE;
  }

  if (!savedUserMessage && !isRegeneration) {
    return c.json({ error: "Missing user message" }, 400);
  }

  const titlePromise =
    shouldGenerateTitle && savedUserMessage
      ? generateAiTitle(savedUserMessage, chatId, session.user.id)
      : Promise.resolve<string | undefined>(undefined);

  const contextBundle = await buildChatContext({
    chatId,
    userId: session.user.id,
    newestUserMessage:
      savedUserMessage ??
      ({
        id: crypto.randomUUID(),
        role: "user",
        parts: [{ type: "text", text: "" }],
      } satisfies ChatUIMessage),
  });

  if (!contextBundle) return c.json({ error: "Chat not found" }, 404);

  const searchQuery = savedUserMessage ? messageText(savedUserMessage).trim() : "";
  const searchProgressId =
    webSearch && searchQuery ? `web-search-${crypto.randomUUID()}` : undefined;
  const responseMessageId = crypto.randomUUID();

  console.info("memory_retrieval", {
    chatId,
    memoryCount: contextBundle.retrieval.memoryCount,
    chunkCount: contextBundle.retrieval.chunkCount,
    latencyMs: contextBundle.retrieval.latencyMs,
  });

  let capturedUsage: ChatMessageUsage | undefined;

  const stream = createUIMessageStream<ChatUIMessage>({
    originalMessages: contextBundle.historyMessages as ChatUIMessage[],
    onError: streamErrorMessage,
    execute: async ({ writer }) => {
      writer.write({ type: "start", messageId: responseMessageId });

      const titleTask = titlePromise.then((nextTitle) => {
        if (!nextTitle) return;
        writer.write({
          type: "data-chat-title",
          data: { title: nextTitle },
          transient: true,
        });
      });

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

      const instructions = [contextBundle.instructions, webSearchInstructions]
        .filter(Boolean)
        .join("\n\n");

      const result = streamText({
        model: resolvedModel.model,
        instructions,
        messages: await convertToModelMessages<ChatUIMessage>(
          contextBundle.historyMessages as ChatUIMessage[],
          {
            convertDataPart: (part) => {
              if (part.type === "data-document") {
                return {
                  type: "text",
                  text: documentPartToText(part.data.filename, part.data.extractedText),
                };
              }
            },
          },
        ),
        abortSignal: c.req.raw.signal,
        experimental_transform: smoothStream({ chunking: WORD_STREAM_CHUNKING, delayInMs: 12 }),
        providerOptions: chatProviderOptions(
          resolvedModel.providerId,
          resolvedModel.modelId,
          reasoning,
          reasoningEffort,
        ),
      });

      writer.merge(
        toUIMessageStream({
          stream: result.stream,
          sendStart: false,
          messageMetadata: ({ part }) => {
            if (part.type !== "finish") return undefined;
            const usage = chatMessageUsageFromLanguageModelUsage(part.totalUsage);
            if (usage) capturedUsage = usage;
            return usage ? { usage } : undefined;
          },
        }),
      );

      // Ensure usage is available even if the finish chunk omitted metadata.
      const usage =
        chatMessageUsageFromLanguageModelUsage(await result.totalUsage) ?? capturedUsage;
      if (usage) {
        capturedUsage = usage;
        writer.write({
          type: "message-metadata",
          messageMetadata: { usage },
        });
      }

      await titleTask;
    },
    onEnd: async ({ responseMessage }) => {
      try {
        const metadata = responseMessage.metadata?.usage
          ? responseMessage.metadata
          : capturedUsage
            ? { ...responseMessage.metadata, usage: capturedUsage }
            : responseMessage.metadata;

        const saved = await saveAssistantMessage(
          chatId,
          {
            ...responseMessage,
            id: responseMessage.id || responseMessageId,
            metadata,
          },
          body.model ?? resolvedModel.modelId,
        );

        if (savedUserMessage) {
          await enqueuePostChatJobs({
            userId: session.user.id,
            chatId,
            projectId: contextBundle.project?.id ?? null,
            userMessageId: savedUserMessage.id,
            assistantMessageId: saved?.id ?? responseMessageId,
          });
        }
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
