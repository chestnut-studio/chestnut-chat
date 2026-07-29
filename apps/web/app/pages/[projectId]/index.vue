<script setup lang="ts">
import type { DocumentAttachment } from "@chestnut-chat/api/chat/attachments";
import type { ReasoningEffort } from "@chestnut-chat/api/providers/model-capabilities";
import { projectIconColorClass } from "@chestnut-chat/api/project/icons";
import { useQuery } from "@tanstack/vue-query";
import type { FileUIPart } from "ai";
import { toast } from "vue-sonner";

import type { ProjectRow } from "~/composables/useProjects";
import type { ChatRow } from "~/utils/group-chats";
import { chatPath } from "~/utils/chat-path";

definePageMeta({
  layout: "dashboard",
  middleware: ["auth"],
});

const route = useRoute();
const { $orpc } = useNuxtApp();
const { t, locale } = useI18n();
const { create, list: chats, rename, setPinned, setArchived, remove } = useChats();
const pendingChatPrompt = usePendingChatPrompt();

const projectId = computed(() => route.params.projectId as string);

const projectQuery = useQuery(
  computed(() => $orpc.project.get.queryOptions({ input: { id: projectId.value } })),
);

const project = computed(() => (projectQuery.data.value ?? null) as ProjectRow | null);

const projectChats = computed(() => {
  const all = (chats.data.value ?? []) as ChatRow[];
  return all
    .filter((chat) => chat.projectId === projectId.value && !chat.archived)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
});

useHead(() => ({
  title: project.value?.name ?? t("project.section"),
  titleTemplate: "%s - Chestnut Chat",
}));

watch(
  () => projectQuery.error.value,
  (error) => {
    if (!error) return;
    toast.error(t("project.notFound"));
    void navigateTo("/");
  },
);

const isStarting = ref(false);
const projectFormOpen = ref(false);
const renameOpen = ref(false);
const renameTarget = ref<{ id: string; title: string } | null>(null);
const renameValue = ref("");
const deleteOpen = ref(false);
const deleteTarget = ref<{ id: string } | null>(null);

const iconColorClass = computed(() =>
  project.value ? projectIconColorClass(project.value.iconColor) : "",
);

const dateFormatter = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, {
      month: "short",
      day: "numeric",
    }),
);

function formatChatDate(value: string | Date) {
  return dateFormatter.value.format(new Date(value));
}

async function onSubmit(payload: {
  text: string;
  model: string;
  reasoning: boolean;
  reasoningEffort: ReasoningEffort;
  webSearch: boolean;
  files: FileUIPart[];
  documents: DocumentAttachment[];
}) {
  if (isStarting.value || !project.value) return;

  isStarting.value = true;
  try {
    const row = await create.mutateAsync({ projectId: project.value.id });
    if (!row) return;
    pendingChatPrompt.set(row.id, payload);
    await navigateTo(chatPath({ id: row.id, projectId: project.value.id }));
  } catch (error) {
    toast.error(t("toast.chatCreateFailed"), {
      description: error instanceof Error ? error.message : undefined,
    });
  } finally {
    isStarting.value = false;
  }
}

function openRename(chat: ChatRow) {
  renameTarget.value = chat;
  renameValue.value = chat.title;
  renameOpen.value = true;
}

async function confirmRename() {
  if (renameTarget.value && renameValue.value.trim()) {
    await rename.mutateAsync({ id: renameTarget.value.id, title: renameValue.value.trim() });
  }
  renameOpen.value = false;
}

function openDelete(chat: ChatRow) {
  deleteTarget.value = chat;
  deleteOpen.value = true;
}

async function confirmDelete() {
  if (deleteTarget.value) {
    await remove.mutateAsync({ id: deleteTarget.value.id });
  }
  deleteOpen.value = false;
}

async function onPin(chat: ChatRow) {
  await setPinned.mutateAsync({ id: chat.id, pinned: !chat.pinned });
}

async function onArchive(chat: ChatRow) {
  await setArchived.mutateAsync({ id: chat.id, archived: true });
}

function openChat(chat: ChatRow) {
  void navigateTo(chatPath(chat));
}
</script>

<template>
  <UDashboardPanel id="project-home" :ui="{ body: 'overflow-y-auto' }">
    <template #body>
      <div class="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
        <div v-if="projectQuery.isPending.value" class="flex items-center gap-3">
          <USkeleton class="size-10 rounded-full" />
          <USkeleton class="h-8 w-40" />
        </div>

        <div v-else-if="project" class="flex items-center gap-3">
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-full bg-elevated text-lg"
          >
            <span v-if="project.iconKind === 'emoji'">{{ project.iconValue }}</span>
            <UIcon
              v-else
              :name="`i-lucide-${project.iconValue}`"
              class="size-5"
              :class="iconColorClass"
            />
          </div>
          <h1 class="min-w-0 flex-1 truncate text-2xl font-semibold">{{ project.name }}</h1>
          <UButton
            icon="i-lucide-settings-2"
            color="neutral"
            variant="ghost"
            size="sm"
            square
            :aria-label="$t('project.edit')"
            @click="
              () => {
                projectFormOpen = true;
              }
            "
          />
        </div>

        <ChatBox v-if="project" :before-submit="() => !isStarting" @submit="onSubmit" />

        <section v-if="project" class="space-y-3">
          <div class="flex items-center gap-2 border-b border-default pb-2">
            <h2 class="text-sm font-medium text-muted">{{ $t("project.chats") }}</h2>
          </div>

          <div v-if="projectChats.length" class="space-y-0.5">
            <ProjectChatListItem
              v-for="chat in projectChats"
              :key="chat.id"
              :chat="chat"
              :date-label="formatChatDate(chat.updatedAt)"
              @open="openChat"
              @rename="openRename"
              @pin="onPin"
              @archive="onArchive"
              @delete="openDelete"
            />
          </div>
          <p v-else class="py-2 text-sm text-muted">{{ $t("project.noChats") }}</p>
        </section>
      </div>
    </template>
  </UDashboardPanel>

  <ProjectFormModal v-model:open="projectFormOpen" :project="project" />

  <UModal
    v-model:open="renameOpen"
    :title="$t('confirm.renameTitle')"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <UInput v-model="renameValue" class="w-full" @keydown.enter="confirmRename" />
    </template>
    <template #footer="{ close }">
      <UButton color="neutral" variant="outline" :label="$t('actions.cancel')" @click="close" />
      <UButton
        :label="$t('actions.save')"
        :loading="rename.isPending.value"
        @click="confirmRename"
      />
    </template>
  </UModal>

  <UModal
    v-model:open="deleteOpen"
    :title="$t('confirm.deleteTitle')"
    :description="$t('confirm.deleteDescription')"
    :ui="{ footer: 'justify-end' }"
  >
    <template #footer="{ close }">
      <UButton color="neutral" variant="outline" :label="$t('actions.cancel')" @click="close" />
      <UButton
        color="error"
        :label="$t('actions.delete')"
        :loading="remove.isPending.value"
        @click="confirmDelete"
      />
    </template>
  </UModal>
</template>
