<script setup lang="ts">
interface ColorOption {
  label: string;
  value: string;
  swatches: readonly string[];
}

withDefaults(
  defineProps<{
    title: string;
    description: string;
    options: readonly ColorOption[];
    variant?: "swatch" | "palette";
  }>(),
  {
    variant: "swatch",
  },
);

const model = defineModel<string>({ required: true });
</script>

<template>
  <fieldset>
    <legend class="font-medium text-highlighted">{{ title }}</legend>
    <p class="mt-1 text-sm text-muted">{{ description }}</p>

    <div v-if="variant === 'swatch'" class="mt-4 grid grid-cols-6 gap-2.5 sm:grid-cols-9">
      <UTooltip v-for="option in options" :key="option.value" :text="option.label">
        <button
          type="button"
          class="relative flex size-9 items-center justify-center justify-self-start rounded-md border border-default outline-none transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-default"
          :class="
            model === option.value
              ? 'ring-2 ring-primary ring-offset-2 ring-offset-default'
              : 'hover:scale-105 hover:border-accented'
          "
          :style="{ backgroundColor: option.swatches[0] }"
          :aria-label="option.label"
          :aria-pressed="model === option.value"
          @click="model = option.value"
        >
          <UIcon
            v-if="model === option.value"
            name="i-lucide-check"
            class="size-4 text-inverted drop-shadow"
          />
        </button>
      </UTooltip>
    </div>

    <div v-else class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="rounded-md border bg-default p-2.5 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
        :class="
          model === option.value
            ? 'border-primary ring-1 ring-primary'
            : 'border-default hover:border-accented hover:bg-elevated'
        "
        :aria-pressed="model === option.value"
        @click="model = option.value"
      >
        <span class="mb-2 flex h-5 overflow-hidden rounded-sm border border-muted">
          <span
            v-for="(swatch, index) in option.swatches"
            :key="index"
            class="h-full flex-1"
            :style="{ backgroundColor: swatch }"
          />
        </span>
        <span class="flex items-center justify-between gap-1 text-xs font-medium">
          {{ option.label }}
          <UIcon
            v-if="model === option.value"
            name="i-lucide-check"
            class="size-3.5 text-primary"
          />
        </span>
      </button>
    </div>
  </fieldset>
</template>
