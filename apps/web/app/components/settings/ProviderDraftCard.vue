<script setup lang="ts">
import type { ProviderDraft, ProviderFormFields } from "~/types/providers";

const props = defineProps<{
  draft: ProviderDraft;
}>();

const emit = defineEmits<{
  cancel: [];
  save: [];
  update: [patch: Partial<ProviderDraft>];
}>();

function updateDraft(patch: Partial<ProviderFormFields>) {
  emit("update", patch);
}
</script>

<template>
  <div class="border-default rounded-xl border bg-background">
    <div class="space-y-5 p-4">
      <div class="flex items-center gap-3">
        <ProviderIcon :provider="draft.iconProvider" size="sm" />
        <h3 class="text-lg font-semibold">{{ draft.title }}</h3>
      </div>

      <SettingsProviderFormFields
        :form="draft"
        :save-label="$t('settings.addProvider')"
        @cancel="emit('cancel')"
        @save="emit('save')"
        @update="updateDraft"
      />
    </div>
  </div>
</template>
