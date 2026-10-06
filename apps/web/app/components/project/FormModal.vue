<script setup lang="ts">
import { ChevronDown, Paperclip, Trash2, X } from "lucide-vue-next";
import { BButton, BChip, BFormField, BInput, BModal, BSelect, BTextarea } from "@chestnut-chat/ui";

import {
  PROJECT_FILE_ACCEPT,
  MAX_PROJECT_FILES,
  validateProjectFileSelection,
} from "@chestnut-chat/api/project/files";
import { PROJECT_QUICK_SUGGESTIONS } from "@chestnut-chat/api/project/icons";
import { useQuery } from "@tanstack/vue-query";
import { toast } from "vue-sonner";

import type { ProjectFormInput, ProjectRow } from "~/composables/useProjects";

const open = defineModel<boolean>("open", { required: true });

const props = defineProps<{
  project?: ProjectRow | null;
}>();

const emit = defineEmits<{
  created: [{ projectId: string; chatId: string }];
  updated: [{ projectId: string }];
}>();

const { t } = useI18n();
const { $orpc } = useNuxtApp();
const authSession = useAuthSession();
const { createWithFiles, update, uploadFiles, deleteFile } = useProjects();

const name = ref("");
const iconKind = ref<"emoji" | "lucide">("emoji");
const iconValue = ref("📁");
const iconColor = ref<"neutral" | "red" | "orange" | "emerald" | "sky" | "blue" | "violet">(
  "neutral",
);
const memoryMode = ref<"default" | "project">("default");
const instructions = ref("");
const advancedOpen = ref(false);
const pendingFiles = ref<File[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);
const submitting = ref(false);

const isEdit = computed(() => Boolean(props.project));

const existingFiles = useQuery(
  computed(() => ({
    ...$orpc.project.files.queryOptions({ input: { projectId: props.project?.id ?? "" } }),
    enabled: Boolean(props.project) && authSession.isAuthenticated,
  })),
);

watch(
  () => [open.value, props.project] as const,
  ([isOpen, project]) => {
    if (!isOpen) return;
    if (project) {
      name.value = project.name;
      iconKind.value = project.iconKind;
      iconValue.value = project.iconValue;
      iconColor.value = (project.iconColor as typeof iconColor.value) || "neutral";
      memoryMode.value = project.memoryMode;
      instructions.value = project.instructions ?? "";
      advancedOpen.value = Boolean(project.instructions || project.memoryMode === "project");
    } else {
      name.value = "";
      iconKind.value = "emoji";
      iconValue.value = "📁";
      iconColor.value = "neutral";
      memoryMode.value = "default";
      instructions.value = "";
      advancedOpen.value = false;
    }
    pendingFiles.value = [];
  },
  { immediate: true },
);

function applySuggestion(key: (typeof PROJECT_QUICK_SUGGESTIONS)[number]["key"]) {
  const suggestion = PROJECT_QUICK_SUGGESTIONS.find((item) => item.key === key);
  if (!suggestion) return;
  name.value = t(`project.suggestions.${key}`);
  iconKind.value = "emoji";
  iconValue.value = suggestion.emoji;
  iconColor.value = "neutral";
  instructions.value = t(`project.presets.${key}`);
  advancedOpen.value = true;
}

function onPickFiles(event: Event) {
  const target = event.target as HTMLInputElement;
  const picked = Array.from(target.files ?? []);
  if (!picked.length) return;

  const existingCount = (existingFiles.data.value?.length ?? 0) + pendingFiles.value.length;
  const error = validateProjectFileSelection(
    picked.map((file) => ({ name: file.name, type: file.type, size: file.size })),
    existingCount,
  );
  if (error) {
    toast.error(t(`project.validation.${error}`));
  } else {
    pendingFiles.value = [...pendingFiles.value, ...picked];
  }
  if (fileInput.value) fileInput.value.value = "";
}

function removePending(index: number) {
  pendingFiles.value = pendingFiles.value.filter((_, i) => i !== index);
}

async function removeExisting(fileId: string) {
  if (!props.project) return;
  await deleteFile.mutateAsync({ projectId: props.project.id, fileId });
  await existingFiles.refetch();
}

async function onSubmit() {
  const trimmed = name.value.trim();
  if (!trimmed || trimmed.length > 80) {
    toast.error(t("project.validation.name"));
    return;
  }

  const payload: ProjectFormInput = {
    name: trimmed,
    iconKind: iconKind.value,
    iconValue: iconValue.value,
    iconColor: iconColor.value,
    memoryMode: memoryMode.value,
    instructions: instructions.value.trim() || null,
  };

  submitting.value = true;
  try {
    if (props.project) {
      await update.mutateAsync({ id: props.project.id, ...payload });
      if (pendingFiles.value.length) {
        const upload = await uploadFiles(props.project.id, pendingFiles.value);
        for (const result of upload.results) {
          if (!result.ok) {
            toast.error(t("project.fileFailed", { name: result.filename }), {
              description: result.error,
            });
          }
        }
        await existingFiles.refetch();
      }
      emit("updated", { projectId: props.project.id });
      open.value = false;
      return;
    }

    const created = await createWithFiles(payload, pendingFiles.value);
    emit("created", {
      projectId: created.project.id,
      chatId: created.initialChat.id,
    });
    open.value = false;
  } catch (error) {
    toast.error(isEdit.value ? t("project.updateFailed") : t("project.createFailed"), {
      description: error instanceof Error ? error.message : undefined,
    });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <BModal
    v-model:open="open"
    :title="isEdit ? $t('project.editTitle') : $t('project.createTitle')"
    :ui="{ footer: 'justify-end', content: 'sm:max-w-lg' }"
  >
    <template #body>
      <div class="space-y-4">
        <div class="flex items-center gap-3">
          <ProjectIconPicker
            v-model:kind="iconKind"
            v-model:value="iconValue"
            v-model:color="iconColor"
          />
          <BInput
            v-model="name"
            maxlength="80"
            class="min-w-0 flex-1"
            :placeholder="$t('project.name')"
            :aria-label="$t('project.name')"
            required
          />
        </div>

        <div class="flex flex-wrap gap-2">
          <BButton
            v-for="suggestion in PROJECT_QUICK_SUGGESTIONS"
            :key="suggestion.key"
            variant="secondary"
            size="xs"
            @click="applySuggestion(suggestion.key)"
          >
            {{ suggestion.emoji }} {{ $t(`project.suggestions.${suggestion.key}`) }}
          </BButton>
        </div>

        <BButton
          variant="ghost"
          size="small"
          class="w-full justify-between"
          :trailing-icon="ChevronDown"
          @click="advancedOpen = !advancedOpen"
        >
          {{ $t("project.advanced") }}
        </BButton>
        <div v-show="advancedOpen" class="mt-3 space-y-4">
          <BFormField :label="$t('project.memoryMode')" :description="$t('project.memoryModeHint')">
            <BSelect
              v-model="memoryMode"
              :items="[
                { label: $t('project.memoryDefault'), value: 'default' },
                { label: $t('project.memoryProject'), value: 'project' },
              ]"
              class="w-full"
            />
          </BFormField>

          <BFormField
            :label="$t('project.instructions')"
            :description="$t('project.instructionsHint')"
          >
            <BTextarea v-model="instructions" :rows="4" :maxlength="8000" class="w-full" />
          </BFormField>

          <BFormField
            :label="$t('project.files')"
            :description="$t('project.filesHint', { count: MAX_PROJECT_FILES })"
          >
            <div class="space-y-2">
              <div
                v-for="file in existingFiles.data.value ?? []"
                :key="file.id"
                class="flex items-center gap-2 rounded-md bg-elevated px-2 py-1.5 text-sm"
              >
                <BIcon name="i-lucide-file-text" class="size-4 shrink-0 text-muted" />
                <span class="min-w-0 flex-1 truncate">{{ file.filename }}</span>
                <BChip variant="caption" color="soft">{{ file.status }}</BChip>
                <BButton
                  variant="ghost"
                  size="xs"
                  icon-only
                  :leading-icon="Trash2"
                  :aria-label="$t('actions.delete')"
                  @click="removeExisting(file.id)"
                />
              </div>

              <div
                v-for="(file, index) in pendingFiles"
                :key="`${file.name}-${index}`"
                class="flex items-center gap-2 rounded-md bg-elevated px-2 py-1.5 text-sm"
              >
                <BIcon name="i-lucide-upload" class="size-4 shrink-0 text-muted" />
                <span class="min-w-0 flex-1 truncate">{{ file.name }}</span>
                <BButton
                  variant="ghost"
                  size="xs"
                  icon-only
                  :leading-icon="X"
                  @click="removePending(index)"
                />
              </div>

              <BButton
                variant="secondary"
                size="small"
                :leading-icon="Paperclip"
                @click="fileInput?.click()"
              >
                {{ $t("project.addFiles") }}
              </BButton>
              <input
                ref="fileInput"
                type="file"
                multiple
                :accept="PROJECT_FILE_ACCEPT"
                class="hidden"
                @change="onPickFiles"
              />
            </div>
          </BFormField>
        </div>
      </div>
    </template>

    <template #footer="{ close }">
      <BButton variant="secondary" :disabled="submitting" @click="close">
        {{ $t("actions.cancel") }}
      </BButton>
      <BButton :disabled="submitting" @click="onSubmit">
        {{ isEdit ? $t("actions.save") : $t("project.create") }}
      </BButton>
    </template>
  </BModal>
</template>
