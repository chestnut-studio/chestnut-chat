<script setup lang="ts">
const props = defineProps<{
  /** True while the model is still producing reasoning. */
  live: boolean;
}>();

const open = ref(props.live);
const startedAt = ref<number | null>(props.live ? Date.now() : null);
const elapsed = ref(0);
let timer: ReturnType<typeof setInterval> | undefined;

function stopTimer() {
  if (timer) clearInterval(timer);
  timer = undefined;
}

function tick() {
  if (startedAt.value !== null)
    elapsed.value = Math.max(1, Math.round((Date.now() - startedAt.value) / 1000));
}

function startTimer() {
  stopTimer();
  tick();
  timer = setInterval(tick, 250);
}

watch(
  () => props.live,
  (live) => {
    if (live) {
      startedAt.value ??= Date.now();
      open.value = true;
      startTimer();
    } else {
      tick();
      stopTimer();
      open.value = false;
    }
  },
);

onMounted(() => {
  if (props.live) startTimer();
});
onBeforeUnmount(stopTimer);
</script>

<template>
  <div class="mb-3 w-full">
    <button
      type="button"
      class="group inline-flex max-w-full items-center gap-2 rounded-lg py-1 text-body-2-medium text-text-secondary transition-colors hover:text-text-primary"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span v-if="live" class="flex h-4 items-center gap-0.5" aria-hidden="true">
        <span
          v-for="i in 3"
          :key="i"
          class="h-full w-0.5 origin-center animate-wave rounded-full bg-accent-500"
          :style="{ animationDelay: `${(i - 1) * 150}ms` }"
        />
      </span>
      <BIcon v-else name="i-ri-brain-line" class="size-4 shrink-0" />

      <span v-if="live" class="text-shimmer">{{ $t("chat.thinking") }}</span>
      <span v-else-if="startedAt !== null">{{ $t("chat.thoughtFor", { seconds: elapsed }) }}</span>
      <span v-else>{{ $t("chat.thought") }}</span>

      <span v-if="live && elapsed > 0" class="tabular-nums text-text-tertiary">{{ elapsed }}s</span>

      <BIcon
        name="i-ri-arrow-right-s-line"
        class="size-4 shrink-0 text-text-tertiary transition-transform"
        :class="open ? 'rotate-90' : undefined"
      />
    </button>

    <div
      class="grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none"
      :class="open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
    >
      <div class="min-h-0 overflow-hidden">
        <div class="mt-1 border-l-2 border-border-button-default pl-4 text-text-secondary">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>
