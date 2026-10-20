<script setup lang="ts">
import { BPopover } from "@chestnut-chat/ui";
import type { ChatMessageUsage } from "~/types/chat";
import { formatTokenCount } from "~/utils/format-tokens";
import {
  contextTokensUsed,
  formatUsagePercent,
  getUsagePercent,
  getUsageSeverity,
  turnTokenTotal,
} from "~/composables/useChatUsage";

const props = defineProps<{
  usage: ChatMessageUsage;
  contextWindow: number;
}>();

const RING_SIZE = 18;
const RING_STROKE = 2.5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const turnTokens = computed(() => turnTokenTotal(props.usage));
const usedTokens = computed(() => contextTokensUsed(props.usage));
const percent = computed(() => getUsagePercent(usedTokens.value, props.contextWindow));
const percentLabel = computed(() => formatUsagePercent(percent.value));
const severity = computed(() => getUsageSeverity(percent.value));
const strokeDashoffset = computed(
  () => RING_CIRCUMFERENCE - (percent.value / 100) * RING_CIRCUMFERENCE,
);

const strokeClass = computed(() => {
  if (severity.value === "critical") return "text-text-error-primary";
  if (severity.value === "warning") return "text-amber-500";
  return "text-accent-600";
});

const segments = computed(() => {
  const breakdown = [
    { key: "input", labelKey: "chat.usageInput", tokens: props.usage.inputTokens ?? 0 },
    {
      key: "cached",
      labelKey: "chat.usageCached",
      tokens: props.usage.cachedInputTokens ?? 0,
    },
    { key: "output", labelKey: "chat.usageOutput", tokens: props.usage.outputTokens ?? 0 },
    {
      key: "reasoning",
      labelKey: "chat.usageReasoning",
      tokens: props.usage.reasoningTokens ?? 0,
    },
  ].filter((segment) => segment.tokens > 0);

  const total = props.usage.totalTokens ?? 0;
  const hasBreakdown = breakdown.some((segment) =>
    ["input", "output", "reasoning"].includes(segment.key),
  );
  if (total > 0 && !hasBreakdown) {
    breakdown.push({ key: "total", labelKey: "chat.usageTotal", tokens: total });
  }

  return breakdown;
});
</script>

<template>
  <BPopover
    mode="hover"
    :open-delay="150"
    :close-delay="80"
    :content="{ side: 'top', align: 'end', sideOffset: 8, collisionPadding: 12 }"
    :ui="{ content: 'min-w-44 rounded-lg p-0' }"
  >
    <button
      type="button"
      class="inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-lg px-1.5 py-0.5 text-caption-1-medium text-text-secondary transition-colors hover:bg-background-secondary-hover hover:text-text-primary"
      :aria-label="
        $t('chat.usageAriaDetailed', {
          tokens: formatTokenCount(turnTokens),
          percent: percentLabel,
        })
      "
    >
      <svg
        :width="RING_SIZE"
        :height="RING_SIZE"
        viewBox="0 0 18 18"
        class="-rotate-90 shrink-0"
        aria-hidden="true"
      >
        <circle
          cx="9"
          cy="9"
          :r="RING_RADIUS"
          fill="none"
          class="text-border-button-default stroke-current"
          :stroke-width="RING_STROKE"
        />
        <circle
          cx="9"
          cy="9"
          :r="RING_RADIUS"
          fill="none"
          class="stroke-current"
          :class="strokeClass"
          :stroke-width="RING_STROKE"
          stroke-linecap="round"
          :stroke-dasharray="RING_CIRCUMFERENCE"
          :stroke-dashoffset="strokeDashoffset"
        />
      </svg>

      <span class="shrink-0 tabular-nums">{{ percentLabel }}%</span>
    </button>

    <template #content>
      <div class="space-y-2 p-3 text-caption-1-regular">
        <div class="flex items-center justify-between gap-4">
          <span class="font-medium text-text-primary">{{ $t("chat.usageTitle") }}</span>
          <span class="tabular-nums text-text-secondary">
            {{ formatTokenCount(Math.min(usedTokens, contextWindow)) }}
            /
            {{ formatTokenCount(contextWindow) }}
          </span>
        </div>

        <div class="h-1.5 overflow-hidden rounded-full bg-background-secondary-default">
          <div
            class="h-full rounded-full transition-[width]"
            :class="{
              'bg-accent-600': severity === 'normal',
              'bg-amber-500': severity === 'warning',
              'bg-text-error-primary': severity === 'critical',
            }"
            :style="{ width: `${percent}%` }"
          />
        </div>

        <ul v-if="segments.length" class="space-y-1">
          <li
            v-for="segment in segments"
            :key="segment.key"
            class="flex items-center justify-between gap-4"
          >
            <span class="text-text-secondary">{{ $t(segment.labelKey) }}</span>
            <span class="tabular-nums text-text-primary">{{
              formatTokenCount(segment.tokens)
            }}</span>
          </li>
        </ul>
      </div>
    </template>
  </BPopover>
</template>
