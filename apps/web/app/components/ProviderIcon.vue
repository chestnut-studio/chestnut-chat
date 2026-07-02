<script setup lang="ts">
import {
  AVATAR_BACKGROUND as OPENAI_BG,
  AVATAR_COLOR as OPENAI_COLOR,
} from "@lobehub/icons/es/OpenAI/style";
import {
  AVATAR_BACKGROUND as ANTHROPIC_BG,
  AVATAR_COLOR as ANTHROPIC_COLOR,
} from "@lobehub/icons/es/Anthropic/style";
import { AVATAR_COLOR as GEMINI_COLOR } from "@lobehub/icons/es/Gemini/style";
import {
  AVATAR_BACKGROUND as KIMI_BG,
  AVATAR_COLOR as KIMI_COLOR,
} from "@lobehub/icons/es/Kimi/style";
import {
  AVATAR_BACKGROUND as DEEPSEEK_BG,
  AVATAR_COLOR as DEEPSEEK_COLOR,
} from "@lobehub/icons/es/DeepSeek/style";
import {
  AVATAR_BACKGROUND as OPENROUTER_BG,
  AVATAR_COLOR as OPENROUTER_COLOR,
} from "@lobehub/icons/es/OpenRouter/style";

type ProviderId = "openai" | "anthropic" | "gemini" | "kimi" | "deepseek" | "openrouter" | "custom";

defineProps<{
  provider: ProviderId;
  size?: "sm" | "md";
}>();

interface ProviderConfig {
  icon: string;
  bg: string;
  color: string;
}

const CONFIGS: Record<ProviderId, ProviderConfig> = {
  openai: { icon: "i-simple-icons-openai", bg: OPENAI_BG, color: OPENAI_COLOR },
  anthropic: { icon: "i-simple-icons-anthropic", bg: ANTHROPIC_BG, color: ANTHROPIC_COLOR },
  gemini: { icon: "i-simple-icons-googlegemini", bg: "#1A73E8", color: GEMINI_COLOR },
  kimi: { icon: "i-lucide-moon-star", bg: KIMI_BG, color: KIMI_COLOR },
  deepseek: { icon: "i-simple-icons-deepseek", bg: DEEPSEEK_BG, color: DEEPSEEK_COLOR },
  openrouter: { icon: "i-simple-icons-openrouter", bg: OPENROUTER_BG, color: OPENROUTER_COLOR },
  custom: { icon: "i-lucide-cpu", bg: "#6B7280", color: "#fff" },
};
</script>

<template>
  <div
    class="flex flex-shrink-0 items-center justify-center rounded-xl"
    :class="size === 'sm' ? 'size-8' : 'size-10'"
    :style="{ backgroundColor: CONFIGS[provider].bg }"
  >
    <UIcon
      :name="CONFIGS[provider].icon"
      :class="size === 'sm' ? 'size-4' : 'size-5'"
      :style="{ color: CONFIGS[provider].color }"
    />
  </div>
</template>
