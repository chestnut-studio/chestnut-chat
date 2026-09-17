<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref } from "vue";
import { cx } from "../../utils/cx";
import { tabsKey } from "./tabs-context";

/**
 * Tab strip with a sliding 2px underline indicator that follows the selected
 * tab. Ported from BoardUI components/base/tabs/tabs.tsx (MIT).
 *
 * The underline re-measures whenever a tab's data-selected attribute flips or
 * the strip resizes (MutationObserver + ResizeObserver, same approach as the
 * React original).
 */

import type { TabsContext } from "./tabs-context";

const props = defineProps<{
  /** Class for the inner tablist (defaults provide the BoardUI baseline). */
  class?: string;
}>();

function useTabs(): TabsContext {
  const context = inject(tabsKey, undefined);
  if (!context) {
    throw new Error("<TabList> must be used inside a <Tabs>.");
  }
  return context;
}

const context = useTabs();

const wrapperRef = ref<HTMLDivElement | null>(null);
const underline = ref<{ left: number; width: number } | null>(null);

let mutationObserver: MutationObserver | undefined;
let resizeObserver: ResizeObserver | undefined;

onMounted(() => {
  const el = wrapperRef.value;
  if (!el) return;

  const measure = () => {
    const selected = el.querySelector<HTMLElement>("[role='tab'][data-selected='true']");
    if (selected) {
      underline.value = { left: selected.offsetLeft, width: selected.offsetWidth };
    }
  };

  measure();
  mutationObserver = new MutationObserver(measure);
  mutationObserver.observe(el, {
    attributes: true,
    subtree: true,
    attributeFilter: ["data-selected"],
  });
  resizeObserver = new ResizeObserver(measure);
  resizeObserver.observe(el);
});

onUnmounted(() => {
  mutationObserver?.disconnect();
  resizeObserver?.disconnect();
});

/**
 * Roving-tabindex arrow-key navigation with automatic activation.
 */
function onKeydown(event: KeyboardEvent) {
  const tablist = wrapperRef.value?.querySelector<HTMLElement>("[role='tablist']");
  if (!tablist) return;
  const tabs = Array.from(tablist.querySelectorAll<HTMLElement>("[role='tab']:not(:disabled)"));
  if (tabs.length === 0) return;

  const currentIndex = tabs.findIndex((tab) => tab === document.activeElement);
  if (currentIndex === -1) return;

  const nextKey = context.orientation === "vertical" ? "ArrowDown" : "ArrowRight";
  const prevKey = context.orientation === "vertical" ? "ArrowUp" : "ArrowLeft";

  let nextIndex: number | undefined;
  if (event.key === nextKey) nextIndex = (currentIndex + 1) % tabs.length;
  else if (event.key === prevKey) nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  else if (event.key === "Home") nextIndex = 0;
  else if (event.key === "End") nextIndex = tabs.length - 1;
  else return;

  event.preventDefault();
  const nextTab = tabs[nextIndex];
  nextTab?.focus();
  nextTab?.click();
}

const tablistClasses = computed(() =>
  cx("flex w-full items-center gap-1 border-b border-separator-border", props.class),
);
</script>

<template>
  <div ref="wrapperRef" class="relative w-full">
    <div
      role="tablist"
      :aria-orientation="context.orientation"
      :class="tablistClasses"
      @keydown="onKeydown"
    >
      <slot />
    </div>
    <span
      v-if="underline"
      aria-hidden="true"
      class="pointer-events-none absolute bottom-0 left-0 h-0.5 bg-accent-600 transition-[transform,width] duration-200 ease"
      :style="{ transform: `translateX(${underline.left}px)`, width: `${underline.width}px` }"
    />
  </div>
</template>
