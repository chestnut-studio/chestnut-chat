<script setup lang="ts">
import type { ReasoningEffort } from "@chestnut-chat/api/providers/model-capabilities";
import type { ChatStatus } from "ai";

import { DEFAULT_MODEL, buildProviderModelOptions, decodeChatModelValue } from "~/utils/models";

type ChatBoxPayload = {
  text: string;
  model: string;
  reasoning: boolean;
  reasoningEffort: ReasoningEffort;
  webSearch: boolean;
};
type MaybePromise<T> = T | Promise<T>;

const props = defineProps<{
  status?: ChatStatus;
  beforeSubmit?: (payload: ChatBoxPayload) => MaybePromise<boolean>;
}>();

const emit = defineEmits<{
  submit: [ChatBoxPayload];
  stop: [];
  reload: [];
}>();

const input = ref("");
const model = defineModel<string>({ default: DEFAULT_MODEL });
const reasoning = defineModel<boolean>("reasoning", { default: false });
const reasoningEffort = defineModel<ReasoningEffort>("reasoningEffort", { default: "high" });
const webSearch = defineModel<boolean>("webSearch", { default: false });
const files = ref<File[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);
const { storage: providerStorage, isLoading: areProvidersLoading } = useProviderKeys();
const isBusy = computed(() => props.status === "submitted" || props.status === "streaming");

const configuredProviderModelSources = computed(() => [
  ...BUILTIN_PROVIDERS.map((def) => {
    const entry = providerStorage.value.builtin[def.id];
    return {
      kind: "builtin" as const,
      id: def.id,
      name: entry?.name?.trim() || def.name,
      iconProvider: def.id,
      enabled: !!entry?.enabled,
      models: entry?.models ?? [],
    };
  }),
  ...providerStorage.value.custom.map((provider) => ({
    kind: "custom" as const,
    id: provider.id,
    name: provider.name,
    iconProvider: "custom" as const,
    enabled: provider.enabled,
    models: provider.models ?? [],
  })),
]);

const modelOptions = computed(() =>
  buildProviderModelOptions(configuredProviderModelSources.value),
);

function findModelOption(value: string) {
  const exactOption = modelOptions.value.find((item) => item.value === value);
  if (exactOption) return exactOption;

  return modelOptions.value.find((item) => decodeChatModelValue(item.value)?.modelId === value);
}

const selectedModelSupportsReasoning = computed(
  () => findModelOption(model.value)?.reasoning ?? false,
);
const selectedModelReasoningEfforts = computed(
  () => findModelOption(model.value)?.reasoningEfforts ?? [],
);
const selectedModelRequiresReasoning = computed(
  () => findModelOption(model.value)?.reasoningRequired ?? false,
);
const selectedReasoningEnabled = computed(
  () =>
    selectedModelSupportsReasoning.value &&
    (selectedModelRequiresReasoning.value || reasoning.value),
);

watch(
  [model, modelOptions, areProvidersLoading],
  ([value, options, isLoading]) => {
    const option = findModelOption(value);
    if (option) {
      if (option.value !== value) {
        model.value = option.value;
      }
      return;
    }

    if (isLoading) return;
    if (value) return;

    model.value = options[0]?.value ?? DEFAULT_MODEL;
  },
  { immediate: true },
);

function onSelectModel(value: string) {
  const option = findModelOption(value);
  model.value = value;
  reasoning.value = option?.reasoning ?? false;
  reasoningEffort.value = option?.reasoningEfforts[0] ?? "high";
}

function onPickFiles(event: Event) {
  const target = event.target as HTMLInputElement;
  files.value = Array.from(target.files ?? []);
}

function onPaste(event: ClipboardEvent) {
  const textarea = event.currentTarget as HTMLTextAreaElement;

  requestAnimationFrame(() => {
    textarea.scrollTop = textarea.scrollHeight;
  });
}

async function onSubmit() {
  if (isBusy.value) {
    emit("stop");
    return;
  }

  const text = input.value.trim();
  if (!text) return;

  const payload = {
    text,
    model: model.value,
    reasoning: selectedReasoningEnabled.value,
    reasoningEffort: reasoningEffort.value,
    webSearch: webSearch.value,
  };

  if (props.beforeSubmit && !(await props.beforeSubmit(payload))) return;

  emit("submit", payload);

  input.value = "";
  files.value = [];
  if (fileInput.value) {
    fileInput.value.value = "";
  }
}
</script>

<template>
  <div class="w-full">
    <div v-if="files.length" class="mb-2 flex flex-wrap gap-2">
      <UBadge
        v-for="file in files"
        :key="`${file.name}-${file.size}`"
        color="neutral"
        variant="subtle"
        :label="file.name"
        icon="i-lucide-paperclip"
      />
    </div>

    <UChatPrompt
      v-model="input"
      :placeholder="$t('chat.placeholder')"
      :maxrows="8"
      @paste="onPaste"
      @submit="onSubmit"
    >
      <UChatPromptSubmit :status="status" @stop="emit('stop')" @reload="emit('reload')" />

      <template #footer>
        <div class="flex flex-wrap items-center gap-1.5">
          <ChatModelSelector
            :model-value="model"
            :items="modelOptions"
            :loading="areProvidersLoading"
            @update:model-value="onSelectModel"
          />

          <ChatReasoningSelector
            v-model="reasoning"
            v-model:effort="reasoningEffort"
            :supported="selectedModelSupportsReasoning"
            :required="selectedModelRequiresReasoning"
            :efforts="selectedModelReasoningEfforts"
          />

          <UTooltip :text="$t('chat.webSearch')">
            <UButton
              :color="webSearch ? 'primary' : 'neutral'"
              :variant="webSearch ? 'soft' : 'ghost'"
              icon="i-lucide-globe"
              size="sm"
              square
              :aria-label="$t('chat.webSearch')"
              :aria-pressed="webSearch"
              @click="
                () => {
                  webSearch = !webSearch;
                }
              "
            />
          </UTooltip>

          <UTooltip :text="$t('chat.attach')">
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-paperclip"
              size="sm"
              square
              :aria-label="$t('chat.attach')"
              @click="fileInput?.click()"
            />
          </UTooltip>

          <input ref="fileInput" type="file" multiple class="hidden" @change="onPickFiles" />
        </div>
      </template>
    </UChatPrompt>
  </div>
</template>
