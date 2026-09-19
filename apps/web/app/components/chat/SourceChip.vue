<script setup lang="ts">
import { BAvatar, BButtonLink, BPopover } from "@chestnut-chat/ui";
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
  <BPopover
    mode="hover"
    :open-delay="220"
    :close-delay="100"
    :content="{ side: 'bottom', align: 'start', sideOffset: 8, collisionPadding: 16 }"
    :ui="{ content: 'w-80 max-w-[calc(100vw-2rem)] rounded-xl p-0' }"
  >
    <BButtonLink
      :href="source.url"
      target="_blank"
      rel="noopener noreferrer"
      variant="secondary"
      size="xs"
      class="max-w-52 rounded-full font-normal"
      :aria-label="previewTitle"
    >
      <img
        :src="faviconUrl"
        :alt="displayLabel"
        referrerpolicy="no-referrer"
        class="size-4 shrink-0 rounded-full object-cover ring-1 ring-accented"
      />
      <span class="max-w-40 truncate">{{ displayLabel }}</span>
      <span v-if="additionalCount" class="shrink-0 text-text-tertiary">+{{ additionalCount }}</span>
    </BButtonLink>

    <template #content>
      <a
        :href="source.url"
        target="_blank"
        rel="noopener noreferrer"
        class="block rounded-xl p-3.5 no-underline outline-none transition-colors hover:bg-elevated/70 focus-visible:bg-elevated/70"
      >
        <div class="flex items-center gap-2.5">
          <BAvatar
            :src="faviconUrl"
            :alt="displayLabel"
            :initials="displayLabel"
            size="xs"
            class="ring-1 ring-accented"
          />
          <span class="min-w-0 flex-1 truncate text-sm font-medium text-default">
            {{ displayLabel }}
          </span>
          <BIcon name="i-lucide-arrow-up-right" class="size-3.5 shrink-0 text-dimmed" />
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
  </BPopover>
</template>
