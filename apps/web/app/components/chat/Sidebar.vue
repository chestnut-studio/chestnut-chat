<script setup lang="ts">
import { Minus, PanelLeftClose, PanelLeftOpen, Plus, Search } from "lucide-vue-next";
import { BButton, BInput, BModal, BSelect } from "@chestnut-chat/ui";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@chestnut-chat/ui/components/ui/collapsible";
import { cn } from "@chestnut-chat/ui/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@chestnut-chat/ui/components/ui/sidebar";
import { Button } from "@chestnut-chat/ui/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/vue-query";

const { state: sidebarState, isMobile, setOpenMobile, toggleSidebar } = useSidebar();
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

const collapsed = computed(() => !isMobile.value && sidebarState.value === "collapsed");
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

const guestSections = computed(() => [
  {
    key: "projects",
    label: t("project.section"),
    open: projectsExpanded.value,
    toggle: toggleProjects,
    hint: t("sidebar.guestProjects"),
  },
  {
    key: "chats",
    label: t("sidebar.chats"),
    open: chatsExpanded.value,
    toggle: toggleChats,
    hint: t("sidebar.guestChats"),
  },
]);

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
    setOpenMobile(false);
  },
);

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
  <Sidebar collapsible="icon">
    <SidebarHeader
      :class="
        cn('flex-row items-center gap-2', authSession.isAuthenticated ? 'h-16 px-4' : 'h-14 px-2')
      "
    >
      <Button
        v-if="collapsed"
        variant="ghost"
        size="icon"
        class="group relative"
        :aria-label="$t('sidebar.expand')"
        @click="toggleSidebar"
      >
        <NuxtImg
          src="/favicon.svg"
          alt="Chestnut Chat"
          class="size-6 transition-opacity duration-150 group-hover:opacity-0"
        />
        <PanelLeftOpen
          aria-hidden="true"
          class="absolute opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        />
      </Button>
      <template v-else>
        <NuxtLink
          v-if="!authSession.isAuthenticated"
          to="/"
          :aria-label="$t('app.name')"
          class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"
        >
          <NuxtImg src="/favicon.svg" alt="" class="size-6" />
        </NuxtLink>
        <NuxtImg v-else src="/favicon.svg" alt="Chestnut Chat" class="size-6" />
        <span class="truncate font-semibold">{{ $t("app.name") }}</span>
        <Button
          class="ms-auto"
          variant="ghost"
          size="icon"
          :aria-label="$t('sidebar.collapse')"
          @click="toggleSidebar"
        >
          <PanelLeftClose />
        </Button>
      </template>
    </SidebarHeader>
    <SidebarSeparator v-if="authSession.isAuthenticated" />

    <SidebarHeader :class="cn(authSession.isAuthenticated ? 'p-4' : 'px-2 pb-2 pt-0')">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            :variant="authSession.isAuthenticated ? 'outline' : 'default'"
            :tooltip="$t('sidebar.newChat')"
            :aria-label="$t('sidebar.newChat')"
            :disabled="authSession.isPending"
            @click="onNewChat"
          >
            <Plus />
            <span v-if="!collapsed">{{ $t("sidebar.newChat") }}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            :variant="authSession.isAuthenticated ? 'default' : 'outline'"
            :tooltip="$t('sidebar.search')"
            :aria-label="$t('sidebar.search')"
            @click="searchOpen = true"
          >
            <Search />
            <span v-if="!collapsed">{{ $t("sidebar.search") }}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>

    <SidebarContent>
      <SidebarGroup v-if="!collapsed && !authSession.isAuthenticated">
        <SidebarMenu>
          <Collapsible
            v-for="section in guestSections"
            :key="section.key"
            :open="section.open"
            class="group/collapsible"
            @update:open="section.toggle"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger as-child>
                <SidebarMenuButton>
                  <span>{{ section.label }}</span>
                  <Plus class="ml-auto group-data-[state=open]/collapsible:hidden" />
                  <Minus class="ml-auto group-data-[state=closed]/collapsible:hidden" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <p class="py-2 text-xs leading-relaxed text-muted-foreground">
                      {{ section.hint }}
                    </p>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        </SidebarMenu>
      </SidebarGroup>
      <div v-else-if="!collapsed" class="flex flex-col gap-2 px-2">
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

        <SidebarGroup>
          <SidebarGroupLabel as-child>
            <button type="button" :aria-expanded="chatsExpanded" @click="toggleChats">
              <BIcon :name="chatsExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" />
              <span>{{ $t("sidebar.chats") }}</span>
            </button>
          </SidebarGroupLabel>

          <SidebarGroupContent v-if="chatsExpanded" class="flex flex-col gap-3">
            <div v-for="group in standaloneGroups" :key="group.key">
              <p class="px-2 py-1 text-xs font-medium text-muted-foreground">
                {{ $t(`groups.${group.key}`) }}
              </p>
              <SidebarMenu>
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
              </SidebarMenu>
            </div>

            <p
              v-if="!standaloneGroups.length && list.status.value === 'success'"
              class="px-2 text-sm text-muted-foreground"
            >
              {{ $t("sidebar.empty") }}
            </p>
          </SidebarGroupContent>
        </SidebarGroup>
      </div>
    </SidebarContent>

    <SidebarSeparator v-if="authSession.isAuthenticated" />
    <SidebarFooter :class="cn(authSession.isAuthenticated ? 'p-4' : 'p-2')">
      <ChatSidebarFooter :collapsed="collapsed" />
    </SidebarFooter>
    <SidebarRail v-if="!authSession.isAuthenticated" />
  </Sidebar>

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
