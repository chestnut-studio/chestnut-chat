<script setup lang="ts">
import { BChip, BSkeleton, BTooltip } from "@chestnut-chat/ui";
import { projectIconColorClass, projectIconName } from "@chestnut-chat/api/project/icons";

import type { ChatBoxProject } from "./Box.vue";
import ModelIcon from "./ModelIcon.vue";

const props = withDefaults(
  defineProps<{
    title: string;
    /** Encoded chat model value (e.g. `builtin:openrouter:openrouter%2Ffree`). */
    model?: string | null;
    /** Whether reasoning is enabled for the current chat options. */
    reasoning?: boolean;
    /** Whether web search is enabled for the current chat options. */
    webSearch?: boolean;
    project?: ChatBoxProject | null;
  }>(),
  { model: null, reasoning: false, webSearch: false, project: null },
);

const { t } = useI18n();
const { findModelOption, isLoading: areModelsLoading } = useModelOptions();

const modelOption = computed(() => (props.model ? findModelOption(props.model) : undefined));

const modelLabel = computed(() => {
  if (modelOption.value) return modelOption.value.label;

  const decoded = props.model ? decodeChatModelValue(props.model) : null;
  if (decoded) return `${decoded.providerId} - ${decoded.modelId}`;

  return props.model ?? DEFAULT_MODEL;
});

const modelIcon = computed(() => modelOption.value?.providerIcon ?? "openrouter");

const providerName = computed(() => modelOption.value?.providerName);

const reasoningActive = computed(() => props.reasoning && (modelOption.value?.reasoning ?? false));

const showModelSkeleton = computed(() => areModelsLoading.value && !modelOption.value);
</script>

<template>
  <header class="flex h-14 shrink-0 items-center justify-between gap-3 px-4 sm:px-6">
    <div class="flex min-w-0 flex-1 items-center gap-2">
      <BTooltip :text="title">
        <h1 class="min-w-0 truncate text-body-2-semibold text-text-primary sm:text-body-semibold">
          {{ title }}
        </h1>
      </BTooltip>

      <span
        v-if="project"
        class="hidden shrink-0 items-center gap-1.5 rounded-full border border-border-button-default bg-background-primary-default px-2.5 py-1 text-caption-1-medium text-text-secondary shadow-card sm:flex"
      >
        <span v-if="project.iconKind === 'emoji'" aria-hidden="true">{{ project.iconValue }}</span>
        <BIcon
          v-else
          :name="projectIconName(project.iconValue)"
          class="size-3.5"
          :class="projectIconColorClass(project.iconColor)"
        />
        <span class="max-w-40 truncate">{{ project.name }}</span>
      </span>
    </div>

    <BSkeleton v-if="showModelSkeleton" class="h-7 w-28 shrink-0 rounded-full" />

    <BTooltip
      v-else
      :content="{ align: 'end', side: 'bottom', sideOffset: 8 }"
      :ui="{
        content:
          'bg-background-primary-default text-text-primary shadow-dropdown rounded-xl border border-border-button-default h-auto p-3 select-none pointer-events-auto',
      }"
    >
      <span
        class="flex min-w-0 items-center gap-1.5 rounded-full border border-border-button-default bg-background-primary-default py-1 pe-3 ps-2 text-caption-1-regular text-text-primary shadow-card"
        :aria-label="t('chat.modelUsed')"
      >
        <ModelIcon :icon="modelIcon" />
        <span class="max-w-44 truncate font-medium sm:max-w-64">{{ modelLabel }}</span>
        <BIcon
          v-if="reasoningActive"
          name="i-ri-brain-line"
          class="size-3.5 shrink-0 text-accent-600"
        />
        <BIcon
          v-if="webSearch"
          name="i-ri-global-line"
          class="size-3.5 shrink-0 text-text-secondary"
        />
      </span>

      <template #content>
        <div class="max-w-64 space-y-1.5">
          <p class="text-caption-2-semibold uppercase tracking-wide text-text-tertiary">
            {{ t("chat.modelUsed") }}
          </p>

          <div class="flex items-center gap-2">
            <ModelIcon :icon="modelIcon" />
            <div class="min-w-0">
              <p class="wrap-break-word text-body-2-medium">{{ modelLabel }}</p>
              <p v-if="providerName" class="truncate text-caption-1-regular text-text-secondary">
                {{ providerName }}
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-1.5">
            <ModelCapabilityTags
              v-if="modelOption"
              :reasoning="modelOption.reasoning"
              :vision="modelOption.vision"
            />
            <BChip v-if="reasoningActive" variant="caption" color="blue">
              <BIcon name="i-ri-brain-line" class="size-3.5 shrink-0" />
              {{ t("chat.reasoningActive") }}
            </BChip>
            <BChip v-if="webSearch" variant="caption" color="neutral">
              <BIcon name="i-ri-global-line" class="size-3.5 shrink-0" />
              {{ t("chat.webSearch") }}
            </BChip>
          </div>
        </div>
      </template>
    </BTooltip>
  </header>
</template>
