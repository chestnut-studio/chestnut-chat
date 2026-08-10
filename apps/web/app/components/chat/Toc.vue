<script setup lang="ts">
import { isTextUIPart } from "ai";

import type { ChatUIMessage } from "~/types/chat";

const props = defineProps<{
  messages: ChatUIMessage[];
  scrollContainer: HTMLElement | null;
}>();

const { t } = useI18n();

const activeId = shallowRef<string | null>(null);
let container: HTMLElement | null = null;
let observer: MutationObserver | null = null;
let frame: number | undefined;

const entries = computed(() =>
  props.messages
    .filter((message) => message.role === "user")
    .map((message) => ({
      id: message.id,
      text: message.parts
        .filter(isTextUIPart)
        .map((part) => part.text)
        .join("")
        .trim(),
    }))
    .filter((entry) => entry.text.length > 0),
);

function findAnchor(id: string) {
  if (!container) return null;
  return Array.from(container.querySelectorAll<HTMLElement>("[data-chat-toc]")).find(
    (el) => el.getAttribute("data-chat-toc") === id,
  );
}

function scheduleUpdate() {
  if (frame !== undefined) return;
  frame = requestAnimationFrame(() => {
    frame = undefined;
    updateActive();
  });
}

function updateActive() {
  const items = entries.value;
  if (!container || !items.length) {
    activeId.value = null;
    return;
  }

  const rect = container.getBoundingClientRect();
  const line = rect.top + Math.min(container.clientHeight * 0.25, 140);

  let current: string | null = null;
  for (const item of items) {
    const el = findAnchor(item.id);
    if (!el || el.getBoundingClientRect().top > line) continue;
    current = item.id;
  }

  if (container.scrollTop + container.clientHeight >= container.scrollHeight - 4) {
    current = items.at(-1)?.id ?? null;
  }

  activeId.value = current ?? items[0]?.id ?? null;
}

function attach(next: HTMLElement | null) {
  if (next === container) return;
  if (container) {
    container.removeEventListener("scroll", scheduleUpdate);
    observer?.disconnect();
  }

  container = next;
  observer = null;
  if (!container) return;

  container.addEventListener("scroll", scheduleUpdate, { passive: true });
  observer = new MutationObserver(scheduleUpdate);
  observer.observe(container, { childList: true, subtree: true });
  updateActive();
}

function jump(id: string) {
  const el = findAnchor(id);
  if (!el || !container) return;

  const containerRect = container.getBoundingClientRect();
  const anchorRect = el.getBoundingClientRect();
  const top = container.scrollTop + anchorRect.top - containerRect.top - 24;

  activeId.value = id;
  container.scrollTo({
    top: Math.max(0, top),
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
  });
}

watch(() => props.scrollContainer, attach, { immediate: true });
watch(entries, () => nextTick(scheduleUpdate), { flush: "post" });

onMounted(() => {
  window.addEventListener("resize", scheduleUpdate);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", scheduleUpdate);
  if (frame !== undefined) cancelAnimationFrame(frame);
  attach(null);
});
</script>

<template>
  <div
    v-if="entries.length > 1"
    class="pointer-events-none absolute top-1/2 right-4 z-20 hidden h-[18.75rem] w-[2.125rem] -translate-y-1/2 xl:block"
  >
    <nav
      class="toc-shell pointer-events-auto relative flex h-full w-full items-center"
      role="navigation"
      :aria-label="t('chat.toc.label')"
    >
      <span
        aria-hidden="true"
        class="absolute top-1/2 right-0 h-[calc(100%_-_0.5rem)] w-[2.125rem] -translate-y-1/2 rounded-2xl bg-default/70 backdrop-blur-sm"
      />

      <div
        class="toc-popover pointer-events-none absolute right-0 flex max-h-full w-60 flex-col items-stretch overflow-hidden rounded-2xl"
      >
        <span aria-hidden="true" class="toc-surface absolute inset-0 rounded-2xl" />

        <div
          class="relative z-10 flex max-h-[15.625rem] flex-col items-end overflow-y-auto py-[0.9375rem] ps-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <button
            v-for="entry in entries"
            :key="entry.id"
            type="button"
            class="toc-entry group/entry me-2 flex h-[1.875rem] w-[calc(100%_-_0.375rem)] shrink-0 items-center justify-end text-[13px] leading-5 outline-none transition-colors duration-200 focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-primary/70 motion-reduce:transition-none"
            :class="
              activeId === entry.id
                ? 'font-medium text-primary'
                : 'text-muted hover:text-highlighted focus-visible:text-highlighted'
            "
            :aria-current="activeId === entry.id ? 'location' : undefined"
            :aria-label="t('chat.toc.jumpTo', { text: entry.text })"
            :title="entry.text"
            @click="jump(entry.id)"
          >
            <span class="toc-label me-3 truncate whitespace-nowrap text-right">{{
              entry.text
            }}</span>
            <span class="flex h-5 w-4 shrink-0 items-center justify-center">
              <span
                class="toc-bar block h-0.5 w-2 rounded-sm transition-[background-color,transform] duration-200 motion-reduce:transition-none"
                :class="activeId === entry.id ? 'scale-150 bg-primary' : 'bg-muted/60'"
              />
            </span>
          </button>
        </div>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.toc-surface {
  border: 1px solid var(--ui-border);
  background: var(--ui-bg-elevated);
  box-shadow:
    0 0 1px rgb(0 0 0 / 0.2),
    0 0 4px rgb(0 0 0 / 0.02),
    0 12px 32px rgb(0 0 0 / 0.12);
  opacity: 0;
  transform: scale(0.96);
  transform-origin: right center;
  transition:
    opacity 100ms cubic-bezier(0, 0, 0.2, 1),
    transform 100ms cubic-bezier(0, 0, 0.2, 1);
  will-change: opacity, transform;
}

.toc-label {
  min-width: 0;
  flex: 1 1 auto;
  opacity: 0;
  transition: opacity 100ms cubic-bezier(0.4, 0, 1, 1);
}

.toc-shell:hover .toc-popover,
.toc-shell:focus-within .toc-popover {
  pointer-events: auto;
}

.toc-shell:hover .toc-surface,
.toc-shell:focus-within .toc-surface {
  opacity: 1;
  transform: scale(1);
  transition-timing-function: cubic-bezier(0.4, 0, 1, 1);
}

.toc-shell:hover .toc-label,
.toc-shell:focus-within .toc-label {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .toc-surface,
  .toc-label {
    transition: none;
  }
}
</style>
