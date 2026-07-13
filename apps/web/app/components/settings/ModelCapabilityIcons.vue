<script setup lang="ts">
import { modelSupportsReasoning } from "@chestnut-chat/api/providers/model-capabilities";

const props = defineProps<{
  providerId: string;
  model: ProviderModel;
}>();

const supportsReasoning = computed(() =>
  modelSupportsReasoning(props.providerId, props.model.id, props.model.supportsReasoning),
);

const hasCapabilities = computed(
  () => supportsReasoning.value || props.model.supportsVision === true,
);
</script>

<template>
  <div v-if="hasCapabilities" class="flex shrink-0 items-center gap-1 text-primary">
    <UTooltip v-if="supportsReasoning" :text="$t('settings.supportsReasoning')">
      <span class="inline-flex">
        <UIcon
          name="i-lucide-brain"
          class="size-4"
          :aria-label="$t('settings.supportsReasoning')"
        />
      </span>
    </UTooltip>
    <UTooltip v-if="model.supportsVision" :text="$t('settings.supportsVision')">
      <span class="inline-flex">
        <UIcon name="i-lucide-image" class="size-4" :aria-label="$t('settings.supportsVision')" />
      </span>
    </UTooltip>
  </div>
</template>
