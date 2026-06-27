import { createDeepSeek, type DeepSeekLanguageModelChatOptions } from "@ai-sdk/deepseek";
import { auth } from "@chestnut-chat/auth";
import { db } from "@chestnut-chat/db";
import { chat, message } from "@chestnut-chat/db/schema/chat";
import { env } from "@chestnut-chat/env/server";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
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
  webSearch?: boolean;
};

const SUPPORTED_MODELS = ["deepseek-v4-flash", "deepseek-v4-pro"] as const;
type SupportedModel = (typeof SUPPORTED_MODELS)[number];

const DEFAULT_MODEL: SupportedModel = "deepseek-v4-flash";

function resolveModel(model: string | undefined): SupportedModel | null {
  const modelId = model ?? DEFAULT_MODEL;
  return SUPPORTED_MODELS.includes(modelId as SupportedModel) ? (modelId as SupportedModel) : null;
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
    .select({ id: chat.id })
    .from(chat)
    .where(and(eq(chat.id, chatId), eq(chat.userId, session.user.id)));

  if (!owned) {
    return c.json({ error: "Chat not found" }, 404);
  }

  // TODO(v0.2.0): wire provider web search when enabled.
  void webSearch;

  const lastUser = [...messages].reverse().find((row) => row.role === "user");
  const deepSeek = createDeepSeek({ apiKey: env.DEEPSEEK_API_KEY });

  if (lastUser) {
    await db.insert(message).values({
      chatId,
      role: "user",
      parts: lastUser.parts,
    });
  }

  const result = streamText({
    model: deepSeek(modelId),
    messages: await convertToModelMessages(messages),
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
  });
}
