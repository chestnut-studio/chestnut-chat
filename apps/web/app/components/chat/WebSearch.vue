<script setup lang="ts">
import type { WebSearchProgress, WebSearchSource } from "@chestnut-chat/api/chat/web-search";

const props = defineProps<{
  progress: WebSearchProgress;
  sources: WebSearchSource[];
}>();

const { t } = useI18n();
const isSearching = computed(() => props.progress.status === "searching");
const label = computed(() => {
  if (isSearching.value) return t("chat.searchingWeb");
  return props.progress.status === "error" ? t("chat.webSearchFailed") : t("chat.searchedWeb");
});
</script>

<template>
  <UChatTool
    :text="label"
    icon="i-lucide-globe"
    :streaming="isSearching"
    :default-open="isSearching"
    variant="card"
    class="w-full min-w-0"
    :ui="{
      trigger: 'min-w-0',
      content: 'min-w-0',
      body: 'min-w-0',
    }"
  >
    <p>{{ progress.query }}</p>

    <p v-if="progress.error" class="mt-2 text-sm text-error">{{ progress.error }}</p>

    <div v-if="sources.length" class="mt-3 flex min-w-0 flex-wrap gap-1.5">
      <ChatSourceChip v-for="source in sources" :key="source.sourceId" :source="source" />
    </div>
  </UChatTool>
</template>
