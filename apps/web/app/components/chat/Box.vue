<script setup lang="ts">
import type { ReasoningEffort } from "@chestnut-chat/api/providers/model-capabilities";
import type { ChatStatus, FileUIPart } from "ai";
import { toast } from "vue-sonner";

import type { DocumentAttachment } from "@chestnut-chat/api/chat/attachments";
import {
  ATTACHMENT_ACCEPT,
  DEFAULT_ATTACHMENT_PROMPT,
  attachmentPartsFromProcessed,
  isImageFile,
  uploadAttachments,
  validateAttachmentSelection,
} from "~/utils/attachments";
import { DEFAULT_MODEL, buildProviderModelOptions, decodeChatModelValue } from "~/utils/models";

type ChatBoxPayload = {
  text: string;
  model: string;
  reasoning: boolean;
  reasoningEffort: ReasoningEffort;
  webSearch: boolean;
  files: FileUIPart[];
  documents: DocumentAttachment[];
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
const isUploading = ref(false);
const { t } = useI18n();
const config = useRuntimeConfig();
const { storage: providerStorage, isLoading: areProvidersLoading } = useProviderKeys();
const isBusy = computed(
  () => props.status === "submitted" || props.status === "streaming" || isUploading.value,
);
const promptStatus = computed<ChatStatus | undefined>(() =>
  isUploading.value ? "submitted" : props.status,
);

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
const selectedModelSupportsVision = computed(() => findModelOption(model.value)?.vision ?? false);
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

watch(selectedModelSupportsVision, (supportsVision) => {
  if (supportsVision) return;
  const next = files.value.filter((file) => !isImageFile(file));
  if (next.length !== files.value.length) {
    files.value = next;
    toast.message(t("chat.attachImagesRemoved"));
  }
});

function onSelectModel(value: string) {
  const option = findModelOption(value);
  model.value = value;
  reasoning.value = option?.reasoning ?? false;
  const efforts = option?.reasoningEfforts ?? [];
  reasoningEffort.value =
    efforts.includes("low") && efforts.includes("max") ? "max" : (efforts[0] ?? "high");
}

function validationMessage(code: string) {
  switch (code) {
    case "tooMany":
      return t("chat.attachTooMany");
    case "unsupportedType":
      return t("chat.attachUnsupportedType");
    case "empty":
      return t("chat.attachEmpty");
    case "tooLarge":
      return t("chat.attachTooLarge");
    case "visionRequired":
      return t("chat.attachVisionRequired");
    default:
      return t("chat.attachFailed");
  }
}

function onPickFiles(event: Event) {
  const target = event.target as HTMLInputElement;
  const picked = Array.from(target.files ?? []);
  if (!picked.length) return;

  const next = [...files.value, ...picked];
  const error = validateAttachmentSelection(next, {
    supportsVision: selectedModelSupportsVision.value,
  });
  if (error) {
    toast.error(validationMessage(error));
    if (fileInput.value) fileInput.value.value = "";
    return;
  }

  files.value = next;
  if (fileInput.value) fileInput.value.value = "";
}

function removeFile(index: number) {
  files.value = files.value.filter((_, i) => i !== index);
}

function onPaste(event: ClipboardEvent) {
  const textarea = event.currentTarget as HTMLTextAreaElement;

  requestAnimationFrame(() => {
    textarea.scrollTop = textarea.scrollHeight;
  });
}

function clearFiles() {
  files.value = [];
  if (fileInput.value) {
    fileInput.value.value = "";
  }
}

async function submitPayload(text: string) {
  const trimmed = text.trim();
  if ((!trimmed && files.value.length === 0) || isBusy.value) return false;

  let attachmentFiles: FileUIPart[] = [];
  let documents: DocumentAttachment[] = [];

  if (files.value.length > 0) {
    const error = validateAttachmentSelection(files.value, {
      supportsVision: selectedModelSupportsVision.value,
    });
    if (error) {
      toast.error(validationMessage(error));
      return false;
    }

    isUploading.value = true;
    try {
      const processed = await uploadAttachments(config.public.serverUrl, files.value);
      const parts = attachmentPartsFromProcessed(processed);
      attachmentFiles = parts.files;
      documents = parts.documents;
    } catch (error) {
      toast.error(t("chat.attachFailed"), {
        description: error instanceof Error ? error.message : undefined,
      });
      return false;
    } finally {
      isUploading.value = false;
    }
  }

  const payload: ChatBoxPayload = {
    text: trimmed || (attachmentFiles.length || documents.length ? DEFAULT_ATTACHMENT_PROMPT : ""),
    model: model.value,
    reasoning: selectedReasoningEnabled.value,
    reasoningEffort: reasoningEffort.value,
    webSearch: webSearch.value,
    files: attachmentFiles,
    documents,
  };

  if (!payload.text) return false;
  if (props.beforeSubmit && !(await props.beforeSubmit(payload))) return false;

  emit("submit", payload);
  return true;
}

async function onSubmit() {
  if (isBusy.value) {
    emit("stop");
    return;
  }

  if (!(await submitPayload(input.value))) return;

  input.value = "";
  clearFiles();
}

async function submitSuggestion(text: string) {
  await submitPayload(text);
}
</script>

<template>
  <div class="w-full">
    <div v-if="files.length" class="mb-2 flex flex-wrap gap-2">
      <UBadge
        v-for="(file, index) in files"
        :key="`${file.name}-${file.size}-${index}`"
        color="neutral"
        variant="subtle"
        :label="file.name"
        icon="i-lucide-paperclip"
      >
        <template #trailing>
          <UButton
            color="neutral"
            variant="link"
            size="xs"
            icon="i-lucide-x"
            class="ms-1"
            :aria-label="$t('chat.attachRemove')"
            @click="removeFile(index)"
          />
        </template>
      </UBadge>
    </div>

    <UChatPrompt
      v-model="input"
      :placeholder="$t('chat.placeholder')"
      :maxrows="8"
      @paste="onPaste"
      @submit="onSubmit"
    >
      <UChatPromptSubmit :status="promptStatus" @stop="emit('stop')" @reload="emit('reload')" />

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

          <UTooltip
            :text="
              selectedModelSupportsVision ? $t('chat.attach') : $t('chat.attachDocumentsOnly')
            "
          >
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-paperclip"
              size="sm"
              square
              :disabled="isUploading"
              :aria-label="$t('chat.attach')"
              @click="fileInput?.click()"
            />
          </UTooltip>

          <input
            ref="fileInput"
            type="file"
            multiple
            :accept="ATTACHMENT_ACCEPT"
            class="hidden"
            @change="onPickFiles"
          />
        </div>
      </template>
    </UChatPrompt>

    <slot name="below" :submit-suggestion="submitSuggestion" :disabled="isBusy" />
  </div>
</template>
