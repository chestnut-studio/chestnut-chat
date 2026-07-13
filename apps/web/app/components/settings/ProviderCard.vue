<script setup lang="ts">
import type {
  ConnectionTestStatus,
  ProviderEditForm,
  SettingsProviderCard,
} from "~/types/providers";

const props = defineProps<{
  provider: SettingsProviderCard;
  editing: boolean;
  editForm: ProviderEditForm | null;
  fetchingModels: boolean;
  modelCatalog: readonly ProviderModel[];
  connectionStatus: ConnectionTestStatus;
}>();

const emit = defineEmits<{
  edit: [];
  cancelEdit: [];
  saveEdit: [];
  updateEdit: [patch: Partial<ProviderEditForm>];
  delete: [];
  testConnection: [];
  openModelPicker: [];
  fetchModels: [];
  addFetchedModel: [model: ProviderModel];
  addModel: [];
  removeModel: [modelId: string];
}>();

const { t } = useI18n();

const modelHeading = computed(() =>
  props.provider.models.length
    ? t("settings.availableModels", { count: props.provider.models.length })
    : t("settings.noModelsConfigured"),
);

const configuredModelIds = computed(() => props.provider.models.map((model) => model.id));

const connectionIcon = computed(() => {
  if (props.connectionStatus === "success") return "i-lucide-circle-check";
  if (props.connectionStatus === "error") return "i-lucide-circle-x";
  return "i-lucide-circle-help";
});

const connectionColor = computed(() => {
  if (props.connectionStatus === "success") return "success";
  if (props.connectionStatus === "error") return "error";
  return "neutral";
});

const connectionLabel = computed(() => {
  if (props.connectionStatus === "testing") return t("settings.connectionTesting");
  if (props.connectionStatus === "success") {
    return t("settings.connectionTested", { name: props.provider.name });
  }
  if (props.connectionStatus === "error") {
    return t("settings.connectionTestFailed", { name: props.provider.name });
  }
  return t("settings.testConnection");
});
</script>

<template>
  <div class="group border-default rounded-xl border bg-background">
    <div class="flex items-center gap-3 p-4">
      <ProviderIcon :provider="provider.iconProvider" size="sm" />
      <div class="min-w-0 flex-1">
        <p class="font-semibold">{{ provider.name }}</p>
      </div>
      <div class="flex items-center gap-1">
        <div
          v-if="!editing"
          class="invisible flex items-center gap-1 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
        >
          <UTooltip :text="$t('settings.editProvider')">
            <UButton
              icon="i-lucide-pencil"
              size="sm"
              color="neutral"
              variant="ghost"
              square
              :aria-label="$t('settings.editProvider')"
              @click="emit('edit')"
            />
          </UTooltip>
          <UTooltip :text="$t('actions.delete')">
            <UButton
              icon="i-lucide-trash-2"
              size="sm"
              color="neutral"
              variant="ghost"
              square
              :aria-label="$t('actions.delete')"
              @click="emit('delete')"
            />
          </UTooltip>
        </div>
        <UTooltip v-if="!editing" :text="connectionLabel">
          <UButton
            :icon="connectionIcon"
            size="sm"
            :color="connectionColor"
            variant="ghost"
            square
            :loading="connectionStatus === 'testing'"
            :aria-label="connectionLabel"
            @click="emit('testConnection')"
          />
        </UTooltip>
      </div>
    </div>

    <div v-if="editing && editForm" class="border-default border-t px-4 py-4">
      <SettingsProviderFormFields
        :form="editForm"
        :save-label="$t('actions.save')"
        @cancel="emit('cancelEdit')"
        @save="emit('saveEdit')"
        @update="emit('updateEdit', $event)"
      />
    </div>

    <div v-else class="border-default border-t px-4 py-4">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <p class="font-medium">{{ modelHeading }}</p>
          <p v-if="!provider.models.length" class="text-muted mt-1 text-sm">
            {{ $t("settings.noModelsConfiguredHint") }}
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-1">
          <SettingsModelPickerPopover
            :provider-id="provider.id"
            :models="modelCatalog"
            :configured-model-ids="configuredModelIds"
            :loading="fetchingModels"
            @open="emit('openModelPicker')"
            @refresh="emit('fetchModels')"
            @add="emit('addFetchedModel', $event)"
          />
          <UTooltip :text="$t('settings.addModelManually')">
            <UButton
              icon="i-lucide-plus"
              size="sm"
              color="neutral"
              variant="ghost"
              square
              :aria-label="$t('settings.addModelManually')"
              @click="emit('addModel')"
            />
          </UTooltip>
        </div>
      </div>

      <div
        v-if="provider.models.length"
        class="border-default mt-3 max-h-64 overflow-y-auto rounded-lg border"
      >
        <div
          v-for="model in provider.models"
          :key="model.id"
          class="border-default flex min-h-12 items-center gap-3 border-b px-3 py-2 last:border-b-0"
        >
          <UIcon
            :name="model.source === 'manual' ? 'i-lucide-pencil-line' : 'i-lucide-box'"
            class="text-muted size-4 shrink-0"
          />
          <div class="min-w-0 flex-1">
            <p class="truncate font-mono text-sm">{{ model.id }}</p>
            <p v-if="model.name || model.ownedBy" class="text-muted truncate text-xs">
              {{ model.name || model.ownedBy }}
            </p>
          </div>
          <SettingsModelCapabilityIcons :provider-id="provider.id" :model="model" />
          <UButton
            icon="i-lucide-trash-2"
            size="xs"
            color="neutral"
            variant="ghost"
            square
            :aria-label="$t('settings.removeModel')"
            @click="emit('removeModel', model.id)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
