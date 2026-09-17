<script setup lang="ts">
import { computed } from "vue";
import { cx } from "../../utils/cx";

/**
 * Caption text rendered below a field. Ported from BoardUI
 * components/base/input/hint-text.tsx (MIT).
 *
 * Wire `aria-describedby` on the field to this element's id for full a11y.
 *
 * Visuals: Inter Medium 12/16, tracking 0.15px; color text/secondary (default)
 * or text/error-primary (invalid).
 */

export interface HintTextProps {
  isInvalid?: boolean;
  id?: string;
}

const props = withDefaults(defineProps<HintTextProps>(), { isInvalid: false });

const classes = computed(() =>
  cx(
    "pt-px text-caption-1-medium",
    props.isInvalid ? "text-text-error-primary" : "text-text-secondary",
  ),
);
</script>

<template>
  <p :id="id" :class="classes"><slot /></p>
</template>
