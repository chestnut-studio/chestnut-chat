<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import RiIcon from "../../icon/ri-icon.vue";
import { useForwardProps } from "reka-ui";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();

const forwarded = useForwardProps(props);
</script>

<template>
  <div data-slot="input-otp-separator" role="separator" v-bind="forwarded">
    <slot>
      <RiIcon name="subtract-line" />
    </slot>
  </div>
</template>
