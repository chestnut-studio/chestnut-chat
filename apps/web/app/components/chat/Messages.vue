<script setup lang="ts">
import { isPartStreaming } from "@nuxt/ui/utils/ai";
import { isReasoningUIPart, isTextUIPart, type ChatStatus, type UIMessage } from "ai";
import MarkdownRender from "markstream-vue";

const props = defineProps<{
  abortKey?: number;
  messages: UIMessage[];
  status?: ChatStatus;
}>();

const emit = defineEmits<{
  regenerate: [string];
  edit: [{ id: string; text: string }];
  renderingChange: [boolean];
}>();

const toast = useToast();
const { t } = useI18n();
const root = ref<HTMLElement | null>(null);
const WORD_DELAY_MS = 32;
const wordSegmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "word" })
    : null;

type TypingState = {
  visible: string;
  target: string;
  streaming: boolean;
  timer?: ReturnType<typeof setTimeout>;
};
type MessagePart = UIMessage["parts"][number];

const typingStates = reactive<Record<string, TypingState>>({});
const abortedTexts = reactive<Record<string, string>>({});
const completedTexts = reactive<Record<string, string>>({});
const sawActiveResponse = ref(false);
const isRequestActive = computed(
  () => props.status === "submitted" || props.status === "streaming",
);
const isRenderingResponse = computed(
  () => isRequestActive.value || Object.keys(typingStates).length > 0,
);
let scrollFrame: number | undefined;

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

function queueScrollToBottom() {
  if (!import.meta.client || scrollFrame !== undefined) return;

  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = undefined;
    scrollToBottom(false);
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

watch(
  () =>
    Object.values(typingStates)
      .map((state) => state.visible)
      .join("\u0000"),
  () => queueScrollToBottom(),
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
  if (message.role === "assistant" && isRenderingResponse.value) return [];

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

function isStreamingPart(part: MessagePart) {
  return isPartStreaming(part);
}

function typingKey(message: UIMessage, part: MessagePart, index: number) {
  return `${message.id}:${part.type}:${index}`;
}

function isRenderableTextPart(message: UIMessage, index: number) {
  if (message.role !== "assistant") return true;

  return !message.parts
    .slice(0, index)
    .some(
      (part, partIndex) =>
        isReasoningUIPart(part) && !isPartRenderComplete(message, part, partIndex),
    );
}

function isPartRenderComplete(message: UIMessage, part: MessagePart, index: number) {
  if (!isTextUIPart(part) && !isReasoningUIPart(part)) return true;

  const key = typingKey(message, part, index);
  if (completedTexts[key] === part.text) return true;

  const state = typingStates[key];
  if (state) return !state.streaming && state.visible === state.target;

  return !isStreamingPart(part);
}

function nextWord(value: string, offset: number) {
  const rest = value.slice(offset);
  if (!rest) return "";

  if (wordSegmenter) {
    const first = wordSegmenter.segment(rest)[Symbol.iterator]().next().value?.segment;
    if (first) {
      let token = first;
      while (offset + token.length < value.length && /\s/u.test(value[offset + token.length])) {
        token += value[offset + token.length];
      }
      return token;
    }
  }

  return /^\s*\S+\s*/u.exec(rest)?.[0] ?? rest[0] ?? "";
}

function clearTypingTimer(state: TypingState) {
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = undefined;
  }
}

function removeTypingState(key: string) {
  const state = typingStates[key];
  if (!state) return;

  clearTypingTimer(state);
  delete typingStates[key];
  resetTypingSessionWhenIdle();
}

function clearTypingState(key: string) {
  const state = typingStates[key];
  if (!state) return;

  clearTypingTimer(state);
  delete typingStates[key];
}

function completeTypingState(key: string) {
  const state = typingStates[key];
  if (!state) return;

  completedTexts[key] = state.target;
  removeTypingState(key);
}

function abortTyping() {
  if (!import.meta.client) return;

  for (const [key, state] of Object.entries(typingStates)) {
    abortedTexts[key] = state.visible;
    clearTypingState(key);
  }

  sawActiveResponse.value = false;
}

function resetTypingSessionWhenIdle() {
  if (props.status === "ready" && Object.keys(typingStates).length === 0) {
    sawActiveResponse.value = false;
  }
}

function scheduleTyping(key: string) {
  const state = typingStates[key];
  if (!state || state.timer) return;

  state.timer = setTimeout(() => {
    const latest = typingStates[key];
    if (!latest) return;

    latest.timer = undefined;
    if (!latest.target.startsWith(latest.visible)) {
      latest.visible = "";
    }

    if (latest.visible.length < latest.target.length) {
      latest.visible += nextWord(latest.target, latest.visible.length);
      scheduleTyping(key);
      return;
    }

    if (!latest.streaming) {
      completeTypingState(key);
      syncTypingStates();
    }
  }, WORD_DELAY_MS);
}

function syncTypingStates() {
  if (!import.meta.client) return;

  if (props.status === "submitted" || props.status === "streaming") {
    sawActiveResponse.value = true;
  }

  if (!props.messages.length && props.status === "ready") {
    sawActiveResponse.value = false;
  }

  const seenKeys = new Set<string>();
  const lastUserIndex = props.messages.findLastIndex((message) => message.role === "user");

  for (const [messageIndex, message] of props.messages.entries()) {
    for (const [index, part] of message.parts.entries()) {
      if (!isTextUIPart(part) && !isReasoningUIPart(part)) continue;

      const key = typingKey(message, part, index);
      seenKeys.add(key);

      if (message.role !== "assistant") {
        removeTypingState(key);
        continue;
      }

      const streaming = isStreamingPart(part);
      const existing = typingStates[key];
      const completedText = completedTexts[key];
      const belongsToCurrentResponse =
        sawActiveResponse.value && lastUserIndex !== -1 && messageIndex > lastUserIndex;
      const waitingForReasoning = isTextUIPart(part) && !isRenderableTextPart(message, index);

      if (key in abortedTexts) {
        removeTypingState(key);
        continue;
      }

      if (!streaming && !belongsToCurrentResponse && existing) {
        removeTypingState(key);
        continue;
      }

      const shouldAnimate =
        streaming || existing || (belongsToCurrentResponse && completedText !== part.text);

      if (!shouldAnimate) continue;

      if (!existing) {
        typingStates[key] = {
          visible: completedText && part.text.startsWith(completedText) ? completedText : "",
          target: part.text,
          streaming,
        };
        if (!waitingForReasoning) {
          scheduleTyping(key);
        }
        continue;
      }

      existing.streaming = streaming;
      existing.target = part.text;

      if (!part.text.startsWith(existing.visible)) {
        existing.visible = "";
      }

      if (existing.visible === existing.target && !streaming) {
        completeTypingState(key);
      } else if (waitingForReasoning) {
        clearTypingTimer(existing);
      } else {
        scheduleTyping(key);
      }
    }
  }

  for (const key of Object.keys(typingStates)) {
    if (!seenKeys.has(key)) removeTypingState(key);
  }

  for (const key of Object.keys(abortedTexts)) {
    if (!seenKeys.has(key)) delete abortedTexts[key];
  }

  for (const key of Object.keys(completedTexts)) {
    if (!seenKeys.has(key)) delete completedTexts[key];
  }

  resetTypingSessionWhenIdle();
}

function typedText(message: UIMessage, part: MessagePart, index: number) {
  if (!isTextUIPart(part) && !isReasoningUIPart(part)) return "";
  if (message.role !== "assistant") return part.text;

  const key = typingKey(message, part, index);
  return abortedTexts[key] ?? typingStates[key]?.visible ?? part.text;
}

function isTypingPart(message: UIMessage, part: MessagePart, index: number) {
  const state = typingStates[typingKey(message, part, index)];
  return Boolean(state && state.visible !== state.target);
}

function isLivePart(message: UIMessage, part: MessagePart, index: number) {
  return isStreamingPart(part) || isTypingPart(message, part, index);
}

watch([() => props.messages, () => props.status], syncTypingStates, {
  deep: true,
  flush: "post",
  immediate: true,
});

watch(isRenderingResponse, (value) => emit("renderingChange", value), { immediate: true });

watch(
  () => props.abortKey,
  (value, previousValue) => {
    if (value === undefined || value === previousValue) return;
    abortTyping();
  },
);

onBeforeUnmount(() => {
  if (scrollFrame !== undefined) {
    cancelAnimationFrame(scrollFrame);
  }

  for (const key of Object.keys(typingStates)) {
    removeTypingState(key);
  }
});
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
            :text="typedText(message, part, index)"
            :streaming="isLivePart(message, part, index)"
            :ui="{ body: 'max-h-none overflow-visible' }"
          >
            <MarkdownRender
              mode="chat"
              :content="typedText(message, part, index)"
              :final="!isLivePart(message, part, index)"
              :smooth-streaming="false"
              :typewriter="isLivePart(message, part, index)"
              :fade="false"
              :max-live-nodes="0"
              class="*:first:mt-0 *:last:mb-0"
            />
          </UChatReasoning>

          <template v-else-if="isTextUIPart(part)">
            <MarkdownRender
              v-if="message.role === 'assistant' && isRenderableTextPart(message, index)"
              mode="chat"
              :content="typedText(message, part, index)"
              :final="!isLivePart(message, part, index)"
              :smooth-streaming="false"
              :typewriter="isLivePart(message, part, index)"
              :fade="false"
              :max-live-nodes="0"
              class="*:first:mt-0 *:last:mb-0"
            />
            <p v-else-if="message.role === 'user'" class="whitespace-pre-wrap">{{ part.text }}</p>
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
