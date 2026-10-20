<script setup lang="ts">
import { BAvatar } from "@chestnut-chat/ui";
import type { WebSearchSource } from "@chestnut-chat/api/chat/web-search";

import { sourceFaviconUrl, sourceSiteLabel, sourceTitle } from "~/utils/chat-sources";

defineProps<{
  sources: WebSearchSource[];
}>();
</script>

<template>
  <ul class="space-y-2" role="list">
    <li v-for="(source, index) in sources" :key="source.sourceId">
      <a
        :href="source.url"
        target="_blank"
        rel="noopener noreferrer"
        class="group flex gap-3 rounded-xl border border-border-button-default/80 bg-background-full p-3 no-underline transition-[border-color,background-color] hover:border-primary/35 hover:bg-background-primary-default"
      >
        <span
          class="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-background-primary-default text-caption-1-medium text-text-secondary"
        >
          {{ index + 1 }}
        </span>

        <div class="min-w-0 flex-1">
          <div class="flex min-w-0 items-center gap-2">
            <BAvatar
              :src="sourceFaviconUrl(source.url)"
              :alt="sourceSiteLabel(source)"
              :initials="sourceSiteLabel(source)"
              size="xs"
              class="ring-1 ring-border-button-default"
            />
            <span class="truncate text-caption-1-regular text-text-secondary">{{
              sourceSiteLabel(source)
            }}</span>
            <BIcon
              name="i-ri-arrow-right-up-line"
              class="ml-auto size-3.5 shrink-0 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100"
            />
          </div>

          <p
            class="mt-1.5 line-clamp-2 text-body-2-regular leading-5 font-medium text-text-primary"
          >
            {{ sourceTitle(source) }}
          </p>

          <p
            v-if="source.excerpt"
            class="mt-1 line-clamp-3 text-caption-1-regular leading-5 text-text-secondary"
          >
            {{ source.excerpt }}
          </p>
        </div>
      </a>
    </li>
  </ul>
</template>
