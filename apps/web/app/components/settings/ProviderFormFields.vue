<script setup lang="ts">
import type { ProviderFormFields } from "~/types/providers";

const props = defineProps<{
  form: ProviderFormFields;
  saveLabel: string;
}>();

const emit = defineEmits<{
  cancel: [];
  save: [];
  update: [patch: Partial<ProviderFormFields>];
}>();

const canSave = computed(() => {
  if (!props.form.displayName.trim() || !props.form.apiKey.trim()) return false;
  return !props.form.showBaseUrl || !!props.form.baseUrl.trim();
});

function updateText(key: "displayName" | "baseUrl" | "apiKey", value: string | number) {
  emit("update", { [key]: String(value) });
}
</script>

<template>
  <div class="space-y-4">
    <UFormField :label="$t('settings.displayName')" required>
      <UInput
        :model-value="form.displayName"
        class="w-full"
        @update:model-value="updateText('displayName', $event)"
      />
    </UFormField>

    <UFormField
      v-if="form.showBaseUrl"
      :label="$t('settings.baseUrl')"
      :description="$t('settings.baseUrlDescription')"
      required
    >
      <UInput
        :model-value="form.baseUrl"
        :placeholder="form.baseUrlPlaceholder"
        class="w-full"
        @update:model-value="updateText('baseUrl', $event)"
      />
    </UFormField>

    <UFormField
      :label="$t('settings.apiKey')"
      :description="$t('settings.apiKeyDescription')"
      required
    >
      <UInput
        :model-value="form.apiKey"
        type="password"
        :placeholder="form.keyPlaceholder"
        class="w-full font-mono"
        autocomplete="off"
        @update:model-value="updateText('apiKey', $event)"
      />
    </UFormField>

    <div class="flex justify-end gap-2">
      <UButton
        color="neutral"
        variant="outline"
        :label="$t('actions.cancel')"
        @click="emit('cancel')"
      />
      <UButton :label="saveLabel" :disabled="!canSave" @click="emit('save')" />
    </div>
  </div>
</template>
