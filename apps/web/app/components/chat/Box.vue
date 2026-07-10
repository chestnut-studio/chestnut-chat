<script setup lang="ts">
import type { ChatStatus } from "ai";

import ModelIcon from "./ModelIcon.vue";

import { DEFAULT_MODEL, buildProviderModelOptions, decodeChatModelValue } from "~/utils/models";

type ChatBoxPayload = {
  text: string;
  model: string;
  reasoning: boolean;
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
const reasoning = ref(false);
const webSearch = ref(false);
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

const selectedProviderIcon = computed(
  () => findModelOption(model.value)?.providerIcon ?? "openrouter",
);

watch(
  model,
  (value) => {
    reasoning.value = findModelOption(value)?.reasoning ?? false;
  },
  { immediate: true },
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

function onPickFiles(event: Event) {
  const target = event.target as HTMLInputElement;
  files.value = Array.from(target.files ?? []);
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
    reasoning: reasoning.value,
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

    <UChatPrompt v-model="input" :placeholder="$t('chat.placeholder')" @submit="onSubmit">
      <UChatPromptSubmit :status="status" @stop="emit('stop')" @reload="emit('reload')" />

      <template #footer>
        <div class="flex flex-wrap items-center gap-1.5">
          <USelect
            v-model="model"
            :items="modelOptions"
            value-key="value"
            size="sm"
            class="w-52"
            :ui="{ value: 'ps-6', itemLeadingIcon: 'size-4' }"
          >
            <template #leading>
              <ModelIcon :icon="selectedProviderIcon" />
            </template>

            <template #item-leading="{ item }">
              <ModelIcon :icon="item.providerIcon" />
            </template>
          </USelect>

          <UTooltip :text="$t('chat.reasoning')">
            <UButton
              :color="reasoning ? 'primary' : 'neutral'"
              :variant="reasoning ? 'soft' : 'ghost'"
              icon="i-lucide-brain"
              size="sm"
              square
              :aria-label="$t('chat.reasoning')"
              @click="
                () => {
                  reasoning = !reasoning;
                }
              "
            />
          </UTooltip>

          <UTooltip :text="$t('chat.webSearch')">
            <UButton
              :color="webSearch ? 'primary' : 'neutral'"
              :variant="webSearch ? 'soft' : 'ghost'"
              icon="i-lucide-globe"
              size="sm"
              square
              :aria-label="$t('chat.webSearch')"
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
