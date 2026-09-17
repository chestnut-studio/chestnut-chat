<script setup lang="ts">
import { ExternalLink } from "lucide-vue-next";
import { BButton, BButtonLink, BInput } from "@chestnut-chat/ui";
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
  if (!props.form.displayName.trim()) return false;
  if (props.form.apiKeyRequired && !props.form.apiKey.trim()) return false;
  return !props.form.showBaseUrl || !!props.form.baseUrl.trim();
});

function updateText(key: "displayName" | "baseUrl" | "apiKey", value: string | number) {
  emit("update", { [key]: String(value) });
}
</script>

<template>
  <div class="space-y-4">
    <UFormField :label="$t('settings.displayName')" required>
      <BInput
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
      <BInput
        :model-value="form.baseUrl"
        :placeholder="form.baseUrlPlaceholder"
        class="w-full"
        @update:model-value="updateText('baseUrl', $event)"
      />
    </UFormField>

    <UFormField
      :label="$t('settings.apiKey')"
      :description="
        form.apiKeyRequired
          ? $t('settings.apiKeyDescription')
          : $t('settings.apiKeyEditDescription')
      "
      :hint="form.apiKeyRequired ? undefined : $t('settings.optional')"
      :required="form.apiKeyRequired"
    >
      <div class="flex items-stretch gap-2">
        <BInput
          :model-value="form.apiKey"
          type="password"
          :placeholder="form.keyPlaceholder"
          class="min-w-0 flex-1 font-mono"
          autocomplete="off"
          @update:model-value="updateText('apiKey', $event)"
        />
        <BButtonLink
          v-if="form.apiKeyUrl"
          :href="form.apiKeyUrl"
          target="_blank"
          rel="noopener noreferrer"
          variant="secondary"
          :leading-icon="ExternalLink"
          class="shrink-0"
        >
          {{ $t("settings.getApiKey") }}
        </BButtonLink>
      </div>
    </UFormField>

    <div class="flex justify-end gap-2">
      <BButton variant="secondary" @click="emit('cancel')">
        {{ $t("actions.cancel") }}
      </BButton>
      <BButton :disabled="!canSave" @click="emit('save')">
        {{ saveLabel }}
      </BButton>
    </div>
  </div>
</template>
