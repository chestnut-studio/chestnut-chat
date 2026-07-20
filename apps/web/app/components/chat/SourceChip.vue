<script setup lang="ts">
import type { WebSearchSource } from "@chestnut-chat/api/chat/web-search";

import { sourceFaviconUrl, sourceSiteLabel } from "~/utils/chat-sources";

const props = defineProps<{
  count?: number;
  label?: string;
  source: WebSearchSource;
}>();

const displayLabel = computed(() => sourceSiteLabel(props.source, props.label));
const faviconUrl = computed(() => sourceFaviconUrl(props.source.url));
const additionalCount = computed(() => Math.max(0, (props.count ?? 1) - 1));
const previewTitle = computed(
  () => props.source.title?.trim() || props.label?.trim() || props.source.url,
);
</script>

<template>
  <UPopover
    mode="hover"
    :open-delay="250"
    :close-delay="100"
    :content="{ side: 'bottom', align: 'start', sideOffset: 8, collisionPadding: 16 }"
    :ui="{ content: 'w-96 max-w-[calc(100vw-2rem)] rounded-xl p-4' }"
  >
    <UButton
      :to="source.url"
      external
      target="_blank"
      rel="noopener noreferrer"
      color="neutral"
      variant="soft"
      size="xs"
      :avatar="{
        src: faviconUrl,
        alt: displayLabel,
        text: displayLabel,
        referrerpolicy: 'no-referrer',
      }"
      :aria-label="previewTitle"
      :ui="{
        base: 'max-w-52 rounded-full align-middle font-normal no-underline',
        leadingAvatar: 'ring-1 ring-accented',
        label: 'max-w-40',
      }"
      :label="displayLabel"
    >
      <template v-if="additionalCount" #trailing>
        <span class="shrink-0 text-dimmed">+{{ additionalCount }}</span>
      </template>
    </UButton>

    <template #content>
      <div class="flex items-center gap-2.5">
        <UAvatar
          :src="faviconUrl"
          :alt="displayLabel"
          :text="displayLabel"
          referrerpolicy="no-referrer"
          size="xs"
          class="ring-1 ring-accented"
        />
        <span class="truncate text-sm font-medium text-default">{{ displayLabel }}</span>
      </div>

      <p class="mt-3 line-clamp-2 text-base leading-6 font-semibold text-default">
        {{ previewTitle }}
      </p>
    </template>
  </UPopover>
</template>
