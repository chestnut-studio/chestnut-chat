<script setup lang="ts">
import { Plus } from "lucide-vue-next";
import { BButton, BDropdown, BFormField, BInput, BModal, BSkeleton } from "@chestnut-chat/ui";

const {
  addProviderItems,
  providers,
  hasAnyProvider,
  isLoadingProviders,
  isSavingProvider,
  providerDraft,
  cancelProviderDraft,
  submitProviderDraft,
  updateProviderDraft,
  editForm,
  isEditingProvider,
  cancelEditProvider,
  submitEditProvider,
  updateEditForm,
  editProvider,
  requestDeleteProvider,
  cancelDeleteProvider,
  confirmDeleteProvider,
  deleteConfirmOpen,
  deleteProviderName,
  testConnectionForProvider,
  connectionStatusForProvider,
  fetchModelsForProvider,
  isFetchingModels,
  modelCatalogForProvider,
  ensureModelCatalog,
  addFetchedModel,
  openManualModel,
  removeModel,
  manualModelOpen,
  manualModelForm,
  manualModelProviderName,
  submitManualModel,
  loadProviderCredits,
  creditsForProvider,
} = useSettingsProviders();

onMounted(() => {
  void loadProviderCredits();
});
</script>

<template>
  <div class="mt-6 space-y-4">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h2 class="text-xl font-semibold">{{ $t("settings.apiProviders") }}</h2>
        <p class="text-muted mt-1 max-w-md text-sm">
          {{ $t("settings.apiProvidersDescription") }}
        </p>
      </div>
      <BDropdown :items="addProviderItems">
        <template #item-leading="{ item }">
          <ProviderIcon :provider="item.iconProvider ?? 'custom'" size="xs" />
        </template>

        <BButton
          variant="secondary"
          :leading-icon="Plus"
          :disabled="isLoadingProviders || isSavingProvider"
        >
          {{ $t("settings.addProvider") }}
        </BButton>
      </BDropdown>
    </div>

    <div v-if="isLoadingProviders" class="space-y-3">
      <BSkeleton class="h-28 w-full rounded-xl" />
      <BSkeleton class="h-28 w-full rounded-xl" />
    </div>

    <div
      v-else-if="!hasAnyProvider && !providerDraft"
      class="border-default rounded-xl border border-dashed py-14 text-center"
    >
      <BIcon name="i-lucide-key-round" class="text-muted mx-auto mb-3 size-10" />
      <p class="font-medium">{{ $t("settings.noProvidersYet") }}</p>
      <p class="text-muted mt-1 text-sm">{{ $t("settings.noProvidersYetHint") }}</p>
    </div>

    <SettingsProviderDraftCard
      v-if="providerDraft"
      :draft="providerDraft"
      @cancel="cancelProviderDraft"
      @save="submitProviderDraft"
      @update="updateProviderDraft"
    />

    <SettingsProviderCard
      v-for="provider in providers"
      :key="`${provider.kind}:${provider.id}`"
      :provider="provider"
      :editing="isEditingProvider(provider)"
      :edit-form="editForm"
      :fetching-models="isFetchingModels(provider)"
      :model-catalog="modelCatalogForProvider(provider)"
      :connection-status="connectionStatusForProvider(provider)"
      :credits="creditsForProvider(provider)"
      @edit="editProvider(provider)"
      @cancel-edit="cancelEditProvider"
      @save-edit="submitEditProvider(provider)"
      @update-edit="updateEditForm"
      @delete="requestDeleteProvider(provider)"
      @test-connection="testConnectionForProvider(provider)"
      @open-model-picker="ensureModelCatalog(provider)"
      @fetch-models="fetchModelsForProvider(provider)"
      @add-fetched-model="addFetchedModel(provider, $event)"
      @add-model="openManualModel(provider)"
      @remove-model="removeModel(provider, $event)"
    />

    <BModal
      v-model:open="deleteConfirmOpen"
      :title="$t('settings.deleteProviderTitle')"
      :description="$t('settings.deleteProviderDescription', { name: deleteProviderName })"
      :ui="{ footer: 'justify-end' }"
    >
      <template #footer>
        <BButton variant="secondary" :disabled="isSavingProvider" @click="cancelDeleteProvider">
          {{ $t("actions.cancel") }}
        </BButton>
        <BButton variant="danger" :disabled="isSavingProvider" @click="confirmDeleteProvider">
          {{ $t("actions.delete") }}
        </BButton>
      </template>
    </BModal>

    <BModal
      v-model:open="manualModelOpen"
      :title="$t('settings.addModelForProvider', { name: manualModelProviderName })"
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <div class="space-y-4">
          <BFormField :label="$t('settings.modelId')" required>
            <BInput
              v-model="manualModelForm.id"
              placeholder="gpt-4o-mini"
              class="w-full font-mono"
            />
          </BFormField>
          <BFormField :label="$t('settings.modelName')" :hint="$t('settings.optional')">
            <BInput
              v-model="manualModelForm.name"
              :placeholder="$t('settings.modelNamePlaceholder')"
              class="w-full"
            />
          </BFormField>
        </div>
      </template>
      <template #footer="{ close }">
        <BButton variant="secondary" @click="close">
          {{ $t("actions.cancel") }}
        </BButton>
        <BButton :disabled="!manualModelForm.id.trim()" @click="submitManualModel">
          {{ $t("actions.save") }}
        </BButton>
      </template>
    </BModal>
  </div>
</template>
