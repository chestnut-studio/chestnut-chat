<script setup lang="ts">
/**
 * Field label. Ported from BoardUI components/base/input/label.tsx (MIT).
 * Associates with a control via the wrapping label element or an explicit
 * `for` attribute.
 *
 * Visuals: Inter Medium 14/20, color text/primary; 2px gap between label +
 * required asterisk; the asterisk is text/error-primary (red/500).
 */

export interface LabelProps {
  /** Show the required asterisk. */
  isRequired?: boolean;
  /** The id of the labelled control (sets `for`). Optional when the control
   * is nested inside the label. */
  for?: string;
}

withDefaults(defineProps<LabelProps>(), { isRequired: false });
</script>

<template>
  <label class="flex cursor-default items-center gap-0.5 text-body-medium text-text-primary">
    <slot />
    <span v-if="isRequired" aria-hidden="true" class="text-body-medium text-text-error-primary">
      *
    </span>
  </label>
</template>
