<script setup lang="ts">
import type { ChatStatus } from "ai";

import ModelIcon from "./ModelIcon.vue";

import { DEFAULT_MODEL, MODELS } from "~/utils/models";

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
const model = ref(DEFAULT_MODEL);
const reasoning = ref(false);
const webSearch = ref(false);
const files = ref<File[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);
const isBusy = computed(() => props.status === "submitted" || props.status === "streaming");

const selectedProviderIcon = computed(
  () => MODELS.find((item) => item.value === model.value)?.providerIcon ?? "deepseek",
);

watch(model, (value) => {
  reasoning.value = MODELS.find((item) => item.value === value)?.reasoning ?? false;
});

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
            :items="MODELS"
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
              @click="reasoning = !reasoning"
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
              @click="webSearch = !webSearch"
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
