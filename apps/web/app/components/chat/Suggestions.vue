<script setup lang="ts">
import { getChatSuggestionPrompt, type ChatSuggestionId } from "~/utils/chat-suggestions";

const props = defineProps<{
  disabled?: boolean;
}>();

const emit = defineEmits<{
  select: [prompt: string];
}>();

const { t, locale } = useI18n();

const SUGGESTIONS: Array<{
  id: ChatSuggestionId;
  icon: string;
}> = [
  { id: "write", icon: "i-lucide-pen-line" },
  { id: "code", icon: "i-lucide-code-xml" },
  { id: "explain", icon: "i-lucide-lightbulb" },
  { id: "plan", icon: "i-lucide-map" },
];

const items = computed(() =>
  SUGGESTIONS.map((item) => ({
    ...item,
    title: t(`chat.suggestions.${item.id}.title`),
    description: t(`chat.suggestions.${item.id}.description`),
    prompt: getChatSuggestionPrompt(locale.value, item.id),
  })),
);

function onSelect(prompt: string) {
  if (props.disabled) return;
  emit("select", prompt);
}
</script>

<template>
  <div class="mt-5 space-y-3">
    <p class="text-center text-xs font-medium tracking-wide text-muted uppercase">
      {{ $t("chat.suggestions.label") }}
    </p>

    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <button
        v-for="(item, index) in items"
        :key="item.id"
        type="button"
        class="group suggestion-tile flex items-start gap-3 rounded-xl border border-default/80 bg-elevated/50 px-3.5 py-3 text-left transition-[background-color,border-color,transform,box-shadow] duration-200 hover:border-primary/35 hover:bg-elevated hover:shadow-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
        :style="{ animationDelay: `${index * 60}ms` }"
        :disabled="disabled"
        @click="onSelect(item.prompt)"
      >
        <span
          class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15"
        >
          <UIcon :name="item.icon" class="size-4" />
        </span>

        <span class="min-w-0 flex-1">
          <span class="block text-sm font-medium text-highlighted">{{ item.title }}</span>
          <span class="mt-0.5 block text-xs leading-relaxed text-muted">
            {{ item.description }}
          </span>
        </span>

        <UIcon
          name="i-lucide-arrow-up-right"
          class="mt-1 size-3.5 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100"
        />
      </button>
    </div>
  </div>
</template>

<style scoped>
.suggestion-tile {
  animation: suggestion-in 0.35s ease-out both;
}

@keyframes suggestion-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .suggestion-tile {
    animation: none;
  }
}
</style>
