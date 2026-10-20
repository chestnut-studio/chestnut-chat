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
  { id: "write", icon: "i-ri-quill-pen-line" },
  { id: "code", icon: "i-ri-code-s-slash-line" },
  { id: "explain", icon: "i-ri-lightbulb-line" },
  { id: "plan", icon: "i-ri-map-line" },
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
  <div class="mt-6 space-y-3">
    <p class="text-center text-caption-1-semibold text-text-tertiary">
      {{ $t("chat.suggestions.label") }}
    </p>

    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <button
        v-for="(item, index) in items"
        :key="item.id"
        type="button"
        class="group suggestion-tile flex items-start gap-3 rounded-2xl border border-border-button-default bg-background-primary-default px-3.5 py-3 text-left shadow-card transition-[background-color,border-color] duration-150 hover:border-border-button-hover hover:bg-background-primary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:outline-none active:bg-background-primary-active disabled:pointer-events-none disabled:opacity-50"
        :style="{ animationDelay: `${index * 60}ms` }"
        :disabled="disabled"
        @click="onSelect(item.prompt)"
      >
        <span
          class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-button-ghost-background text-button-ghost-foreground transition-colors group-hover:bg-button-ghost-hover"
        >
          <BIcon :name="item.icon" class="size-4" />
        </span>

        <span class="min-w-0 flex-1">
          <span class="block text-body-2-medium text-text-primary">{{ item.title }}</span>
          <span class="mt-0.5 block text-caption-1-regular leading-relaxed text-text-secondary">
            {{ item.description }}
          </span>
        </span>

        <BIcon
          name="i-ri-arrow-right-up-line"
          class="mt-1 size-3.5 shrink-0 text-text-secondary opacity-0 transition-opacity group-hover:opacity-100"
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
