import { isTextUIPart, type UIMessage } from "ai";

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
export const OPENROUTER_PROVIDER_ID = "openrouter";

export type RequestBody = Record<string, unknown>;

export function stripUndefined(body: RequestBody): RequestBody {
  return Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined));
}

export function messageText(message: UIMessage) {
  return message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("");
}
