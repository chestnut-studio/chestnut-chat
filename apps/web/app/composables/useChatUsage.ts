import type { ChatMessageUsage, ChatUIMessage } from "~/types/chat";

export type UsageSeverity = "normal" | "warning" | "critical";

export function getUsagePercent(usedTokens: number, contextWindow: number) {
  if (!usedTokens || contextWindow <= 0) return 0;
  return Math.min((usedTokens / contextWindow) * 100, 100);
}

export function getUsageSeverity(percent: number): UsageSeverity {
  if (percent > 85) return "critical";
  if (percent >= 65) return "warning";
  return "normal";
}

export function turnTokenTotal(usage: ChatMessageUsage) {
  if (usage.totalTokens != null && usage.totalTokens > 0) return usage.totalTokens;

  const input = usage.inputTokens ?? 0;
  const output = usage.outputTokens ?? 0;
  const sum = input + output;
  return sum > 0 ? sum : 0;
}

export function contextTokensUsed(usage: ChatMessageUsage) {
  return usage.inputTokens && usage.inputTokens > 0 ? usage.inputTokens : turnTokenTotal(usage);
}

/** Format context fill for compact display (avoid rounding small values to 0%). */
export function formatUsagePercent(percent: number) {
  if (percent <= 0) return "0";
  if (percent < 10) return percent.toFixed(1).replace(/\.0$/, "");
  return `${Math.round(percent)}`;
}

function usageHasTokenData(usage: ChatMessageUsage | undefined): usage is ChatMessageUsage {
  if (!usage) return false;
  return turnTokenTotal(usage) > 0 || contextTokensUsed(usage) > 0;
}

/** Latest assistant turn usage for context fill / token breakdown. */
export function latestChatUsage(messages: readonly ChatUIMessage[]): ChatMessageUsage | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const usage = message?.role === "assistant" ? message.metadata?.usage : undefined;
    if (usageHasTokenData(usage)) {
      return usage;
    }
  }
  return null;
}

export function useChatUsage(messages: MaybeRefOrGetter<readonly ChatUIMessage[]>) {
  return computed(() => latestChatUsage(toValue(messages)));
}
