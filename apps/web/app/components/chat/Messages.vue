<script setup lang="ts">
import type { WebSearchSource } from "@chestnut-chat/api/chat/web-search";
import { isPartStreaming, isToolStreaming } from "@nuxt/ui/utils/ai";
import { getToolName, isReasoningUIPart, isTextUIPart, isToolUIPart, type ChatStatus } from "ai";
import { toast } from "vue-sonner";

import type { ChatUIMessage } from "~/types/chat";

const props = defineProps<{
  abortKey?: number;
  messages: ChatUIMessage[];
  status?: ChatStatus;
}>();

const emit = defineEmits<{
  regenerate: [string];
  edit: [{ id: string; text: string }];
  renderingChange: [boolean];
}>();

const { t } = useI18n();
const root = useTemplateRef<HTMLElement>("root");
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
type MessagePart = ChatUIMessage["parts"][number];

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
let scrollContainer: HTMLElement | Element | null = null;
let contentResizeObserver: ResizeObserver | null = null;
const isUserScrolledUp = ref(false);

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

function isNearBottom(container: HTMLElement | Element, threshold = 80) {
  if (container === document.documentElement) {
    return document.documentElement.scrollHeight - window.scrollY - window.innerHeight <= threshold;
  }
  const el = container as HTMLElement;
  return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
}

function onContainerScroll() {
  if (!scrollContainer) return;
  isUserScrolledUp.value = !isNearBottom(scrollContainer);
}

function scrollToBottom(smooth = false) {
  if (!import.meta.client) return;

  const parent = scrollContainer ?? scrollParent(root.value);
  parent.scrollTo({
    top: (parent as HTMLElement).scrollHeight,
    behavior: smooth ? "smooth" : "auto",
  });
}

function scrollToLatestMessage() {
  isUserScrolledUp.value = false;
  scrollToBottom(false);
  queueScrollToBottom();
}

function queueScrollToBottom() {
  if (!import.meta.client || scrollFrame !== undefined || isUserScrolledUp.value) return;

  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = undefined;
    scrollToBottom(false);
  });
}

watch(
  () => props.messages.length,
  async (length, previousLength) => {
    if (!import.meta.client || !length) return;

    if (previousLength === 0) {
      await nextTick();
      scrollToLatestMessage();
      return;
    }

    const lastMessage = props.messages[length - 1];
    if (lastMessage?.role === "user") {
      isUserScrolledUp.value = false;
      await nextTick();
      scrollToBottom(false);
    }
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

function messageText(message: ChatUIMessage) {
  return message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("");
}

async function copy(message: ChatUIMessage) {
  await navigator.clipboard.writeText(messageText(message));
  toast.success(t("toast.copied"));
}

function actionsFor(message: ChatUIMessage) {
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
  return "state" in part && isPartStreaming(part);
}

function typingKey(message: ChatUIMessage, part: MessagePart, index: number) {
  return `${message.id}:${part.type}:${index}`;
}

function isRenderableAnimatedPart(message: ChatUIMessage, index: number) {
  if (message.role !== "assistant") return true;

  return !message.parts
    .slice(0, index)
    .some(
      (part, partIndex) =>
        (isTextUIPart(part) || isReasoningUIPart(part)) &&
        !isPartRenderComplete(message, part, partIndex),
    );
}

function isPartRenderComplete(message: ChatUIMessage, part: MessagePart, index: number) {
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
      let nextCharacter = value[offset + token.length];
      while (nextCharacter && /\s/u.test(nextCharacter)) {
        token += nextCharacter;
        nextCharacter = value[offset + token.length];
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

function isPageHidden() {
  return document.visibilityState !== "visible";
}

function scheduleTyping(key: string) {
  const state = typingStates[key];
  if (!state || state.timer) return;

  if (isPageHidden()) {
    state.visible = state.target;
    if (!state.streaming) {
      completeTypingState(key);
    }
    return;
  }

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

function onVisibilityChange() {
  if (isPageHidden()) {
    for (const [key, state] of Object.entries(typingStates)) {
      clearTypingTimer(state);
      state.visible = state.target;

      if (!state.streaming) {
        completeTypingState(key);
      }
    }
  }

  syncTypingStates();
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
      const waitingForPreviousPart = !isRenderableAnimatedPart(message, index);

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
        if (!waitingForPreviousPart) {
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
      } else if (waitingForPreviousPart) {
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

function typedText(message: ChatUIMessage, part: MessagePart, index: number) {
  if (!isTextUIPart(part) && !isReasoningUIPart(part)) return "";
  if (message.role !== "assistant") return part.text;

  const key = typingKey(message, part, index);
  return abortedTexts[key] ?? typingStates[key]?.visible ?? part.text;
}

function isTypingPart(message: ChatUIMessage, part: MessagePart, index: number) {
  const state = typingStates[typingKey(message, part, index)];
  return Boolean(state && state.visible !== state.target);
}

function isLivePart(message: ChatUIMessage, part: MessagePart, index: number) {
  return isStreamingPart(part) || isTypingPart(message, part, index);
}

function webSearchSources(message: ChatUIMessage): WebSearchSource[] {
  return message.parts.flatMap((part) =>
    part.type === "source-url"
      ? [
          {
            sourceId: part.sourceId,
            url: part.url,
            ...(part.title ? { title: part.title } : {}),
          },
        ]
      : [],
  );
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

onMounted(() => {
  document.addEventListener("visibilitychange", onVisibilityChange);

  nextTick(() => {
    scrollContainer = scrollParent(root.value);
    scrollContainer.addEventListener("scroll", onContainerScroll, { passive: true });

    if (root.value && "ResizeObserver" in window) {
      contentResizeObserver = new ResizeObserver(() => queueScrollToBottom());
      contentResizeObserver.observe(root.value);
    }

    if (props.messages.length > 0) {
      scrollToLatestMessage();
    }
  });
});

onBeforeUnmount(() => {
  document.removeEventListener("visibilitychange", onVisibilityChange);

  if (scrollFrame !== undefined) {
    cancelAnimationFrame(scrollFrame);
  }

  if (scrollContainer) {
    scrollContainer.removeEventListener("scroll", onContainerScroll);
  }

  contentResizeObserver?.disconnect();

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
      :assistant="{ ui: { body: 'w-full' } }"
      class="min-h-full"
    >
      <template #content="{ message }">
        <template
          v-for="(part, index) in message.parts"
          :key="`${message.id}-${part.type}-${index}`"
        >
          <ChatWebSearch
            v-if="part.type === 'data-web-search'"
            :progress="part.data"
            :sources="webSearchSources(message)"
          />

          <UChatReasoning
            v-else-if="isReasoningUIPart(part) && isRenderableAnimatedPart(message, index)"
            :text="typedText(message, part, index)"
            :streaming="isLivePart(message, part, index)"
            :ui="{ body: 'max-h-none overflow-visible' }"
          >
            <ChatMarkdown
              :content="typedText(message, part, index)"
              :live="isLivePart(message, part, index)"
              :sources="webSearchSources(message)"
            />
          </UChatReasoning>

          <UChatTool
            v-else-if="isToolUIPart(part)"
            :text="getToolName(part)"
            :streaming="isToolStreaming(part)"
          />

          <template v-else-if="isTextUIPart(part)">
            <ChatMarkdown
              v-if="message.role === 'assistant' && isRenderableAnimatedPart(message, index)"
              :content="typedText(message, part, index)"
              :live="isLivePart(message, part, index)"
              :sources="webSearchSources(message)"
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
