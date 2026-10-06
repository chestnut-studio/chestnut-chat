<script setup lang="ts">
import type { Component } from "vue";
import { TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
export interface TabProps {
  value: string;
  disabled?: boolean;
  icon?: Component;
  count?: string | number;
}
defineProps<TabProps>();
</script>
<template>
  <TabsTrigger :value="value" :disabled="disabled"
    ><component :is="icon" v-if="icon" aria-hidden="true" /><slot /><Badge
      v-if="count != null"
      variant="secondary"
      >{{ count }}</Badge
    ></TabsTrigger
  >
</template>
