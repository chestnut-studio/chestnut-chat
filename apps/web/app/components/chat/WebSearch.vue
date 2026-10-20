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

const isPlanning = computed(() => props.progress.status === "planning");
const isSearching = computed(() => props.progress.status === "searching");
const isPending = computed(() => isPlanning.value || isSearching.value);
const isError = computed(() => props.progress.status === "error");
const canOpenSources = computed(() => !isPending.value && displaySources.value.length > 0);

const readingLabels = computed(() => {
  const labels = displaySources.value
    .map((source) => sourceSiteLabel(source))
    .filter((label, index, list) => label && list.indexOf(label) === index);
  return labels.slice(0, 3);
});

const statusTitle = computed(() => {
  if (isPlanning.value) return t("chat.planningWebSearch");
  if (isSearching.value) return t("chat.searchingWeb");
  if (isError.value) return t("chat.webSearchFailed");
  if (displaySources.value.length) {
    return t("chat.webSearchGrounded", { count: displaySources.value.length });
  }
  return t("chat.searchedWeb");
});

const statusDetail = computed(() => {
  if (isError.value) return props.progress.error || props.progress.query;
  if (isPlanning.value) return "";
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
      class="flex w-full min-w-0 items-start gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition-colors"
      :class="[
        isError
          ? 'border-border-error-default/30 bg-text-error-primary/5'
          : isPending
            ? 'border-primary/25 bg-primary/5'
            : 'border-border-button-default bg-background-secondary-default',
        canOpenSources
          ? 'cursor-pointer hover:border-primary/35 hover:bg-background-primary-default'
          : 'cursor-default',
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
            ? 'bg-text-error-primary/10 text-text-error-primary'
            : isPending
              ? 'bg-primary/10 text-primary'
              : 'bg-background-primary-default text-text-secondary'
        "
      >
        <BIcon
          :name="isError ? 'i-ri-earth-line' : isPending ? 'i-ri-loader-4-line' : 'i-ri-radar-line'"
          class="size-3.5"
          :class="isPending ? 'animate-spin' : undefined"
        />
      </div>

      <div class="min-w-0 flex-1">
        <p class="text-body-2-medium text-text-primary">{{ statusTitle }}</p>
        <p
          v-if="statusDetail"
          class="mt-0.5 truncate text-caption-1-regular text-text-secondary"
          :title="statusDetail"
        >
          {{ statusDetail }}
        </p>
      </div>

      <BIcon
        v-if="canOpenSources"
        name="i-ri-layout-right-line"
        class="mt-1 size-3.5 shrink-0 text-text-tertiary"
      />
    </button>

    <BSlideover
      v-model:open="open"
      :title="t('chat.webSearchSources')"
      :description="t('chat.webSearchSourcesDescription', { count: displaySources.length })"
    >
      <template #body>
        <ChatSourceList :sources="displaySources" />
      </template>
    </BSlideover>
  </div>
</template>
