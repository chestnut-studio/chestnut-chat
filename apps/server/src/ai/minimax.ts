import { modelRequiresReasoning } from "@chestnut-chat/api/providers/model-capabilities";
import { normalizeBaseUrl } from "@chestnut-chat/api/providers/models";

import { stripUndefined, type RequestBody } from "./utils";

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];
type MiniMaxReasoningDetail = { text?: unknown };

export const MINIMAX_PROVIDER_ID = "minimax";
const MINIMAX_REASONING_MODEL_ID = "MiniMax-M3";
const MINIMAX_BASE_URLS = ["https://api.minimaxi.com/v1", "https://api.minimax.io/v1"] as const;

function alternateBaseUrl(baseUrl: string) {
  const normalized = normalizeBaseUrl(baseUrl);
  if (normalized === MINIMAX_BASE_URLS[0]) return MINIMAX_BASE_URLS[1];
  if (normalized === MINIMAX_BASE_URLS[1]) return MINIMAX_BASE_URLS[0];

  return null;
}

function inputUrl(input: FetchInput) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();

  return input.url;
}

async function isInvalidApiKey(response: Response) {
  if (response.ok) return false;

  const text = await response
    .clone()
    .text()
    .catch(() => "");
  return /\b2049\b|invalid\s+api\s*key/i.test(text);
}

function reasoningText(value: unknown) {
  if (!Array.isArray(value)) return undefined;

  const text = value
    .map((detail: MiniMaxReasoningDetail) =>
      typeof detail === "object" && detail && typeof detail.text === "string" ? detail.text : "",
    )
    .join("");
  return text || undefined;
}

function normalizeJson(value: unknown) {
  if (!value || typeof value !== "object") return value;

  const response = value as {
    choices?: Array<{
      message?: { reasoning_content?: string; reasoning?: string; reasoning_details?: unknown };
    }>;
  };

  for (const choice of response.choices ?? []) {
    const reasoning = reasoningText(choice.message?.reasoning_details);
    if (reasoning && !choice.message?.reasoning_content && !choice.message?.reasoning) {
      choice.message!.reasoning_content = reasoning;
    }
  }

  return response;
}

function normalizeSseLine(line: string, reasoningBuffers: Map<number, string>) {
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
      const reasoning = reasoningText(choice.delta?.reasoning_details);
      if (!reasoning || choice.delta?.reasoning_content || choice.delta?.reasoning) continue;

      const index = choice.index ?? 0;
      const previous = reasoningBuffers.get(index) ?? "";
      const delta = reasoning.startsWith(previous) ? reasoning.slice(previous.length) : reasoning;
      reasoningBuffers.set(index, reasoning);

      if (delta) choice.delta!.reasoning_content = delta;
    }

    return `data: ${JSON.stringify(value)}`;
  } catch {
    return line;
  }
}

function normalizeSseStream(body: ReadableStream<Uint8Array>) {
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
          controller.enqueue(encoder.encode(`${normalizeSseLine(line, reasoningBuffers)}\n`));
        }
      },
      flush(controller) {
        const remaining = buffered + decoder.decode();
        if (remaining)
          controller.enqueue(encoder.encode(normalizeSseLine(remaining, reasoningBuffers)));
      },
    }),
  );
}

function normalizedHeaders(response: Response) {
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return headers;
}

async function normalizeReasoningResponse(response: Response) {
  if (!response.ok) return response;

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("text/event-stream") && response.body) {
    return new Response(normalizeSseStream(response.body), {
      status: response.status,
      statusText: response.statusText,
      headers: normalizedHeaders(response),
    });
  }
  if (!contentType.includes("application/json")) return response;

  return new Response(JSON.stringify(normalizeJson(await response.json())), {
    status: response.status,
    statusText: response.statusText,
    headers: normalizedHeaders(response),
  });
}

export function createMiniMaxRetryFetch(baseUrl: string) {
  const primaryBaseUrl = normalizeBaseUrl(baseUrl);
  const fallbackBaseUrl = alternateBaseUrl(primaryBaseUrl);

  return async (input: FetchInput, init?: FetchInit) => {
    const retryInput = input instanceof Request ? input.clone() : input;
    const response = await fetch(input, init);
    if (!(await isInvalidApiKey(response)) || !fallbackBaseUrl) {
      return normalizeReasoningResponse(response);
    }

    const url = inputUrl(input);
    if (!url.startsWith(primaryBaseUrl)) return normalizeReasoningResponse(response);

    const retryUrl = `${fallbackBaseUrl}${url.slice(primaryBaseUrl.length)}`;
    const retryResponse =
      retryInput instanceof Request
        ? await fetch(new Request(retryUrl, retryInput), init)
        : await fetch(retryUrl, init);
    return normalizeReasoningResponse(retryResponse);
  };
}

export function transformMiniMaxChatRequestBody(body: RequestBody): RequestBody {
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

export function miniMaxProviderOptions(
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
