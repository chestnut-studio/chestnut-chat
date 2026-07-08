<script setup lang="ts">
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
} = useSettingsProviders();
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
      <UDropdownMenu :items="addProviderItems">
        <template #item-leading="{ item }">
          <ProviderIcon :provider="item.iconProvider" size="sm" variant="glyph" />
        </template>

        <UButton
          icon="i-lucide-plus"
          variant="outline"
          color="neutral"
          :label="$t('settings.addProvider')"
          :disabled="isLoadingProviders || isSavingProvider"
        />
      </UDropdownMenu>
    </div>

    <div v-if="isLoadingProviders" class="space-y-3">
      <USkeleton class="h-28 w-full rounded-xl" />
      <USkeleton class="h-28 w-full rounded-xl" />
    </div>

    <div
      v-else-if="!hasAnyProvider && !providerDraft"
      class="border-default rounded-xl border border-dashed py-14 text-center"
    >
      <UIcon name="i-lucide-key-round" class="text-muted mx-auto mb-3 size-10" />
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

    <UModal
      v-model:open="deleteConfirmOpen"
      :title="$t('settings.deleteProviderTitle')"
      :description="$t('settings.deleteProviderDescription', { name: deleteProviderName })"
      :ui="{ footer: 'justify-end' }"
    >
      <template #footer>
        <UButton
          color="neutral"
          variant="outline"
          :label="$t('actions.cancel')"
          @click="cancelDeleteProvider"
        />
        <UButton
          color="error"
          :label="$t('actions.delete')"
          :loading="isSavingProvider"
          @click="confirmDeleteProvider"
        />
      </template>
    </UModal>

    <UModal
      v-model:open="manualModelOpen"
      :title="$t('settings.addModelForProvider', { name: manualModelProviderName })"
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <div class="space-y-4">
          <UFormField :label="$t('settings.modelId')" required>
            <UInput
              v-model="manualModelForm.id"
              placeholder="gpt-4o-mini"
              class="w-full font-mono"
            />
          </UFormField>
          <UFormField :label="$t('settings.modelName')" :hint="$t('settings.optional')">
            <UInput
              v-model="manualModelForm.name"
              :placeholder="$t('settings.modelNamePlaceholder')"
              class="w-full"
            />
          </UFormField>
        </div>
      </template>
      <template #footer="{ close }">
        <UButton color="neutral" variant="outline" :label="$t('actions.cancel')" @click="close" />
        <UButton
          :label="$t('actions.save')"
          :disabled="!manualModelForm.id.trim()"
          @click="submitManualModel"
        />
      </template>
    </UModal>
  </div>
</template>
