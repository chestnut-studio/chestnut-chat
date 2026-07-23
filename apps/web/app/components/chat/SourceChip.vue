<script setup lang="ts">
import type { WebSearchSource } from "@chestnut-chat/api/chat/web-search";

import { sourceFaviconUrl, sourceSiteLabel, sourceTitle } from "~/utils/chat-sources";

const props = defineProps<{
  count?: number;
  label?: string;
  source: WebSearchSource;
}>();

const displayLabel = computed(() => sourceSiteLabel(props.source, props.label));
const faviconUrl = computed(() => sourceFaviconUrl(props.source.url));
const additionalCount = computed(() => Math.max(0, (props.count ?? 1) - 1));
const previewTitle = computed(() => sourceTitle(props.source));
</script>

<template>
  <UPopover
    mode="hover"
    :open-delay="220"
    :close-delay="100"
    :content="{ side: 'bottom', align: 'start', sideOffset: 8, collisionPadding: 16 }"
    :ui="{ content: 'w-80 max-w-[calc(100vw-2rem)] rounded-xl p-0' }"
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
      <a
        :href="source.url"
        target="_blank"
        rel="noopener noreferrer"
        class="block rounded-xl p-3.5 no-underline outline-none transition-colors hover:bg-elevated/70 focus-visible:bg-elevated/70"
      >
        <div class="flex items-center gap-2.5">
          <UAvatar
            :src="faviconUrl"
            :alt="displayLabel"
            :text="displayLabel"
            referrerpolicy="no-referrer"
            size="xs"
            class="ring-1 ring-accented"
          />
          <span class="min-w-0 flex-1 truncate text-sm font-medium text-default">
            {{ displayLabel }}
          </span>
          <UIcon name="i-lucide-arrow-up-right" class="size-3.5 shrink-0 text-dimmed" />
        </div>

        <p class="mt-2.5 line-clamp-2 text-sm leading-5 font-semibold text-default">
          {{ previewTitle }}
        </p>

        <p v-if="source.excerpt" class="mt-1.5 line-clamp-3 text-xs leading-5 text-muted">
          {{ source.excerpt }}
        </p>

        <p class="mt-2 truncate text-[11px] text-dimmed">{{ source.url }}</p>
      </a>
    </template>
  </UPopover>
</template>
