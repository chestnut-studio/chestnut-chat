<script setup lang="ts">
import type { LinkNodeProps } from "markstream-vue";

import { chatWebSearchSourcesKey, normalizeSourceUrl } from "~/utils/chat-sources";

const props = defineProps<LinkNodeProps>();
const sources = inject(chatWebSearchSourcesKey, () => []);

const citationSource = computed(() => {
  const href = normalizeSourceUrl(props.node.href);
  return sources().find((source) => normalizeSourceUrl(source.url) === href);
});

const safeHref = computed(() => {
  const href = props.node.href.trim();
  if (/^(?:#|\/|\.\/|\.\.\/)/u.test(href)) return href;

  try {
    const url = new URL(href);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
});

const isExternal = computed(() => /^https?:/u.test(safeHref.value ?? ""));
const linkText = computed(() => props.node.text || props.node.href);
</script>

<template>
  <ChatSourceChip v-if="citationSource" :source="citationSource" :label="linkText" />

  <a
    v-else-if="safeHref"
    :href="safeHref"
    :target="isExternal ? '_blank' : undefined"
    :rel="isExternal ? 'noopener noreferrer' : undefined"
    class="font-medium text-primary underline decoration-primary/35 underline-offset-2 transition-colors hover:decoration-primary"
  >
    {{ linkText }}
  </a>

  <span v-else>{{ linkText }}</span>
</template>
