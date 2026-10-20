<script setup lang="ts">
export type ChatStep = {
  key: string;
  label: string;
  detail?: string;
  state: "pending" | "active" | "done" | "error";
};

defineProps<{ steps: ChatStep[] }>();
</script>

<template>
  <ol
    class="mb-3 flex w-full flex-col gap-1 rounded-2xl border border-border-button-default bg-background-secondary-default p-2"
  >
    <li
      v-for="step in steps"
      :key="step.key"
      class="flex items-start gap-2.5 rounded-xl px-2 py-1.5"
      :data-state="step.state"
    >
      <span class="mt-0.5 flex size-5 shrink-0 items-center justify-center">
        <BIcon
          v-if="step.state === 'active'"
          name="i-ri-loader-4-line"
          class="size-4 animate-spin text-accent-600 motion-reduce:animate-none"
        />
        <BIcon
          v-else-if="step.state === 'done'"
          name="i-ri-checkbox-circle-fill"
          class="size-4 text-state-success-text"
        />
        <BIcon
          v-else-if="step.state === 'error'"
          name="i-ri-close-circle-line"
          class="size-4 text-text-error-primary"
        />
        <span v-else class="size-3 rounded-full border-2 border-border-button-hover" />
      </span>
      <span class="min-w-0 flex-1">
        <span
          class="block text-body-2-medium"
          :class="step.state === 'pending' ? 'text-text-tertiary' : 'text-text-primary'"
          >{{ step.label }}</span
        >
        <span
          v-if="step.detail"
          class="mt-0.5 block truncate text-caption-1-regular text-text-secondary"
          :title="step.detail"
          >{{ step.detail }}</span
        >
      </span>
    </li>
  </ol>
</template>
