<script setup lang="ts">
import { TabsContent } from "../ui/tabs";
export interface TabPanelProps {
  value: string;
}
defineProps<TabPanelProps>();
</script>
<template>
  <TabsContent :value="value" force-mount class="data-[state=inactive]:hidden"
    ><slot
  /></TabsContent>
</template>
