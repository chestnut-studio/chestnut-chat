<script setup lang="ts">
import { Moon, Sun } from "lucide-vue-next";
import { BIconButton } from "@chestnut-chat/ui";

const colorMode = useColorMode();
const { t } = useI18n();
const isDark = computed(() => colorMode.value === "dark");

function toggle() {
  colorMode.preference = isDark.value ? "light" : "dark";
}
</script>

<template>
  <BIconButton
    :icon="isDark ? Sun : Moon"
    :aria-label="t(isDark ? 'settings.light' : 'settings.dark')"
    @click="toggle"
  />
</template>
