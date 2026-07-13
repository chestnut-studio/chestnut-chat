<script setup lang="ts">
import type { ReasoningEffort } from "@chestnut-chat/api/providers/model-capabilities";
import type { DropdownMenuItem } from "@nuxt/ui";

const props = defineProps<{
  supported: boolean;
  required: boolean;
  efforts: readonly ReasoningEffort[];
}>();

const reasoning = defineModel<boolean>({ required: true });
const effort = defineModel<ReasoningEffort>("effort", { default: "high" });
const { t } = useI18n();

function effortLabel(value: ReasoningEffort) {
  return value === "max" ? t("chat.reasoningMax") : t("chat.reasoningHigh");
}

const supportsEffortSelection = computed(() => props.efforts.length > 0);
const isActive = computed(() => props.supported && (props.required || reasoning.value));
const buttonLabel = computed(() =>
  isActive.value ? effortLabel(effort.value) : t("chat.reasoningOff"),
);
const statusLabel = computed(() => {
  if (!props.supported) return t("chat.reasoningUnavailable");
  if (props.required) return t("chat.reasoningRequired");
  if (!isActive.value) return t("chat.reasoningInactive");
  if (!supportsEffortSelection.value) return t("chat.reasoningActive");

  return t("chat.reasoningActiveEffort", { effort: effortLabel(effort.value) });
});

function selectDisabled() {
  if (props.required) return;
  reasoning.value = false;
}

function selectEffort(value: ReasoningEffort) {
  effort.value = value;
  reasoning.value = true;
}

const effortItems = computed<DropdownMenuItem[]>(() => [
  {
    label: t("chat.reasoningOff"),
    icon: isActive.value ? undefined : "i-lucide-check",
    onSelect: selectDisabled,
  },
  ...props.efforts.map((value) => ({
    label: effortLabel(value),
    icon: isActive.value && effort.value === value ? "i-lucide-check" : undefined,
    onSelect: () => selectEffort(value),
  })),
]);

function toggleReasoning() {
  if (!props.supported || props.required) return;
  reasoning.value = !reasoning.value;
}
</script>

<template>
  <UTooltip :text="statusLabel">
    <span class="inline-flex">
      <UDropdownMenu
        v-if="supported && supportsEffortSelection"
        :items="effortItems"
        :content="{ align: 'start', side: 'bottom', sideOffset: 8 }"
      >
        <UButton
          type="button"
          :color="isActive ? 'primary' : 'neutral'"
          :variant="isActive ? 'soft' : 'ghost'"
          icon="i-lucide-brain"
          trailing-icon="i-lucide-chevron-down"
          size="sm"
          :label="buttonLabel"
          :aria-label="statusLabel"
          :aria-pressed="isActive"
        />
      </UDropdownMenu>

      <UButton
        v-else
        type="button"
        :color="isActive ? 'primary' : 'neutral'"
        :variant="isActive ? 'soft' : 'ghost'"
        icon="i-lucide-brain"
        size="sm"
        square
        :disabled="!supported"
        :class="required ? 'cursor-default' : 'disabled:text-dimmed disabled:opacity-40'"
        :aria-label="statusLabel"
        :aria-disabled="!supported || required"
        :aria-pressed="isActive"
        @click="toggleReasoning"
      />
    </span>
  </UTooltip>
</template>
