<script setup lang="ts">
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
        class="group flex gap-3 rounded-xl border border-default/80 bg-default p-3 no-underline transition-[border-color,background-color] hover:border-primary/35 hover:bg-elevated"
      >
        <span
          class="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-elevated text-xs font-medium text-muted"
        >
          {{ index + 1 }}
        </span>

        <div class="min-w-0 flex-1">
          <div class="flex min-w-0 items-center gap-2">
            <UAvatar
              :src="sourceFaviconUrl(source.url)"
              :alt="sourceSiteLabel(source)"
              :text="sourceSiteLabel(source)"
              referrerpolicy="no-referrer"
              size="3xs"
              class="ring-1 ring-accented"
            />
            <span class="truncate text-xs text-muted">{{ sourceSiteLabel(source) }}</span>
            <UIcon
              name="i-lucide-arrow-up-right"
              class="ml-auto size-3.5 shrink-0 text-dimmed opacity-0 transition-opacity group-hover:opacity-100"
            />
          </div>

          <p class="mt-1.5 line-clamp-2 text-sm leading-5 font-medium text-default">
            {{ sourceTitle(source) }}
          </p>

          <p v-if="source.excerpt" class="mt-1 line-clamp-3 text-xs leading-5 text-muted">
            {{ source.excerpt }}
          </p>
        </div>
      </a>
    </li>
  </ul>
</template>
