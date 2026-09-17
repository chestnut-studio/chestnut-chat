<script setup lang="ts">
import {
  modelSupportsMultimodal,
  modelSupportsReasoning,
  modelSupportsVision,
} from "@chestnut-chat/api/providers/model-capabilities";
import { BChip } from "@chestnut-chat/ui";

import type { ProviderModel } from "~/composables/useProviderKeys";

const props = withDefaults(
  defineProps<{
    providerId?: string;
    model?: ProviderModel;
    /**
     * Explicit override. Use `null` when unset so Vue's Boolean prop casting
     * does not collapse a missing prop into `false` and skip model metadata.
     */
    reasoning?: boolean | null;
    vision?: boolean | null;
    multimodal?: boolean | null;
    /** Icon-only chips for dense lists (e.g. chat model picker). */
    compact?: boolean;
  }>(),
  { compact: false, reasoning: null, vision: null, multimodal: null },
);

const supportsReasoning = computed(() => {
  if (props.reasoning !== null) return props.reasoning;
  if (!props.providerId || !props.model) return false;
  return modelSupportsReasoning(props.providerId, props.model.id, props.model.supportsReasoning);
});

const supportsVision = computed(() => {
  if (props.vision !== null) return props.vision;
  if (!props.providerId || !props.model) return props.model?.supportsVision === true;
  return modelSupportsVision(props.providerId, props.model.id, props.model.supportsVision);
});

const supportsMultimodal = computed(() => {
  if (props.multimodal !== null) return props.multimodal;
  if (!props.providerId || !props.model) return props.model?.supportsMultimodal === true;
  return modelSupportsMultimodal(props.providerId, props.model.id, props.model.supportsMultimodal);
});

const hasCapabilities = computed(
  () => supportsReasoning.value || supportsVision.value || supportsMultimodal.value,
);
</script>

<template>
  <div v-if="hasCapabilities" class="flex shrink-0 flex-wrap items-center gap-1">
    <UTooltip v-if="supportsReasoning" :text="$t('settings.supportsReasoning')">
      <BChip variant="caption" color="blue" :aria-label="$t('settings.supportsReasoning')">
        <UIcon name="i-lucide-brain" class="size-3.5 shrink-0" />
        <span v-if="!compact">{{ $t("settings.reasoningTag") }}</span>
      </BChip>
    </UTooltip>

    <UTooltip v-if="supportsVision" :text="$t('settings.supportsVision')">
      <BChip variant="caption" color="cyan" :aria-label="$t('settings.supportsVision')">
        <UIcon name="i-lucide-image" class="size-3.5 shrink-0" />
        <span v-if="!compact">{{ $t("settings.visionTag") }}</span>
      </BChip>
    </UTooltip>

    <UTooltip v-if="supportsMultimodal" :text="$t('settings.supportsMultimodal')">
      <BChip variant="caption" color="yellow" :aria-label="$t('settings.supportsMultimodal')">
        <UIcon name="i-lucide-sparkles" class="size-3.5 shrink-0" />
        <span v-if="!compact">{{ $t("settings.multimodalTag") }}</span>
      </BChip>
    </UTooltip>
  </div>
</template>
