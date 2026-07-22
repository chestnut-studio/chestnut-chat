<script setup lang="ts">
import type { WebSearchProgress, WebSearchSource } from "@chestnut-chat/api/chat/web-search";

import { mergeWebSearchSources, sourceSiteLabel } from "~/utils/chat-sources";

const props = defineProps<{
  progress: WebSearchProgress;
  sources: WebSearchSource[];
}>();

const { t } = useI18n();

const open = ref(false);

const displaySources = computed(() =>
  mergeWebSearchSources(props.progress.sources ?? [], props.sources),
);

const isSearching = computed(() => props.progress.status === "searching");
const isError = computed(() => props.progress.status === "error");
const canOpenSources = computed(() => !isSearching.value && displaySources.value.length > 0);

const readingLabels = computed(() => {
  const labels = displaySources.value
    .map((source) => sourceSiteLabel(source))
    .filter((label, index, list) => label && list.indexOf(label) === index);
  return labels.slice(0, 3);
});

const statusTitle = computed(() => {
  if (isSearching.value) return t("chat.searchingWeb");
  if (isError.value) return t("chat.webSearchFailed");
  if (displaySources.value.length) {
    return t("chat.webSearchGrounded", { count: displaySources.value.length });
  }
  return t("chat.searchedWeb");
});

const statusDetail = computed(() => {
  if (isError.value) return props.progress.error || props.progress.query;
  if (isSearching.value) return props.progress.query;
  if (readingLabels.value.length) {
    return t("chat.webSearchReading", { sites: readingLabels.value.join(", ") });
  }
  return props.progress.query;
});

function onStatusClick() {
  if (!canOpenSources.value) return;
  open.value = true;
}
</script>

<template>
  <div class="mb-3 w-full min-w-0">
    <button
      type="button"
      class="flex w-full min-w-0 items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors"
      :class="[
        isError
          ? 'border-error/30 bg-error/5'
          : isSearching
            ? 'border-primary/25 bg-primary/5'
            : 'border-default/80 bg-elevated/40',
        canOpenSources ? 'cursor-pointer hover:border-primary/35 hover:bg-elevated' : 'cursor-default',
      ]"
      :disabled="!canOpenSources"
      :aria-expanded="canOpenSources ? open : undefined"
      :aria-haspopup="canOpenSources ? 'dialog' : undefined"
      @click="onStatusClick"
    >
      <div
        class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg"
        :class="
          isError
            ? 'bg-error/10 text-error'
            : isSearching
              ? 'bg-primary/10 text-primary'
              : 'bg-elevated text-muted'
        "
      >
        <UIcon
          :name="
            isError
              ? 'i-lucide-globe-off'
              : isSearching
                ? 'i-lucide-loader-circle'
                : 'i-lucide-radar'
          "
          class="size-3.5"
          :class="isSearching ? 'animate-spin' : undefined"
        />
      </div>

      <div class="min-w-0 flex-1">
        <p class="text-sm font-medium text-default">{{ statusTitle }}</p>
        <p class="mt-0.5 truncate text-xs text-muted" :title="statusDetail">
          {{ statusDetail }}
        </p>
      </div>

      <UIcon
        v-if="canOpenSources"
        name="i-lucide-panel-right"
        class="mt-1 size-3.5 shrink-0 text-dimmed"
      />
    </button>

    <USlideover
      v-model:open="open"
      side="right"
      :title="t('chat.webSearchSources')"
      :description="t('chat.webSearchSourcesDescription', { count: displaySources.length })"
      :ui="{ content: 'max-w-md' }"
    >
      <template #body>
        <ChatSourceList :sources="displaySources" />
      </template>
    </USlideover>
  </div>
</template>
