<script setup lang="ts">
import { FileSearch, Search } from "~/utils/icons";
import { BButton, BInput, BPopover, BTooltip } from "@chestnut-chat/ui";
import type { ProviderModel } from "~/composables/useProviderKeys";

const props = defineProps<{
  providerId: string;
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
  <BPopover
    :open="open"
    :content="{ align: 'end', side: 'bottom', sideOffset: 8 }"
    :ui="{ content: 'w-[min(calc(100vw-2rem),30rem)] overflow-hidden p-0' }"
    @update:open="updateOpen"
  >
    <BTooltip :text="$t('settings.fetchModels')">
      <BButton
        variant="ghost"
        size="small"
        icon-only
        :leading-icon="FileSearch"
        :disabled="loading"
        :aria-label="$t('settings.fetchModels')"
      />
    </BTooltip>

    <template #content>
      <div class="bg-background-full">
        <div class="border-border-button-default border-b p-2">
          <BInput
            v-model="query"
            :leading-icon="Search"
            :placeholder="$t('settings.searchModels')"
            class="w-full"
          />
        </div>

        <div class="max-h-80 overflow-y-auto p-2">
          <div
            v-if="loading && !models.length"
            class="text-text-secondary flex min-h-32 items-center justify-center gap-2 text-body-2-regular"
          >
            <BIcon name="i-ri-loader-4-line" class="size-4 animate-spin" />
            <span>{{ $t("settings.fetchingModels") }}</span>
          </div>

          <div
            v-else-if="!filteredModels.length"
            class="text-text-secondary flex min-h-32 items-center justify-center text-body-2-regular"
          >
            {{ $t(emptyLabel) }}
          </div>

          <div v-else class="space-y-1">
            <button
              v-for="model in filteredModels"
              :key="model.id"
              type="button"
              class="flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-start text-body-2-regular transition hover:bg-background-primary-default disabled:cursor-default disabled:hover:bg-transparent"
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
                <span
                  v-if="model.name || model.ownedBy"
                  class="text-text-secondary block truncate text-caption-1-regular"
                >
                  {{ model.name || model.ownedBy }}
                </span>
              </span>
              <SettingsModelCapabilityIcons :provider-id="providerId" :model="model" compact />
              <BIcon
                :name="isConfigured(model.id) ? 'i-ri-check-line' : 'i-ri-add-line'"
                class="text-text-secondary size-4 shrink-0"
              />
            </button>
          </div>
        </div>

        <div v-if="!loading" class="border-border-button-default border-t p-2">
          <BButton variant="ghost" class="w-full" @click="emit('refresh')">
            <BIcon name="i-ri-refresh-line" class="size-5 shrink-0" />
            {{ $t("settings.refreshCatalog") }}
          </BButton>
        </div>
      </div>
    </template>
  </BPopover>
</template>
