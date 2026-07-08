<script setup lang="ts">
import type { Component } from "vue";

import IconDoubao from "~/components/icon/Doubao.vue";
import IconHunyuan from "~/components/icon/Hunyuan.vue";
import IconLongCat from "~/components/icon/LongCat.vue";
import IconSpark from "~/components/icon/Spark.vue";
import IconStepfun from "~/components/icon/Stepfun.vue";
import IconWenxin from "~/components/icon/Wenxin.vue";
import IconXiaomiMiMo from "~/components/icon/XiaomiMiMo.vue";
import IconZai from "~/components/icon/Zai.vue";
import type { ProviderIconId } from "~/types/providers";

const props = withDefaults(
  defineProps<{
    provider: ProviderIconId;
    size?: "sm" | "md";
    variant?: "badge" | "glyph";
  }>(),
  {
    size: "md",
    variant: "badge",
  },
);

interface ProviderConfig {
  icon?: string;
  component?: Component;
  background: string;
  color: string;
  shadow?: string;
}

const CONFIGS: Record<ProviderIconId, ProviderConfig> = {
  minimax: {
    icon: "i-simple-icons-minimax",
    background: "linear-gradient(to right, #E2167E, #FE603C)",
    color: "#fff",
  },
  qwen: { icon: "i-simple-icons-qwen", background: "#615ced", color: "#fff" },
  zai: { component: IconZai, background: "#000", color: "#fff" },
  xiaomimimo: { component: IconXiaomiMiMo, background: "#000", color: "#fff" },
  doubao: {
    component: IconDoubao,
    background: "#fff",
    color: "#fff",
    shadow: "0 0 0 1px rgba(0,0,0,0.05) inset",
  },
  hunyuan: { component: IconHunyuan, background: "#0053e0", color: "#fff" },
  longcat: {
    component: IconLongCat,
    background: "#fff",
    color: "#000",
    shadow: "0 0 0 1px rgba(0,0,0,0.05) inset",
  },
  spark: { component: IconSpark, background: "#0070f0", color: "#fff" },
  stepfun: { component: IconStepfun, background: "#005AFF", color: "#fff" },
  wenxin: {
    component: IconWenxin,
    background: "linear-gradient(to right, #0A51C3, #23A4FB)",
    color: "#fff",
  },
  kimi: { icon: "i-simple-icons-moonshotai", background: "#16191E", color: "#fff" },
  deepseek: { icon: "i-simple-icons-deepseek", background: "#4D6BFE", color: "#fff" },
  openrouter: { icon: "i-simple-icons-openrouter", background: "#6566F1", color: "#fff" },
  custom: { icon: "i-lucide-cpu", background: "#6B7280", color: "#fff" },
};

const config = computed(() => CONFIGS[props.provider]);
const iconClass = computed(() => (props.size === "sm" ? "size-4" : "size-5"));
</script>

<template>
  <component
    :is="config.component"
    v-if="variant === 'glyph' && config.component"
    :class="[iconClass, 'text-muted shrink-0']"
  />
  <UIcon
    v-else-if="variant === 'glyph'"
    :name="config.icon ?? 'i-lucide-cpu'"
    :class="[iconClass, 'text-muted shrink-0']"
  />
  <div
    v-else
    class="flex shrink-0 items-center justify-center rounded-xl"
    :class="size === 'sm' ? 'size-8' : 'size-10'"
    :style="{ background: config.background, boxShadow: config.shadow }"
  >
    <component
      :is="config.component"
      v-if="config.component"
      :class="iconClass"
      :style="{ color: config.color }"
    />
    <UIcon
      v-else
      :name="config.icon ?? 'i-lucide-cpu'"
      :class="iconClass"
      :style="{ color: config.color }"
    />
  </div>
</template>
