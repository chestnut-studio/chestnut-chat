<script setup lang="ts">
import { projectIconColorClass } from "@chestnut-chat/api/project/icons";

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
  <header
    class="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-default px-4 sm:px-6"
  >
    <div class="flex min-w-0 flex-1 items-center gap-2">
      <UTooltip :text="title" :content="{ side: 'bottom', sideOffset: 6 }">
        <h1 class="min-w-0 truncate text-sm font-semibold text-highlighted sm:text-base">
          {{ title }}
        </h1>
      </UTooltip>

      <NuxtLink
        v-if="project"
        :to="projectPath(project.id)"
        class="hidden shrink-0 items-center gap-1.5 rounded-full border border-default px-2.5 py-1 text-xs text-muted transition hover:border-primary/40 hover:text-highlighted sm:flex"
      >
        <span v-if="project.iconKind === 'emoji'" aria-hidden="true">{{ project.iconValue }}</span>
        <UIcon
          v-else
          :name="`i-lucide-${project.iconValue}`"
          class="size-3.5"
          :class="projectIconColorClass(project.iconColor)"
        />
        <span class="max-w-40 truncate">{{ project.name }}</span>
      </NuxtLink>
    </div>

    <USkeleton v-if="showModelSkeleton" class="h-7 w-28 shrink-0 rounded-full" />

    <UTooltip
      v-else
      :content="{ align: 'end', side: 'bottom', sideOffset: 8 }"
      :ui="{
        content:
          'bg-default text-highlighted shadow-sm rounded-sm ring ring-default h-auto p-3 select-none data-[state=delayed-open]:animate-[scale-in_100ms_ease-out] data-[state=closed]:animate-[scale-out_100ms_ease-in] origin-(--reka-tooltip-content-transform-origin) pointer-events-auto',
      }"
    >
      <span
        class="flex min-w-0 items-center gap-1.5 rounded-full border border-default bg-elevated/60 py-1 pe-3 ps-2 text-xs"
        :aria-label="t('chat.modelUsed')"
      >
        <ModelIcon :icon="modelIcon" />
        <span class="max-w-44 truncate font-medium sm:max-w-64">{{ modelLabel }}</span>
        <UIcon
          v-if="reasoningActive"
          name="i-lucide-brain"
          class="size-3.5 shrink-0 text-primary"
        />
        <UIcon v-if="webSearch" name="i-lucide-globe" class="size-3.5 shrink-0 text-muted" />
      </span>

      <template #content>
        <div class="max-w-64 space-y-1.5">
          <p class="text-muted text-[10px] font-medium uppercase tracking-wide">
            {{ t("chat.modelUsed") }}
          </p>

          <div class="flex items-center gap-2">
            <ModelIcon :icon="modelIcon" />
            <div class="min-w-0">
              <p class="wrap-break-word text-sm font-medium">{{ modelLabel }}</p>
              <p v-if="providerName" class="text-muted truncate text-xs">{{ providerName }}</p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-1.5">
            <ModelCapabilityTags
              v-if="modelOption"
              :reasoning="modelOption.reasoning"
              :vision="modelOption.vision"
            />
            <UBadge
              v-if="reasoningActive"
              color="primary"
              variant="subtle"
              size="sm"
              icon="i-lucide-brain"
              :label="t('chat.reasoningActive')"
            />
            <UBadge
              v-if="webSearch"
              color="neutral"
              variant="subtle"
              size="sm"
              icon="i-lucide-globe"
              :label="t('chat.webSearch')"
            />
          </div>
        </div>
      </template>
    </UTooltip>
  </header>
</template>
