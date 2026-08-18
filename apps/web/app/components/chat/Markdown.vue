<script lang="ts">
import { full as markdownItEmojiFull } from "markdown-it-emoji";
import { registerMarkdownPlugin, setCustomComponents } from "markstream-vue";

import ChatMarkdownLink from "~/components/chat/MarkdownLink.vue";

// Registered once at module evaluation instead of on every component instance.
setCustomComponents("chat", {
  link: ChatMarkdownLink,
});
registerMarkdownPlugin(markdownItEmojiFull);
</script>

<script setup lang="ts">
import type { WebSearchSource } from "@chestnut-chat/api/chat/web-search";
import MarkdownRender from "markstream-vue";

import { chatWebSearchSourcesKey } from "~/utils/chat-sources";

const props = defineProps<{
  content: string;
  live: boolean;
  sources: WebSearchSource[];
}>();

provide(chatWebSearchSourcesKey, () => props.sources);

const colorMode = useColorMode();
const isDark = computed(() => colorMode.value === "dark");
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
    code-renderer="shiki"
    :is-dark="isDark"
    :themes="['vitesse-light', 'vitesse-dark']"
    :code-block-props="{
      darkTheme: 'vitesse-dark',
      lightTheme: 'vitesse-light',
    }"
    class="*:first:mt-0 *:last:mb-0"
  />
</template>
