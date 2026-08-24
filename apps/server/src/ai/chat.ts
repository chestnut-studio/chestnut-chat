import { auth } from "@chestnut-chat/auth";
import {
  REASONING_EFFORTS,
  type ReasoningEffort,
} from "@chestnut-chat/api/providers/model-capabilities";
import type { WebSearchSource } from "@chestnut-chat/api/chat/web-search";
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
import { DEEPSEEK_PROVIDER_ID, deepSeekProviderOptions } from "./deepseek";
import { streamDeepSeekResponsesChat } from "./deepseek-responses";
import { kimiProviderOptions } from "./kimi";
import { miniMaxProviderOptions } from "./minimax";
import { resolveChatModel } from "./models";
import { messageText } from "./utils";
import { searchWeb } from "./web-search";
import { buildChatContext, type ChatContextBundle } from "../memory/context";
import { enqueuePostChatJobs } from "../memory/queue";

const WORD_STREAM_CHUNKING = new Intl.Segmenter(undefined, { granularity: "word" });
const STREAM_HEADERS = {
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "Transfer-Encoding": "chunked",
  "X-Accel-Buffering": "no",
};
const DEFAULT_STREAM_ERROR = "The AI provider could not complete the request.";
const CHAT_STREAM_TIMEOUT_MS = 5 * 60 * 1_000;

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
  // Upstream provider errors can contain key prefixes, URLs, or billing
  // details; never forward them to the client. Log the original for debugging.
  console.error(
    "ai_stream_error",
    error instanceof Error ? (error.stack ?? error.message) : String(error),
  );
  return DEFAULT_STREAM_ERROR;
}

function isImageFilePart(part: ChatUIMessage["parts"][number]) {
  return (
    isFileUIPart(part) &&
    typeof part.mediaType === "string" &&
    part.mediaType.toLowerCase().startsWith("image/")
  );
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

  let contextBundle: ChatContextBundle | null = null;
  try {
    contextBundle = await buildChatContext({
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
  } catch (error) {
    console.error(
      "Failed to build chat context:",
      error instanceof Error ? error.message : String(error),
    );
    return c.json({ error: "Failed to prepare chat history" }, 500);
  }

  if (!contextBundle) return c.json({ error: "Chat not found" }, 404);
  const bundle = contextBundle;

  // Regeneration reuses the user turn that precedes the regenerated reply;
  // it was kept by truncateFromMessage, so it is safe to re-enqueue memory jobs.
  const regeneratedUserMessage = isRegeneration
    ? ([...bundle.historyMessages].reverse().find((message) => message.role === "user") ?? null)
    : null;

  const hasSearchRequest = bundle.historyMessages.some(
    (message) => message.role === "user" && messageText(message).trim(),
  );
  let searchProgressId =
    webSearch && hasSearchRequest ? `web-search-${crypto.randomUUID()}` : undefined;
  const responseMessageId = crypto.randomUUID();

  // DeepSeek web search streams through the Responses API, which may not accept
  // image content for every model; skip web search for image messages so image
  // chats keep working through the plain chat stream.
  if (searchProgressId && messagesContainImages(bundle.historyMessages as ChatUIMessage[])) {
    searchProgressId = undefined;
  }

  console.info("memory_retrieval", {
    chatId,
    memoryCount: bundle.retrieval.memoryCount,
    chunkCount: bundle.retrieval.chunkCount,
    latencyMs: bundle.retrieval.latencyMs,
  });

  let capturedUsage: ChatMessageUsage | undefined;

  const stream = createUIMessageStream<ChatUIMessage>({
    originalMessages: bundle.historyMessages as ChatUIMessage[],
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
          data: { query: "", status: "planning" },
        });
      }

      if (searchProgressId && resolvedModel.providerId === DEEPSEEK_PROVIDER_ID) {
        // DeepSeek models search and answer in one Responses API stream. Stream
        // it directly instead of injecting search results into the chat model.
        let activeSearchQuery = "";
        let reasoningItemId: string | undefined;
        let textItemId: string | undefined;

        const writeSearch = (
          status: "searching" | "complete",
          query: string,
          sources?: WebSearchSource[],
        ) => {
          writer.write({
            type: "data-web-search",
            id: searchProgressId,
            data: { query, status, ...(sources ? { sources } : {}) },
          });
        };

        try {
          const searchEvents = streamDeepSeekResponsesChat({
            modelId: resolvedModel.modelId,
            userId: session.user.id,
            instructions: [bundle.instructions, webSearchInstructions].filter(Boolean).join("\n\n"),
            messages: bundle.historyMessages as ChatUIMessage[],
            abortSignal: c.req.raw.signal,
          });

          for await (const event of searchEvents) {
            switch (event.type) {
              case "search-progress": {
                activeSearchQuery = event.query || activeSearchQuery;
                writeSearch("searching", activeSearchQuery);
                break;
              }
              case "search-complete": {
                activeSearchQuery =
                  activeSearchQuery || event.sources.map((source) => source.url).join(" · ");
                writeSearch("complete", activeSearchQuery, event.sources);
                for (const source of event.sources) {
                  writer.write({ type: "source-url", ...source });
                }
                break;
              }
              case "reasoning-delta": {
                // The DeepSeek Responses API always streams a reasoning trace,
                // even when the user did not ask for it. Skip it unless the
                // user enabled reasoning so the answer renders like the regular
                // chat completions path.
                if (!reasoning) break;
                if (!event.delta) break;
                if (!reasoningItemId) {
                  reasoningItemId = `${responseMessageId}-reasoning`;
                  writer.write({ type: "reasoning-start", id: reasoningItemId });
                }
                writer.write({ type: "reasoning-delta", id: reasoningItemId, delta: event.delta });
                break;
              }
              case "text-delta": {
                if (!event.delta) break;
                if (!textItemId) {
                  textItemId = responseMessageId;
                  writer.write({ type: "text-start", id: textItemId });
                }
                writer.write({ type: "text-delta", id: textItemId, delta: event.delta });
                break;
              }
              case "finish": {
                if (textItemId) {
                  writer.write({ type: "text-end", id: textItemId });
                } else {
                  // The search found nothing and the model gave no answer.
                  throw new Error("Web search returned no results.");
                }
                if (reasoningItemId) {
                  writer.write({ type: "reasoning-end", id: reasoningItemId });
                }
                if (event.usage) {
                  capturedUsage = event.usage;
                  writer.write({
                    type: "message-metadata",
                    messageMetadata: { usage: event.usage },
                  });
                }
                writer.write({ type: "finish", finishReason: "stop" });
                await titleTask;
                return;
              }
            }
          }
          throw new Error("Web search stream ended before the response completed.");
        } catch (error) {
          writer.write({
            type: "data-web-search",
            id: searchProgressId,
            data: {
              query: activeSearchQuery,
              status: "error",
              error: streamErrorMessage(error),
            },
          });
          throw error;
        }
      }

      if (searchProgressId) {
        // OpenRouter-backed search: run the search first, then let the chat
        // model answer from the injected research.
        let activeSearchQuery = "";
        try {
          const searchResult = await searchWeb({
            messages: bundle.historyMessages,
            userId: session.user.id,
            abortSignal: c.req.raw.signal,
            onQueries: (queries) => {
              activeSearchQuery = queries.join(" · ");
              writer.write({
                type: "data-web-search",
                id: searchProgressId,
                data: { query: activeSearchQuery, status: "searching" },
              });
            },
          });
          webSearchInstructions = searchResult.instructions;
          activeSearchQuery = searchResult.queries.join(" · ");

          writer.write({
            type: "data-web-search",
            id: searchProgressId,
            data: {
              query: activeSearchQuery,
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
              query: activeSearchQuery,
              status: "error",
              error: streamErrorMessage(error),
            },
          });
          throw error;
        }
      }

      const instructions = [bundle.instructions, webSearchInstructions]
        .filter(Boolean)
        .join("\n\n");

      const result = streamText({
        model: resolvedModel.model,
        instructions,
        messages: await convertToModelMessages<ChatUIMessage>(
          bundle.historyMessages as ChatUIMessage[],
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
        timeout: CHAT_STREAM_TIMEOUT_MS,
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

        const userMessageId = savedUserMessage?.id ?? regeneratedUserMessage?.id;
        if (userMessageId) {
          await enqueuePostChatJobs({
            userId: session.user.id,
            chatId,
            projectId: bundle.project?.id ?? null,
            userMessageId,
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
