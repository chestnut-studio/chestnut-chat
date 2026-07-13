<script setup lang="ts">
import type { WebSearchSource } from "@chestnut-chat/api/chat/web-search";
import MarkdownRender, { setCustomComponents } from "markstream-vue";

import ChatMarkdownLink from "~/components/chat/MarkdownLink.vue";
import { chatWebSearchSourcesKey } from "~/utils/chat-sources";

setCustomComponents("chat", {
  link: ChatMarkdownLink,
});

const props = defineProps<{
  content: string;
  live: boolean;
  sources: WebSearchSource[];
}>();

provide(chatWebSearchSourcesKey, () => props.sources);
</script>

<template>
  <MarkdownRender
    custom-id="chat"
    mode="chat"
    :content="content"
    :final="!live"
    :smooth-streaming="false"
    :typewriter="live"
    :fade="false"
    :max-live-nodes="0"
    class="*:first:mt-0 *:last:mb-0"
  />
</template>
