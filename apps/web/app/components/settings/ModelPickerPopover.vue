<script setup lang="ts">
const props = defineProps<{
  models: readonly ProviderModel[];
  configuredModelIds: readonly string[];
  loading: boolean;
}>();

const emit = defineEmits<{
  open: [];
  refresh: [];
  add: [model: ProviderModel];
}>();

const query = shallowRef("");
const open = shallowRef(false);

const configuredModelIdSet = computed(() => new Set(props.configuredModelIds));

const filteredModels = computed(() => {
  const term = query.value.trim().toLowerCase();
  if (!term) return props.models;

  return props.models.filter((model) =>
    [model.id, model.name, model.ownedBy]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(term)),
  );
});

const emptyLabel = computed(() =>
  query.value.trim() ? "settings.noMatchingModels" : "settings.noFetchedModels",
);

function updateOpen(value: boolean) {
  open.value = value;
  if (value) {
    query.value = "";
    emit("open");
  }
}

function isConfigured(modelId: string) {
  return configuredModelIdSet.value.has(modelId);
}
</script>

<template>
  <UPopover
    :open="open"
    :content="{ align: 'end', side: 'bottom', sideOffset: 8 }"
    :ui="{ content: 'w-[min(calc(100vw-2rem),30rem)] overflow-hidden p-0' }"
    @update:open="updateOpen"
  >
    <UTooltip :text="$t('settings.fetchModels')">
      <UButton
        icon="i-lucide-file-search"
        size="sm"
        color="neutral"
        :variant="open ? 'soft' : 'ghost'"
        square
        :loading="loading"
        :aria-label="$t('settings.fetchModels')"
      />
    </UTooltip>

    <template #content>
      <div class="bg-default">
        <div class="border-default border-b p-2">
          <UInput
            v-model="query"
            icon="i-lucide-search"
            variant="none"
            autofocus
            :placeholder="$t('settings.searchModels')"
            class="w-full"
            :ui="{ base: 'text-base' }"
          />
        </div>

        <div class="max-h-80 overflow-y-auto p-2">
          <div
            v-if="loading && !models.length"
            class="text-muted flex min-h-32 items-center justify-center gap-2 text-sm"
          >
            <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
            <span>{{ $t("settings.fetchingModels") }}</span>
          </div>

          <div
            v-else-if="!filteredModels.length"
            class="text-muted flex min-h-32 items-center justify-center text-sm"
          >
            {{ $t(emptyLabel) }}
          </div>

          <div v-else class="space-y-1">
            <button
              v-for="model in filteredModels"
              :key="model.id"
              type="button"
              class="flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-start text-sm transition hover:bg-elevated disabled:cursor-default disabled:hover:bg-transparent"
              :disabled="isConfigured(model.id)"
              :aria-label="
                isConfigured(model.id)
                  ? $t('settings.modelAlreadyAdded', { id: model.id })
                  : $t('settings.addFetchedModel', { id: model.id })
              "
              @click="emit('add', model)"
            >
              <span class="min-w-0 flex-1">
                <span class="block truncate font-medium">{{ model.id }}</span>
                <span v-if="model.name || model.ownedBy" class="text-muted block truncate text-xs">
                  {{ model.name || model.ownedBy }}
                </span>
              </span>
              <UIcon
                :name="isConfigured(model.id) ? 'i-lucide-check' : 'i-lucide-plus'"
                class="text-muted size-4 shrink-0"
              />
            </button>
          </div>
        </div>

        <div v-if="!loading" class="border-default border-t p-2">
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            block
            :label="$t('settings.refreshCatalog')"
            @click="emit('refresh')"
          />
        </div>
      </div>
    </template>
  </UPopover>
</template>
