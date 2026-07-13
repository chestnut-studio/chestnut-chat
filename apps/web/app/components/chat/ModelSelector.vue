<script setup lang="ts">
import type { ModelOption } from "~/utils/models";

import ModelIcon from "./ModelIcon.vue";

const props = defineProps<{
  items: readonly ModelOption[];
  loading?: boolean;
}>();

const model = defineModel<string>({ required: true });

const open = shallowRef(false);
const query = shallowRef("");

const selectedOption = computed(() => props.items.find((item) => item.value === model.value));

const selectedLabel = computed(() => selectedOption.value?.label ?? model.value);

const selectedProviderIcon = computed(() => selectedOption.value?.providerIcon ?? "openrouter");

const filteredItems = computed(() => {
  const term = query.value.trim().toLowerCase();
  if (!term) return props.items;

  return props.items.filter((item) =>
    [item.label, item.providerName, item.value].some((value) => value.toLowerCase().includes(term)),
  );
});

function updateOpen(value: boolean) {
  open.value = value;
  if (value) {
    query.value = "";
  }
}

function selectModel(value: string) {
  model.value = value;
  open.value = false;
  query.value = "";
}
</script>

<template>
  <UPopover
    :open="open"
    :content="{ align: 'start', side: 'bottom', sideOffset: 8 }"
    :ui="{ content: 'w-[min(calc(100vw-2rem),38rem)] overflow-hidden p-0' }"
    @update:open="updateOpen"
  >
    <UButton
      type="button"
      color="neutral"
      :variant="open ? 'soft' : 'ghost'"
      size="sm"
      class="max-w-full justify-start sm:max-w-80"
      :title="selectedLabel"
      :aria-label="$t('chat.selectModel')"
      :loading="loading && !items.length"
    >
      <ModelIcon :icon="selectedProviderIcon" />
      <span class="min-w-0 truncate text-left">{{ selectedLabel }}</span>
      <UIcon name="i-lucide-chevron-down" class="size-4 shrink-0 text-muted" />
    </UButton>

    <template #content>
      <div class="bg-default">
        <div class="border-default border-b p-3">
          <p class="text-muted mb-1 text-xs font-medium">{{ $t("chat.selectedModel") }}</p>
          <div class="flex items-start gap-2">
            <ModelIcon :icon="selectedProviderIcon" />
            <p class="min-w-0 flex-1 wrap-break-word text-sm font-medium">
              {{ selectedLabel }}
            </p>
          </div>
        </div>

        <div class="border-default border-b p-2">
          <UInput
            v-model="query"
            icon="i-lucide-search"
            variant="none"
            autofocus
            :placeholder="$t('chat.searchModels')"
            class="w-full"
            :ui="{ base: 'text-base' }"
          />
        </div>

        <div
          class="max-h-80 overflow-y-auto p-2"
          role="listbox"
          :aria-label="$t('chat.selectModel')"
        >
          <div
            v-if="!filteredItems.length"
            class="text-muted flex min-h-28 items-center justify-center text-sm"
          >
            {{ $t("chat.noMatchingModels") }}
          </div>

          <div v-else class="space-y-1">
            <button
              v-for="item in filteredItems"
              :key="item.value"
              type="button"
              class="flex min-h-11 w-full items-start gap-3 rounded-md px-3 py-2 text-start text-sm transition hover:bg-elevated"
              role="option"
              :aria-selected="item.value === model"
              @click="selectModel(item.value)"
            >
              <ModelIcon :icon="item.providerIcon" />

              <span class="min-w-0 flex-1">
                <span class="block wrap-break-word font-medium">{{ item.label }}</span>
                <span class="text-muted mt-0.5 block truncate text-xs">
                  {{ item.providerName }}
                </span>
              </span>

              <UIcon
                v-if="item.reasoning"
                name="i-lucide-brain"
                class="size-4 shrink-0 text-primary"
                role="img"
                :aria-label="$t('chat.reasoningSupported')"
              />

              <UIcon
                v-if="item.value === model"
                name="i-lucide-check"
                class="size-4 shrink-0 text-primary"
              />
            </button>
          </div>
        </div>
      </div>
    </template>
  </UPopover>
</template>
