<script setup lang="ts">
import { CircleCheck, CircleHelp, CircleX, Pencil, Plus, Trash2 } from "lucide-vue-next";
import { BButton, BChip, BTooltip } from "@chestnut-chat/ui";
import type { ProviderModel } from "~/composables/useProviderKeys";
import type {
  ConnectionTestStatus,
  ProviderCreditsEntry,
  ProviderEditForm,
  SettingsProviderCard,
} from "~/types/providers";
import { formatProviderCredits } from "~/utils/format-credits";

const props = defineProps<{
  provider: SettingsProviderCard;
  editing: boolean;
  editForm: ProviderEditForm | null;
  fetchingModels: boolean;
  modelCatalog: readonly ProviderModel[];
  connectionStatus: ConnectionTestStatus;
  credits: ProviderCreditsEntry;
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

const creditsLabel = computed(() => {
  const { credits, state } = props.credits;
  if (state === "loading") return t("settings.creditsLoading");
  if (state === "unsupported") return t("settings.creditsUnsupported");
  if (state === "error") return credits?.error ?? t("settings.creditsFailed");
  if (!credits) return "";

  const formatted = formatProviderCredits(credits);
  if (!formatted) return "";

  if (credits.kind === "currency") {
    return credits.label === "remaining"
      ? t("settings.creditsRemaining", { amount: formatted })
      : t("settings.creditsBalance", { amount: formatted });
  }

  if (credits.kind === "usage_percent") {
    return t("settings.creditsUsageRemaining", { amount: formatted });
  }

  return t("settings.creditsTokensRemaining", { amount: formatted });
});

const showCredits = computed(() => props.credits.state !== "idle");

const creditsColor = computed(() => {
  if (props.credits.state === "error") return "rose";
  if (props.credits.state === "unsupported") return "neutral";
  return "blue";
});

const connectionIconComponent = computed(() => {
  if (props.connectionStatus === "success") return CircleCheck;
  if (props.connectionStatus === "error") return CircleX;
  return CircleHelp;
});
</script>

<template>
  <div class="group border-default rounded-xl border bg-background">
    <div class="flex items-center gap-3 p-4">
      <ProviderIcon :provider="provider.iconProvider" size="sm" />
      <div class="min-w-0 flex-1">
        <p class="font-semibold">{{ provider.name }}</p>
        <div v-if="showCredits" class="mt-1 flex items-center gap-1.5">
          <BIcon
            v-if="credits.state === 'loading'"
            name="i-lucide-loader-circle"
            class="text-muted size-3.5 animate-spin"
          />
          <BChip v-else variant="caption" :color="creditsColor" class="max-w-full truncate">
            {{ creditsLabel }}
          </BChip>
        </div>
      </div>
      <div class="flex items-center gap-1">
        <div
          v-if="!editing"
          class="invisible flex items-center gap-1 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
        >
          <BTooltip :text="$t('settings.editProvider')">
            <BButton
              variant="ghost"
              size="small"
              icon-only
              :leading-icon="Pencil"
              :aria-label="$t('settings.editProvider')"
              @click="emit('edit')"
            />
          </BTooltip>
          <BTooltip :text="$t('actions.delete')">
            <BButton
              variant="ghost"
              size="small"
              icon-only
              :leading-icon="Trash2"
              :aria-label="$t('actions.delete')"
              @click="emit('delete')"
            />
          </BTooltip>
        </div>
        <BTooltip v-if="!editing" :text="connectionLabel">
          <BButton
            variant="ghost"
            size="small"
            icon-only
            :leading-icon="connectionIconComponent"
            :disabled="connectionStatus === 'testing'"
            :aria-label="connectionLabel"
            @click="emit('testConnection')"
          />
        </BTooltip>
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
          <BTooltip :text="$t('settings.addModelManually')">
            <BButton
              variant="ghost"
              size="small"
              icon-only
              :leading-icon="Plus"
              :aria-label="$t('settings.addModelManually')"
              @click="emit('addModel')"
            />
          </BTooltip>
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
          <BIcon
            :name="model.source === 'manual' ? 'i-lucide-pencil-line' : 'i-lucide-box'"
            class="text-muted size-4 shrink-0"
          />
          <div class="min-w-0 flex-1">
            <p class="truncate font-mono text-sm">{{ model.id }}</p>
            <p v-if="model.name || model.ownedBy" class="text-muted truncate text-xs">
              {{ model.name || model.ownedBy }}
            </p>
          </div>
          <SettingsModelCapabilityIcons :provider-id="provider.id" :model="model" compact />
          <BButton
            variant="ghost"
            size="xs"
            icon-only
            :leading-icon="Trash2"
            :aria-label="$t('settings.removeModel')"
            @click="emit('removeModel', model.id)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
