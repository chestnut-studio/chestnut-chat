<script setup lang="ts">
import {
  modelSupportsReasoning,
  modelSupportsVision,
} from "@chestnut-chat/api/providers/model-capabilities";

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
    /** Icon-only chips for dense lists (e.g. chat model picker). */
    compact?: boolean;
  }>(),
  { compact: false, reasoning: null, vision: null },
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

const hasCapabilities = computed(() => supportsReasoning.value || supportsVision.value);

const badgeUi = computed(() =>
  props.compact
    ? { base: "gap-0 px-1.5" }
    : {
        base: "gap-1 px-1.5 text-[10px] leading-none font-medium tracking-wide uppercase",
      },
);
</script>

<template>
  <div v-if="hasCapabilities" class="flex shrink-0 flex-wrap items-center gap-1">
    <UTooltip v-if="supportsReasoning" :text="$t('settings.supportsReasoning')">
      <UBadge
        color="primary"
        variant="subtle"
        size="sm"
        icon="i-lucide-brain"
        :label="compact ? undefined : $t('settings.reasoningTag')"
        :ui="badgeUi"
        :aria-label="$t('settings.supportsReasoning')"
      />
    </UTooltip>

    <UTooltip v-if="supportsVision" :text="$t('settings.supportsVision')">
      <UBadge
        color="info"
        variant="subtle"
        size="sm"
        icon="i-lucide-image"
        :label="compact ? undefined : $t('settings.visionTag')"
        :ui="badgeUi"
        :aria-label="$t('settings.supportsVision')"
      />
    </UTooltip>
  </div>
</template>
