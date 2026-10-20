<script setup lang="ts">
import { Moon, Sun } from "~/utils/icons";

const colorMode = useColorMode();
const { t } = useI18n();

const options = computed(() => [
  { mode: "light", label: t("settings.light"), icon: Sun },
  { mode: "dark", label: t("settings.dark"), icon: Moon },
]);

const DURATION = 700;
const STYLE_ID = "mode-switcher-transition-style";
let running = false;

async function setMode(mode: string, event: MouseEvent) {
  if (colorMode.value === mode || running) return;

  const doc = document as Document & {
    startViewTransition?: (update: () => Promise<void>) => {
      ready: Promise<void>;
      finished: Promise<void>;
    };
  };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!doc.startViewTransition || reduceMotion) {
    colorMode.preference = mode;
    return;
  }

  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const x = event.clientX || rect.left + rect.width / 2;
  const y = event.clientY || rect.top + rect.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

  running = true;
  document.getElementById(STYLE_ID)?.remove();
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent =
    "::view-transition-old(root),::view-transition-new(root){animation:none;mix-blend-mode:normal}";
  document.head.appendChild(style);

  const transition = doc.startViewTransition(async () => {
    colorMode.preference = mode;
    await nextTick();
  });

  try {
    await transition.ready;
    document.documentElement.animate(
      {
        clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`],
      },
      {
        duration: DURATION,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        pseudoElement: "::view-transition-new(root)",
      },
    );
    await transition.finished;
  } finally {
    style.remove();
    running = false;
  }
}
</script>

<template>
  <ClientOnly>
    <div
      role="group"
      :aria-label="t('settings.colorMode')"
      class="relative inline-flex w-fit items-center gap-1 rounded-full bg-theme-toggle-sidebar-background p-1"
    >
      <span
        aria-hidden="true"
        class="pointer-events-none absolute start-1 top-1 size-8 rounded-full bg-theme-toggle-sidebar-selected-background shadow-xs transition-transform duration-200 ease-out motion-reduce:transition-none"
        :class="colorMode.value === 'dark' ? 'translate-x-9 rtl:-translate-x-9' : ''"
      />
      <button
        v-for="option in options"
        :key="option.mode"
        type="button"
        :aria-label="option.label"
        :aria-pressed="colorMode.value === option.mode"
        :title="option.label"
        class="relative z-10 grid size-8 cursor-pointer place-items-center rounded-full outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-border-focus-ring"
        :class="
          colorMode.value === option.mode
            ? 'text-foreground-icon-primary'
            : 'text-foreground-icon-secondary hover:text-foreground-icon-primary'
        "
        @click="setMode(option.mode, $event)"
      >
        <component :is="option.icon" class="size-4" aria-hidden="true" />
      </button>
    </div>
    <template #fallback>
      <div class="h-10 w-[76px] rounded-full bg-theme-toggle-sidebar-background" />
    </template>
  </ClientOnly>
</template>
