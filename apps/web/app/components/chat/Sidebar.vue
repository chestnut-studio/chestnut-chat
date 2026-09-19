<script setup lang="ts">
import { PanelLeftClose, PanelLeftOpen, Plus, Search } from "lucide-vue-next";
import { BButton, BInput, BModal, BSelect } from "@chestnut-chat/ui";
import { useMutation, useQueryClient } from "@tanstack/vue-query";

const mobileOpen = defineModel<boolean>("mobileOpen", { default: false });
const { t } = useI18n();
const { list, rename, setPinned, setArchived, remove, create: createChat } = useChats();
const { list: projects, remove: removeProject } = useProjects();
const { state, toggleChats, toggleProjects, isProjectOpen, toggleProject, setProjectOpen } =
  useSidebarExpansion();
const authSession = useAuthSession();
const { show: showLogin } = useLoginModal();
const route = useRoute();
const { $orpc } = useNuxtApp();
const queryClient = useQueryClient();
const { mutateAsync: moveChat, isPending: isMoving } = useMutation(
  $orpc.chat.move.mutationOptions(),
);

const collapsed = ref(false);
const searchOpen = ref(false);
const searchQuery = shallowRef("");
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

const chats = computed(() =>
  ((list.data.value ?? []) as ChatRow[]).filter((chat) => !chat.archived),
);
const projectRows = computed(() => (projects.data.value ?? []) as ProjectRow[]);

const partitioned = computed(() => partitionChatsByProject(chats.value));
const standaloneGroups = computed(() => groupChats(partitioned.value.standalone));

const chatsExpanded = computed(() => state.value.chatsOpen);
const projectsExpanded = computed(() => state.value.projectsOpen);
const forceOpenProjectIds = new Set<string>();

const projectNameById = computed(() => {
  const map = new Map<string, string>();
  for (const project of projectRows.value) map.set(project.id, project.name);
  return map;
});

const paletteGroups = computed(() => [
  {
    id: "chats",
    label: t("sidebar.chats"),
    items: chats.value.map((chat) => ({
      label: chat.title,
      icon: "i-lucide-message-circle",
      suffix: chat.projectId ? projectNameById.value.get(chat.projectId) : undefined,
      onSelect: () => {
        searchOpen.value = false;
        void navigateTo(chatPath(chat));
      },
    })),
  },
  {
    id: "projects",
    label: t("project.section"),
    items: projectRows.value.map((project) => ({
      label: project.name,
      icon: project.iconKind === "lucide" ? `i-lucide-${project.iconValue}` : "i-lucide-folder",
      onSelect: () => {
        searchOpen.value = false;
        void navigateTo(projectPath(project.id));
      },
    })),
  },
]);

const filteredPaletteGroups = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return paletteGroups.value;
  return paletteGroups.value
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        [item.label, "suffix" in item ? item.suffix : undefined]
          .filter((value): value is string => typeof value === "string")
          .some((value) => value.toLowerCase().includes(query)),
      ),
    }))
    .filter((group) => group.items.length > 0);
});

function onShortcut(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    searchOpen.value = true;
  }
}

onMounted(() => window.addEventListener("keydown", onShortcut));
onBeforeUnmount(() => window.removeEventListener("keydown", onShortcut));

const activeId = computed(
  () => (route.params.chatId as string | undefined) ?? (route.params.id as string | undefined),
);
const routeProjectId = computed(() => route.params.projectId as string | undefined);
const activeProjectId = computed(() => {
  // Only highlight the project row on the project home page, not on nested chats.
  if (route.params.chatId) return undefined;
  return routeProjectId.value;
});

watch(
  routeProjectId,
  (id) => {
    if (id) setProjectOpen(id, true);
  },
  { immediate: true },
);

watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false;
  },
);

function closeSidebar() {
  if (window.matchMedia("(max-width: 639px)").matches) {
    mobileOpen.value = false;
    return;
  }

  collapsed.value = true;
}

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
    const projectId =
      (list.data.value ?? []).find((chat) => chat.id === deleteTarget.value?.id)?.projectId ??
      activeProjectId.value ??
      null;
    await remove.mutateAsync({ id: deleteTarget.value.id });
    if (wasActive) {
      await navigateTo(projectId ? projectPath(projectId) : "/");
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

async function openCreateProject() {
  const session = await authSession.ensure();
  if (!session?.user) {
    showLogin();
    return;
  }

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
  const activeInProject =
    activeProjectId.value === projectId ||
    (list.data.value ?? []).some(
      (chat) => chat.id === activeId.value && chat.projectId === projectId,
    );
  await removeProject.mutateAsync({ id: projectId });
  if (activeInProject) await navigateTo("/");
  deleteProjectOpen.value = false;
}

async function onProjectNewChat(project: ProjectRow) {
  const chat = await createChat.mutateAsync({ projectId: project.id });
  await navigateTo(chatPath({ id: chat.id, projectId: project.id }));
}

function openMove(chat: ChatRow) {
  moveTarget.value = chat;
  moveProjectId.value = chat.projectId ?? null;
  moveOpen.value = true;
}

async function confirmMove() {
  if (!moveTarget.value) return;
  const movedId = moveTarget.value.id;
  const nextProjectId = moveProjectId.value;
  await moveChat({
    chatId: movedId,
    projectId: nextProjectId,
  });
  await list.refetch();
  // The chat.get cache still holds the old projectId; the workspace watch
  // would bounce the navigation back to the stale project path otherwise.
  void queryClient.invalidateQueries({
    queryKey: $orpc.chat.get.queryKey({ input: { id: movedId } }),
  });
  moveOpen.value = false;
  if (activeId.value === movedId) {
    await navigateTo(chatPath({ id: movedId, projectId: nextProjectId }));
  }
}

async function onProjectCreated(payload: { projectId: string; chatId: string }) {
  await navigateTo(chatPath({ id: payload.chatId, projectId: payload.projectId }));
}

function onOpenProject(project: ProjectRow) {
  setProjectOpen(project.id, true);
  void navigateTo(projectPath(project.id));
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
  <button
    v-if="mobileOpen"
    type="button"
    class="fixed inset-0 z-40 bg-black/60 sm:hidden"
    aria-label="Close navigation"
    @click="mobileOpen = false"
  />
  <aside
    class="fixed inset-y-0 left-0 z-50 flex h-full w-72 shrink-0 flex-col border-r border-separator-border bg-background-primary-default transition-transform duration-200 sm:static sm:z-auto sm:translate-x-0 sm:transition-[width]"
    :class="[mobileOpen ? 'translate-x-0' : '-translate-x-full', collapsed ? 'sm:w-16' : 'sm:w-72']"
  >
    <header class="flex h-16 items-center gap-2 border-b border-separator-border px-4">
      <div
        v-if="collapsed"
        role="button"
        class="group relative flex w-full cursor-pointer items-center justify-center"
        :aria-label="$t('sidebar.expand')"
        @click="collapsed = false"
      >
        <NuxtImg
          src="/favicon.svg"
          alt="Chestnut Chat"
          class="size-6 transition-opacity duration-150 group-hover:opacity-0"
        />
        <PanelLeftOpen
          name="i-lucide-panel-left-open"
          aria-hidden="true"
          class="absolute left-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 text-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        />
      </div>
      <template v-else>
        <NuxtImg src="/favicon.svg" alt="Chestnut Chat" class="size-6" />
        <span class="truncate font-semibold">{{ $t("app.name") }}</span>
        <BButton
          class="ms-auto"
          variant="ghost"
          size="small"
          icon-only
          :leading-icon="PanelLeftClose"
          :aria-label="$t('sidebar.collapse')"
          @click="closeSidebar"
        />
      </template>
    </header>

    <div class="flex min-h-0 flex-1 flex-col gap-3 p-4">
      <BButton
        variant="secondary"
        class="w-full"
        :icon-only="collapsed"
        :leading-icon="Plus"
        :aria-label="collapsed ? $t('sidebar.newChat') : undefined"
        :disabled="authSession.isPending"
        @click="onNewChat"
      >
        <span v-if="!collapsed">{{ $t("sidebar.newChat") }}</span>
      </BButton>

      <BButton
        v-if="!collapsed"
        variant="secondary"
        size="small"
        class="w-full justify-start"
        @click="
          () => {
            searchOpen = true;
          }
        "
      >
        <Search class="size-[18px] shrink-0" />
        {{ $t("sidebar.search") }}
      </BButton>

      <div v-if="!collapsed" class="-me-4 min-h-0 flex-1 space-y-4 overflow-y-auto pe-1">
        <ProjectSidebarSection
          :projects="projectRows"
          :chats-by-project="partitioned.byProject"
          :active-chat-id="activeId"
          :active-project-id="activeProjectId"
          :expanded="projectsExpanded"
          :is-project-open="isProjectOpen"
          :force-open-project-ids="forceOpenProjectIds"
          @create="openCreateProject"
          @toggle-section="toggleProjects"
          @toggle="toggleProject"
          @select="onOpenProject"
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
            <BIcon
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

    <footer class="border-t border-separator-border p-4">
      <ChatSidebarFooter :collapsed="collapsed" />
    </footer>
  </aside>

  <BModal v-model:open="searchOpen" :title="$t('sidebar.search')">
    <template #body>
      <BInput v-model="searchQuery" :leading-icon="Search" :placeholder="$t('sidebar.search')" />
      <div class="mt-4 max-h-96 space-y-4 overflow-y-auto">
        <section v-for="group in filteredPaletteGroups" :key="group.id">
          <h3 class="px-2 text-caption-1-semibold text-text-tertiary">{{ group.label }}</h3>
          <button
            v-for="item in group.items"
            :key="item.label"
            type="button"
            class="mt-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-body-regular text-text-primary hover:bg-background-secondary-hover"
            @click="item.onSelect"
          >
            <span>{{ item.label }}</span>
            <span
              v-if="'suffix' in item && item.suffix"
              class="text-caption-1-regular text-text-tertiary"
            >
              {{ item.suffix }}
            </span>
          </button>
        </section>
      </div>
    </template>
  </BModal>

  <ProjectFormModal
    v-model:open="projectFormOpen"
    :project="editingProject"
    @created="onProjectCreated"
  />

  <BModal
    v-model:open="renameOpen"
    :title="$t('confirm.renameTitle')"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <BInput v-model="renameValue" class="w-full" @keydown.enter="confirmRename" />
    </template>

    <template #footer="{ close }">
      <BButton variant="secondary" :disabled="rename.isPending.value" @click="close">
        {{ $t("actions.cancel") }}
      </BButton>
      <BButton :disabled="rename.isPending.value" @click="confirmRename">
        {{ $t("actions.save") }}
      </BButton>
    </template>
  </BModal>

  <BModal
    v-model:open="deleteOpen"
    :title="$t('confirm.deleteTitle')"
    :description="$t('confirm.deleteDescription')"
    :ui="{ footer: 'justify-end' }"
  >
    <template #footer="{ close }">
      <BButton variant="secondary" :disabled="remove.isPending.value" @click="close">
        {{ $t("actions.cancel") }}
      </BButton>
      <BButton variant="danger" :disabled="remove.isPending.value" @click="confirmDelete">
        {{ $t("actions.delete") }}
      </BButton>
    </template>
  </BModal>

  <BModal
    v-model:open="deleteProjectOpen"
    :title="$t('project.deleteTitle')"
    :description="$t('project.deleteDescription')"
    :ui="{ footer: 'justify-end' }"
  >
    <template #footer="{ close }">
      <BButton variant="secondary" :disabled="removeProject.isPending.value" @click="close">
        {{ $t("actions.cancel") }}
      </BButton>
      <BButton
        variant="danger"
        :disabled="removeProject.isPending.value"
        @click="confirmDeleteProject"
      >
        {{ $t("actions.delete") }}
      </BButton>
    </template>
  </BModal>

  <BModal
    v-model:open="moveOpen"
    :title="$t('project.moveToProject')"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <BSelect v-model="moveProjectId" :items="moveItems" class="w-full" />
    </template>
    <template #footer="{ close }">
      <BButton variant="secondary" :disabled="isMoving" @click="close">
        {{ $t("actions.cancel") }}
      </BButton>
      <BButton :disabled="isMoving" @click="confirmMove">
        {{ $t("actions.save") }}
      </BButton>
    </template>
  </BModal>
</template>
