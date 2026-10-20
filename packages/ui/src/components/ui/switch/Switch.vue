<script setup lang="ts">
import type { SwitchRootEmits, SwitchRootProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { SwitchRoot, SwitchThumb, useForwardPropsEmits } from "reka-ui";
import { cn } from "@chestnut-chat/ui/lib/utils";

const props = defineProps<SwitchRootProps & { class?: HTMLAttributes["class"] }>();

const emits = defineEmits<SwitchRootEmits>();

const delegatedProps = reactiveOmit(props, "class");

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <SwitchRoot
    v-slot="slotProps"
    data-slot="switch"
    v-bind="forwarded"
    :class="
      cn(
        `peer data-[state=checked]:bg-accent-500 data-[state=unchecked]:bg-neutral-300 dark:data-[state=unchecked]:bg-neutral-700 focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background-full inline-flex h-6 w-10 shrink-0 items-center rounded-full border border-transparent px-0.5 transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-50`,
        props.class,
      )
    "
  >
    <SwitchThumb
      data-slot="switch-thumb"
      :class="
        cn(
          `bg-gradient-to-b from-switch-off-chip-start to-switch-off-chip-end data-[state=checked]:from-switch-on-chip-start data-[state=checked]:to-switch-on-chip-end shadow-card pointer-events-none block size-5 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0`,
        )
      "
    >
      <slot name="thumb" v-bind="slotProps" />
    </SwitchThumb>
  </SwitchRoot>
</template>
