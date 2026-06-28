<script setup lang="ts">
import { isPartStreaming } from "@nuxt/ui/utils/ai";
import { isReasoningUIPart, isTextUIPart, type ChatStatus, type UIMessage } from "ai";
import MarkdownRender from "markstream-vue";

const props = defineProps<{
  messages: UIMessage[];
  status?: ChatStatus;
}>();

const emit = defineEmits<{
  regenerate: [string];
  edit: [{ id: string; text: string }];
}>();

const toast = useToast();
const { t } = useI18n();
const root = ref<HTMLElement | null>(null);

function scrollParent(node: HTMLElement | null) {
  const overflowRegex = /auto|scroll/;
  let current = node?.parentElement;

  while (current && current !== document.body && current !== document.documentElement) {
    const style = window.getComputedStyle(current);
    if (overflowRegex.test(style.overflowY)) return current;
    current = current.parentElement;
  }

  return document.documentElement;
}

function scrollToBottom(smooth = false) {
  if (!import.meta.client) return;

  const parent = scrollParent(root.value);
  parent.scrollTo({
    top: parent.scrollHeight,
    behavior: smooth ? "smooth" : "auto",
  });
}

watch(
  () => props.messages.length,
  async (length, previousLength) => {
    if (!import.meta.client || !length || previousLength !== 0) return;

    await nextTick();
    scrollToBottom(false);
    requestAnimationFrame(() => scrollToBottom(false));
  },
  { flush: "post" },
);

function messageText(message: UIMessage) {
  return message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("");
}

async function copy(message: UIMessage) {
  await navigator.clipboard.writeText(messageText(message));
  toast.add({ title: t("toast.copied") });
}

function actionsFor(message: UIMessage) {
  const actions = [
    {
      label: t("actions.copy"),
      icon: "i-lucide-copy",
      onClick: () => copy(message),
    },
    {
      label: t("actions.regenerate"),
      icon: "i-lucide-refresh-cw",
      onClick: () => emit("regenerate", message.id),
    },
  ];

  if (message.role === "user") {
    actions.push({
      label: t("actions.edit"),
      icon: "i-lucide-pencil",
      onClick: () => emit("edit", { id: message.id, text: messageText(message) }),
    });
  }

  return actions;
}

function isStreamingPart(part: UIMessage["parts"][number]) {
  return isPartStreaming(part);
}
</script>

<template>
  <div ref="root" class="min-h-full">
    <UChatMessages
      :messages="props.messages"
      :status="props.status"
      should-auto-scroll
      class="min-h-full"
    >
      <template #content="{ message }">
        <template
          v-for="(part, index) in message.parts"
          :key="`${message.id}-${part.type}-${index}`"
        >
          <UChatReasoning
            v-if="isReasoningUIPart(part)"
            :text="part.text"
            :streaming="isStreamingPart(part)"
          >
            <MarkdownRender
              mode="chat"
              :content="part.text"
              :final="!isStreamingPart(part)"
              :smooth-streaming="isStreamingPart(part) ? 'auto' : false"
              :typewriter="isStreamingPart(part)"
              :fade="false"
              class="*:first:mt-0 *:last:mb-0"
            />
          </UChatReasoning>

          <template v-else-if="isTextUIPart(part)">
            <MarkdownRender
              v-if="message.role === 'assistant'"
              mode="chat"
              :content="part.text"
              :final="!isStreamingPart(part)"
              :smooth-streaming="isStreamingPart(part) ? 'auto' : false"
              :typewriter="isStreamingPart(part)"
              :fade="false"
              class="*:first:mt-0 *:last:mb-0"
            />
            <p v-else class="whitespace-pre-wrap">{{ part.text }}</p>
          </template>
        </template>
      </template>

      <template #actions="{ message }">
        <UTooltip v-for="action in actionsFor(message)" :key="action.label" :text="action.label">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            :icon="action.icon"
            :aria-label="action.label"
            @click="action.onClick"
          />
        </UTooltip>
      </template>
    </UChatMessages>
  </div>
</template>
