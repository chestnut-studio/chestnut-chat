<script setup lang="ts">
import { ArrowUp, Globe, LoaderCircle, Paperclip, RotateCcw, Square } from "~/utils/icons";
import { BButton, BTooltip } from "@chestnut-chat/ui";
import type { ReasoningEffort } from "@chestnut-chat/api/providers/model-capabilities";
import { projectIconColorClass, projectIconName } from "@chestnut-chat/api/project/icons";
import type { ChatStatus, FileUIPart } from "ai";
import { toast } from "vue-sonner";
import { h } from "vue";

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
const authSession = useAuthSession();
const config = useRuntimeConfig();
const { modelOptions, findModelOption, isLoading: areProvidersLoading } = useModelOptions();
const SpinnerIcon = () => h(LoaderCircle, { class: "animate-spin" });
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

type FilePreview = { file: File; url: string | null; extension: string; size: string };

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const previews = ref<FilePreview[]>([]);
watch(
  files,
  (list, _previous, onCleanup) => {
    const items = list.map((file) => ({
      file,
      url: isImageFile(file) ? URL.createObjectURL(file) : null,
      extension: file.name.includes(".") ? file.name.split(".").pop()!.slice(0, 4) : "file",
      size: formatSize(file.size),
    }));
    previews.value = items;
    onCleanup(() => {
      for (const item of items) if (item.url) URL.revokeObjectURL(item.url);
    });
  },
  { immediate: true },
);

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
  if (!authSession.requireAuth()) return false;
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

function guardInteraction(event: Event) {
  if (event instanceof KeyboardEvent && event.key === "Tab") return;
  if (authSession.requireAuth()) return;
  event.preventDefault();
  event.stopPropagation();
  if (event.target instanceof HTMLElement) event.target.blur();
}
</script>

<template>
  <div
    class="w-full"
    @pointerdown.capture="guardInteraction"
    @click.capture="guardInteraction"
    @keydown.capture="guardInteraction"
    @beforeinput.capture="guardInteraction"
    @paste.capture="guardInteraction"
    @drop.capture="guardInteraction"
  >
    <ChatComposerLoader :active="isBusy" class="relative z-10">
      <div
        class="rounded-3xl border bg-background-primary-default p-3 shadow-card transition-[border-color,box-shadow] duration-150 focus-within:border-border-focus-ring focus-within:ring-2 focus-within:ring-border-focus-ring/30"
        :class="isBusy ? 'border-transparent' : 'border-border-button-default'"
      >
        <TransitionGroup
          v-if="previews.length"
          tag="ul"
          enter-active-class="animate-blur-in"
          class="mb-2 flex flex-wrap gap-2 px-1 pt-1"
        >
          <li
            v-for="(item, index) in previews"
            :key="`${item.file.name}-${item.file.size}-${index}`"
            class="group relative"
          >
            <div
              v-if="item.url"
              class="relative size-16 overflow-hidden rounded-2xl border border-border-button-default bg-background-secondary-default"
            >
              <img :src="item.url" :alt="item.file.name" class="size-full object-cover" />
            </div>
            <div
              v-else
              class="flex h-16 w-44 items-center gap-2.5 rounded-2xl border border-border-button-default bg-background-secondary-default px-2.5"
            >
              <span
                class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-button-ghost-background text-button-ghost-foreground"
              >
                <BIcon name="i-ri-file-text-line" class="size-5" />
              </span>
              <span class="flex min-w-0 flex-col">
                <span class="truncate text-caption-1-medium text-text-primary">
                  {{ item.file.name }}
                </span>
                <span class="truncate text-caption-1-regular text-text-tertiary uppercase">
                  {{ item.extension }} · {{ item.size }}
                </span>
              </span>
            </div>

            <span
              v-if="isUploading"
              class="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-accent-500/70 ring-offset-0"
              :class="item.url ? 'bg-background-full/50' : 'bg-background-full/40'"
            >
              <LoaderCircle
                class="absolute top-1/2 left-1/2 size-5 -translate-x-1/2 -translate-y-1/2 animate-spin text-accent-600"
              />
            </span>

            <button
              v-else
              type="button"
              class="absolute -top-1.5 -right-1.5 flex size-5 cursor-pointer items-center justify-center rounded-full border border-border-button-default bg-background-primary-default text-foreground-icon-secondary opacity-0 shadow-card transition-[opacity,color,background-color] duration-150 group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-background-primary-hover hover:text-foreground-icon-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:outline-none"
              :aria-label="`${$t('chat.attachRemove')}: ${item.file.name}`"
              @click="removeFile(index)"
            >
              <BIcon name="i-ri-close-line" class="size-3" />
            </button>
          </li>
        </TransitionGroup>

        <textarea
          v-model="input"
          :readonly="!authSession.isAuthenticated"
          :placeholder="$t('chat.placeholder')"
          rows="2"
          class="max-h-40 min-h-12 w-full resize-none bg-transparent px-1 py-2 text-body-regular text-text-primary outline-none placeholder:text-text-placeholder"
          @paste="onPaste"
          @focus="guardInteraction"
          @keydown="onPromptKeydown"
        />

        <div class="flex items-end justify-between gap-2">
          <div class="flex min-w-0 flex-wrap items-center gap-1.5">
            <BTooltip
              side="top"
              :text="
                selectedModelSupportsVision ? $t('chat.attach') : $t('chat.attachDocumentsOnly')
              "
            >
              <BButton
                variant="secondary"
                size="small"
                icon-only
                :leading-icon="Paperclip"
                :disabled="isUploading"
                :aria-label="$t('chat.attach')"
                @click="fileInput?.click()"
              />
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

            <BTooltip side="top" :text="$t('chat.webSearch')">
              <BButton
                :variant="webSearch ? 'ghost' : 'secondary'"
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
            variant="secondary"
            size="small"
            icon-only
            :leading-icon="RotateCcw"
            :aria-label="$t('actions.regenerate')"
            @click="emit('reload')"
          />
          <BButton
            v-else-if="isBusy"
            variant="secondary"
            size="small"
            icon-only
            :leading-icon="promptStatus === 'submitted' ? SpinnerIcon : Square"
            :aria-label="$t('chat.stop')"
            @click="emit('stop')"
          />
          <BButton
            v-else
            size="small"
            icon-only
            class="shadow-none"
            :leading-icon="ArrowUp"
            :aria-label="$t('chat.send')"
            :disabled="authSession.isAuthenticated && !input.trim() && files.length === 0"
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
