<script setup lang="ts">
import type { RadioGroupItemProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import RiIcon from "../../icon/ri-icon.vue";
import { reactiveOmit } from "@vueuse/core";
import { RadioGroupIndicator, RadioGroupItem, useForwardProps } from "reka-ui";
import { cn } from "@chestnut-chat/ui/lib/utils";

const props = defineProps<RadioGroupItemProps & { class?: HTMLAttributes["class"] }>();

const delegatedProps = reactiveOmit(props, "class");

const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <RadioGroupItem
    data-slot="radio-group-item"
    v-bind="forwardedProps"
    :class="
      cn(
        `border-border-checkbox-default text-accent-600 hover:border-border-checkbox-hover bg-background-primary-default data-[state=checked]:border-accent-500 focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background-full aria-invalid:border-border-error-default aspect-square size-5 shrink-0 rounded-full border transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-50`,
        props.class,
      )
    "
  >
    <RadioGroupIndicator
      data-slot="radio-group-indicator"
      class="relative flex items-center justify-center"
    >
      <slot>
        <RiIcon
          name="circle-fill"
          class="fill-primary absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2"
        />
      </slot>
    </RadioGroupIndicator>
  </RadioGroupItem>
</template>
