<script setup lang="ts">
import { useMutation } from "@tanstack/vue-query";

import type { ProjectRow } from "~/composables/useProjects";
import type { ChatRow } from "~/utils/group-chats";
import { groupChats, partitionChatsByProject } from "~/utils/group-chats";

const { t } = useI18n();
const { list, rename, setPinned, setArchived, remove, create: createChat } = useChats();
const { list: projects, remove: removeProject } = useProjects();
const {
  state,
  toggleChats,
  setChatsOpen,
  toggleProjects,
  setProjectsOpen,
  isProjectOpen,
  toggleProject,
  setProjectOpen,
} = useSidebarExpansion();
const authSession = useAuthSession();
const { show: showLogin } = useLoginModal();
const route = useRoute();
const { $orpc } = useNuxtApp();
const { mutateAsync: moveChat, isPending: isMoving } = useMutation(
  $orpc.chat.move.mutationOptions(),
);

const collapsed = ref(false);
const search = ref("");
const renameOpen = ref(false);
const renameTarget = ref<{ id: string; title: string } | null>(null);
const renameValue = ref("");
const deleteOpen = ref(false);
const deleteTarget = ref<{ id: string } | null>(null);
const projectFormOpen = ref(false);
const editingProject = ref<ProjectRow | null>(null);
const deleteProjectOpen = ref(false);
const deleteProjectTarget = ref<ProjectRow | null>(null);
const moveOpen = ref(false);
const moveTarget = ref<ChatRow | null>(null);
const moveProjectId = ref<string | null>(null);

const query = computed(() => search.value.trim().toLowerCase());

const filteredChats = computed(() => {
  const all = (list.data.value ?? []) as ChatRow[];
  const q = query.value;
  if (!q) return all.filter((chat) => !chat.archived);
  return all.filter((chat) => !chat.archived && chat.title.toLowerCase().includes(q));
});

const filteredProjects = computed(() => {
  const all = (projects.data.value ?? []) as ProjectRow[];
  const q = query.value;
  if (!q) return all;

  const matchingChatProjectIds = new Set(
    filteredChats.value.map((chat) => chat.projectId).filter(Boolean),
  );

  return all.filter(
    (project) => project.name.toLowerCase().includes(q) || matchingChatProjectIds.has(project.id),
  );
});

const partitioned = computed(() => partitionChatsByProject(filteredChats.value));
const standaloneGroups = computed(() => groupChats(partitioned.value.standalone));

const forceOpenProjectIds = computed(() => {
  const ids = new Set<string>();
  if (!query.value) return ids;
  for (const project of filteredProjects.value) {
    const nameMatch = project.name.toLowerCase().includes(query.value);
    const hasMatchingChat = (partitioned.value.byProject[project.id] ?? []).some((chat) =>
      chat.title.toLowerCase().includes(query.value),
    );
    if (nameMatch || hasMatchingChat) ids.add(project.id);
  }
  return ids;
});

const forceChatsOpen = computed(() => {
  if (!query.value) return false;
  return partitioned.value.standalone.some((chat) =>
    chat.title.toLowerCase().includes(query.value),
  );
});

const forceProjectsOpen = computed(() => {
  if (!query.value) return false;
  return forceOpenProjectIds.value.size > 0;
});

const chatsExpanded = computed(() => forceChatsOpen.value || state.value.chatsOpen);
const projectsExpanded = computed(() => forceProjectsOpen.value || state.value.projectsOpen);
const activeId = computed(() => route.params.id as string | undefined);

watch(forceChatsOpen, (open) => {
  if (open) setChatsOpen(true);
});

watch(forceProjectsOpen, (open) => {
  if (open) setProjectsOpen(true);
});

watch(forceOpenProjectIds, (ids) => {
  for (const id of ids) setProjectOpen(id, true);
});

async function onNewChat() {
  const session = await authSession.ensure();
  if (!session?.user) {
    showLogin();
    return;
  }

  await navigateTo("/");
}

function openRename(chat: { id: string; title: string }) {
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

function openDelete(chat: { id: string }) {
  deleteTarget.value = chat;
  deleteOpen.value = true;
}

async function confirmDelete() {
  if (deleteTarget.value) {
    const wasActive = activeId.value === deleteTarget.value.id;
    await remove.mutateAsync({ id: deleteTarget.value.id });
    if (wasActive) {
      await navigateTo("/");
    }
  }
  deleteOpen.value = false;
}

async function onPin(chat: { id: string; pinned: boolean }) {
  await setPinned.mutateAsync({ id: chat.id, pinned: !chat.pinned });
}

async function onArchive(chat: { id: string }) {
  await setArchived.mutateAsync({ id: chat.id, archived: true });
}

function openCreateProject() {
  editingProject.value = null;
  projectFormOpen.value = true;
}

function openEditProject(project: ProjectRow) {
  editingProject.value = project;
  projectFormOpen.value = true;
}

function openDeleteProject(project: ProjectRow) {
  deleteProjectTarget.value = project;
  deleteProjectOpen.value = true;
}

async function confirmDeleteProject() {
  if (!deleteProjectTarget.value) return;
  const projectId = deleteProjectTarget.value.id;
  const activeInProject = (list.data.value ?? []).some(
    (chat) => chat.id === activeId.value && chat.projectId === projectId,
  );
  await removeProject.mutateAsync({ id: projectId });
  if (activeInProject) await navigateTo("/");
  deleteProjectOpen.value = false;
}

async function onProjectNewChat(project: ProjectRow) {
  const chat = await createChat.mutateAsync({ projectId: project.id });
  await navigateTo(`/chat/${chat.id}`);
}

function openMove(chat: ChatRow) {
  moveTarget.value = chat;
  moveProjectId.value = chat.projectId ?? null;
  moveOpen.value = true;
}

async function confirmMove() {
  if (!moveTarget.value) return;
  await moveChat({
    chatId: moveTarget.value.id,
    projectId: moveProjectId.value,
  });
  await list.refetch();
  moveOpen.value = false;
}

async function onProjectCreated(payload: { chatId: string }) {
  await navigateTo(`/chat/${payload.chatId}`);
}

const moveItems = computed(() => [
  { label: t("project.noProject"), value: null as string | null },
  ...((projects.data.value ?? []) as ProjectRow[]).map((project) => ({
    label: project.name,
    value: project.id as string | null,
  })),
]);
</script>

<template>
  <UDashboardSidebar
    v-model:collapsed="collapsed"
    collapsible
    resizable
    :min-size="16"
    :default-size="20"
    :max-size="30"
    :ui="{ header: 'border-b border-default', footer: 'border-t border-default' }"
  >
    <template #header="{ collapsed: isCollapsed }">
      <NuxtImg
        src="/favicon.svg"
        alt="Chestnut Chat"
        class="size-6"
        :class="{
          'cursor-pointer mx-auto': isCollapsed,
        }"
        @click="
          () => {
            if (isCollapsed) {
              collapsed = false;
            }
          }
        "
      />
      <span v-if="!isCollapsed" class="truncate font-semibold">{{ $t("app.name") }}</span>
      <UDashboardSidebarCollapse v-if="!isCollapsed" class="ms-auto" />
    </template>

    <template #default="{ collapsed: isCollapsed }">
      <div class="flex h-full min-h-0 flex-col gap-3">
        <UButton
          :label="isCollapsed ? undefined : $t('sidebar.newChat')"
          icon="i-lucide-plus"
          color="neutral"
          variant="outline"
          block
          :square="isCollapsed"
          :loading="authSession.isPending"
          @click="onNewChat"
        />

        <UInput
          v-if="!isCollapsed"
          v-model="search"
          icon="i-lucide-search"
          :placeholder="$t('sidebar.search')"
          size="sm"
        />

        <div v-if="!isCollapsed" class="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <ProjectSidebarSection
            :projects="filteredProjects"
            :chats-by-project="partitioned.byProject"
            :active-chat-id="activeId"
            :expanded="projectsExpanded"
            :is-project-open="isProjectOpen"
            :force-open-project-ids="forceOpenProjectIds"
            @create="openCreateProject"
            @toggle-section="toggleProjects"
            @toggle="toggleProject"
            @new-chat="onProjectNewChat"
            @edit="openEditProject"
            @delete="openDeleteProject"
            @rename-chat="openRename"
            @pin-chat="onPin"
            @archive-chat="onArchive"
            @delete-chat="openDelete"
            @move-chat="openMove"
          />

          <div class="space-y-1">
            <button
              type="button"
              class="flex w-full items-center gap-1 rounded-md px-2 py-1 text-base font-medium text-muted hover:bg-elevated"
              @click="toggleChats"
            >
              <UIcon
                :name="chatsExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                class="size-5"
              />
              <span>{{ $t("sidebar.chats") }}</span>
            </button>

            <div v-if="chatsExpanded" class="space-y-3">
              <div v-for="group in standaloneGroups" :key="group.key" class="pl-4 mb-4">
                <p class="px-2 pb-1 text-xs font-medium text-muted">
                  {{ $t(`groups.${group.key}`) }}
                </p>
                <ChatHistoryItem
                  v-for="chat in group.chats"
                  :key="chat.id"
                  :chat="chat"
                  :active="chat.id === activeId"
                  @rename="openRename"
                  @pin="onPin"
                  @archive="onArchive"
                  @delete="openDelete"
                  @move="openMove"
                />
              </div>

              <p
                v-if="!standaloneGroups.length && list.status.value === 'success'"
                class="px-2 text-sm text-muted"
              >
                {{ $t("sidebar.empty") }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer="{ collapsed: isCollapsed }">
      <ChatSidebarFooter :collapsed="isCollapsed" />
    </template>
  </UDashboardSidebar>

  <ProjectFormModal
    v-model:open="projectFormOpen"
    :project="editingProject"
    @created="onProjectCreated"
  />

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

  <UModal
    v-model:open="deleteProjectOpen"
    :title="$t('project.deleteTitle')"
    :description="$t('project.deleteDescription')"
    :ui="{ footer: 'justify-end' }"
  >
    <template #footer="{ close }">
      <UButton color="neutral" variant="outline" :label="$t('actions.cancel')" @click="close" />
      <UButton
        color="error"
        :label="$t('actions.delete')"
        :loading="removeProject.isPending.value"
        @click="confirmDeleteProject"
      />
    </template>
  </UModal>

  <UModal
    v-model:open="moveOpen"
    :title="$t('project.moveToProject')"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <USelect v-model="moveProjectId" :items="moveItems" value-key="value" class="w-full" />
    </template>
    <template #footer="{ close }">
      <UButton color="neutral" variant="outline" :label="$t('actions.cancel')" @click="close" />
      <UButton :label="$t('actions.save')" :loading="isMoving" @click="confirmMove" />
    </template>
  </UModal>
</template>
