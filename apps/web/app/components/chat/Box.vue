<script setup lang="ts">
import { ArrowUp, Globe, LoaderCircle, Paperclip, RotateCcw, Square } from "~/utils/icons";
import { BButton, BChip, BTooltip } from "@chestnut-chat/ui";
import type { ReasoningEffort } from "@chestnut-chat/api/providers/model-capabilities";
import { projectIconColorClass, projectIconName } from "@chestnut-chat/api/project/icons";
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
import { DEFAULT_MODEL, resolveContextWindow } from "~/utils/models";
import ModelIcon from "./ModelIcon.vue";
import type { ChatMessageUsage } from "~/types/chat";

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

export type ChatBoxProject = {
  id: string;
  name: string;
  iconKind: "emoji" | "lucide";
  iconValue: string;
  iconColor?: string;
};

const props = defineProps<{
  status?: ChatStatus;
  project?: ChatBoxProject | null;
  usage?: ChatMessageUsage | null;
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
const { modelOptions, findModelOption, isLoading: areProvidersLoading } = useModelOptions();
const isBusy = computed(
  () => props.status === "submitted" || props.status === "streaming" || isUploading.value,
);
const promptStatus = computed<ChatStatus | undefined>(() =>
  isUploading.value ? "submitted" : props.status,
);

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
const contextWindow = computed(() =>
  resolveContextWindow(findModelOption(model.value)?.contextWindow),
);
const selectedModelLabel = computed(() => findModelOption(model.value)?.label ?? model.value);
const selectedModelIcon = computed(
  () => findModelOption(model.value)?.providerIcon ?? "openrouter",
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

function onPromptKeydown(event: KeyboardEvent) {
  if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
  event.preventDefault();
  void onSubmit();
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
      <BChip
        v-for="(file, index) in files"
        :key="`${file.name}-${file.size}-${index}`"
        variant="caption"
        color="neutral"
      >
        <BIcon name="i-ri-attachment-2" class="size-3.5 shrink-0" />
        {{ file.name }}
        <button
          type="button"
          class="ml-0.5 inline-flex cursor-pointer items-center rounded-sm p-0.5 hover:text-text-primary"
          :aria-label="$t('chat.attachRemove')"
          @click="removeFile(index)"
        >
          <BIcon name="i-ri-close-line" class="size-3.5 shrink-0" />
        </button>
      </BChip>
    </div>

    <ChatComposerLoader :active="isBusy" class="relative z-10">
      <div
        class="rounded-3xl border border-border-button-default bg-background-primary-default p-3 shadow-card transition-shadow focus-within:ring-2 focus-within:ring-border-focus-ring/40"
      >
        <textarea
          v-model="input"
          :placeholder="$t('chat.placeholder')"
          rows="2"
          class="max-h-40 min-h-12 w-full resize-none bg-transparent px-1 py-2 text-body-regular text-text-primary outline-none placeholder:text-text-placeholder"
          @paste="onPaste"
          @keydown="onPromptKeydown"
        />

        <div class="flex items-end justify-between gap-2">
          <div class="flex min-w-0 flex-wrap items-center gap-1.5">
            <BTooltip
              :text="
                selectedModelSupportsVision ? $t('chat.attach') : $t('chat.attachDocumentsOnly')
              "
            >
              <button
                type="button"
                class="flex size-8 shrink-0 items-center justify-center rounded-full bg-ai-chat-composer-add-background text-foreground-icon-secondary transition-colors hover:bg-ai-chat-composer-add-hover-background hover:text-foreground-icon-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring disabled:opacity-50"
                :disabled="isUploading"
                :aria-label="$t('chat.attach')"
                @click="fileInput?.click()"
              >
                <Paperclip class="size-4" />
              </button>
            </BTooltip>

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

            <BTooltip :text="$t('chat.webSearch')">
              <BButton
                :variant="webSearch ? 'ghost' : 'tertiary'"
                size="small"
                icon-only
                :leading-icon="Globe"
                :aria-label="$t('chat.webSearch')"
                :aria-pressed="webSearch"
                @click="
                  () => {
                    webSearch = !webSearch;
                  }
                "
              />
            </BTooltip>

            <input
              ref="fileInput"
              type="file"
              multiple
              :accept="ATTACHMENT_ACCEPT"
              class="hidden"
              @change="onPickFiles"
            />
          </div>

          <BButton
            v-if="promptStatus === 'error'"
            size="small"
            icon-only
            :leading-icon="RotateCcw"
            :aria-label="$t('actions.regenerate')"
            @click="emit('reload')"
          />
          <BButton
            v-else-if="isBusy"
            size="small"
            icon-only
            :leading-icon="promptStatus === 'submitted' ? LoaderCircle : Square"
            :aria-label="$t('chat.stop')"
            @click="emit('stop')"
          />
          <BButton
            v-else
            size="small"
            icon-only
            :leading-icon="ArrowUp"
            :aria-label="$t('chat.send')"
            :disabled="!input.trim() && files.length === 0"
            @click="onSubmit"
          />
        </div>
      </div>
    </ChatComposerLoader>

    <div
      class="mx-5 -mt-3 flex items-center gap-3 rounded-b-2xl border border-t-0 border-border-button-default bg-background-secondary-default px-3 pb-1.5 pt-4 text-caption-1-medium text-text-secondary"
    >
      <span v-if="project" class="flex min-w-0 items-center gap-1.5">
        <span v-if="project.iconKind === 'emoji'" aria-hidden="true">{{ project.iconValue }}</span>
        <BIcon
          v-else
          :name="projectIconName(project.iconValue)"
          class="size-3.5 shrink-0"
          :class="projectIconColorClass(project.iconColor)"
        />
        <span class="truncate">{{ project.name }}</span>
      </span>
      <span class="flex min-w-0 items-center gap-1.5">
        <ModelIcon :icon="selectedModelIcon" />
        <span class="truncate">{{ selectedModelLabel }}</span>
      </span>
      <ChatUsageIndicator
        v-if="usage"
        class="ml-auto"
        :usage="usage"
        :context-window="contextWindow"
      />
    </div>

    <slot name="below" :submit-suggestion="submitSuggestion" :disabled="isBusy" />
  </div>
</template>
