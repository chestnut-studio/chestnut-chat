<script setup lang="ts">
import { Minus, Plus, Search } from "~/utils/icons";
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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@chestnut-chat/ui/components/ui/sidebar";
import { Button } from "@chestnut-chat/ui/components/ui/button";
import type SidebarDialogs from "./SidebarDialogs.vue";

const { state: sidebarState, isMobile, setOpenMobile, toggleSidebar } = useSidebar();
const { t } = useI18n();
const { list, setPinned, setArchived, create: createChat } = useChats();
const { list: projects } = useProjects();
const { state, toggleChats, toggleProjects, isProjectOpen, toggleProject, setProjectOpen } =
  useSidebarExpansion();
const authSession = useAuthSession();
const { show: showLogin } = useLoginModal();
const route = useRoute();

const dialogs = useTemplateRef<InstanceType<typeof SidebarDialogs>>("dialogs");
const collapsed = computed(() => !isMobile.value && sidebarState.value === "collapsed");
const searchOpen = ref(false);
const projectFormOpen = ref(false);
const editingProject = ref<ProjectRow | null>(null);

const projectRows = computed(() => (projects.data.value ?? []) as ProjectRow[]);
const partitioned = computed(() =>
  partitionChatsByProject(((list.data.value ?? []) as ChatRow[]).filter((chat) => !chat.archived)),
);
const standaloneChats = computed(() =>
  [...partitioned.value.standalone].sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  ),
);

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

const activeId = computed(() => (route.params.chatId ?? route.params.id) as string | undefined);
const routeProjectId = computed(() => route.params.projectId as string | undefined);
// Only highlight the project row on the project home page, not on nested chats.
const activeProjectId = computed(() => (route.params.chatId ? undefined : routeProjectId.value));

watch(routeProjectId, (id) => id && setProjectOpen(id, true), { immediate: true });
watch(
  () => route.fullPath,
  () => setOpenMobile(false),
);

async function requireSession() {
  const session = await authSession.ensure();
  if (!session?.user) showLogin();
  return !!session?.user;
}

async function onNewChat() {
  if (await requireSession()) await navigateTo("/");
}

async function openCreateProject() {
  if (!(await requireSession())) return;
  editingProject.value = null;
  projectFormOpen.value = true;
}

function openEditProject(project: ProjectRow) {
  editingProject.value = project;
  projectFormOpen.value = true;
}

async function onProjectNewChat(project: ProjectRow) {
  const chat = await createChat.mutateAsync({ projectId: project.id });
  await navigateTo(chatPath({ id: chat.id, projectId: project.id }));
}

const onPin = (chat: { id: string; pinned: boolean }) =>
  setPinned.mutateAsync({ id: chat.id, pinned: !chat.pinned });
const onArchive = (chat: { id: string }) =>
  setArchived.mutateAsync({ id: chat.id, archived: true });
const onProjectCreated = (payload: { projectId: string; chatId: string }) =>
  navigateTo(chatPath({ id: payload.chatId, projectId: payload.projectId }));
</script>

<template>
  <Sidebar collapsible="icon" variant="floating">
    <SidebarHeader
      :class="cn('flex-row items-center gap-2', authSession.isAuthenticated ? 'p-4 pb-2' : 'p-2')"
    >
      <Button
        v-if="collapsed"
        variant="ghost"
        size="icon-sm"
        class="group relative"
        :aria-label="$t('sidebar.expand')"
        @click="toggleSidebar"
      >
        <NuxtImg
          src="/favicon.svg"
          alt="Chestnut Chat"
          class="size-6 transition-opacity duration-150 group-hover:opacity-0"
        />
        <Icon
          name="ri:side-bar-fill"
          size="20"
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
        <span class="truncate text-body-semibold text-text-primary">{{ $t("app.name") }}</span>
        <SidebarTrigger class="ms-auto size-9" :aria-label="$t('sidebar.collapse')">
          <Icon size="20" name="ri:side-bar-line" />
        </SidebarTrigger>
      </template>
    </SidebarHeader>
    <SidebarHeader :class="cn(authSession.isAuthenticated ? 'px-4 pb-3 pt-1' : 'px-2 pb-2 pt-0')">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            variant="outline"
            :tooltip="$t('sidebar.search')"
            :aria-label="$t('sidebar.search')"
            @click="searchOpen = true"
          >
            <Search />
            <span v-if="!collapsed">{{ $t("sidebar.quickSearch") }}</span>
            <kbd
              v-if="!collapsed"
              class="ml-auto rounded-md bg-background-secondary px-1.5 text-caption-1-regular text-text-tertiary"
            >
              ⌘K
            </kbd>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            :is-active="route.path === '/'"
            :tooltip="$t('sidebar.newChat')"
            :aria-label="$t('sidebar.newChat')"
            :disabled="authSession.isPending"
            @click="onNewChat"
          >
            <Plus />
            <span v-if="!collapsed">{{ $t("sidebar.newChat") }}</span>
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
                    <p class="py-2 text-caption-1-regular text-text-secondary">
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
          @select="(project) => setProjectOpen(project.id, true)"
          @new-chat="onProjectNewChat"
          @edit="openEditProject"
          @delete="dialogs?.removeProject($event)"
          @rename-chat="dialogs?.rename($event)"
          @pin-chat="onPin"
          @archive-chat="onArchive"
          @delete-chat="dialogs?.remove($event)"
          @move-chat="dialogs?.move($event)"
        />

        <ChatSidebarChats
          :chats="standaloneChats"
          :active-chat-id="activeId"
          :expanded="chatsExpanded"
          :loaded="list.status.value === 'success'"
          @toggle="toggleChats"
          @rename="dialogs?.rename($event)"
          @pin="onPin"
          @archive="onArchive"
          @delete="dialogs?.remove($event)"
          @move="dialogs?.move($event)"
        />
      </div>
    </SidebarContent>

    <SidebarFooter :class="cn(authSession.isAuthenticated ? 'p-4 pt-2' : 'p-2')">
      <ChatSidebarFooter :collapsed="collapsed" />
      <ChatSidebarUser :collapsed="collapsed" />
    </SidebarFooter>
    <SidebarRail v-if="!authSession.isAuthenticated" />
  </Sidebar>

  <ChatSidebarSearch v-model:open="searchOpen" />

  <ProjectFormModal
    v-model:open="projectFormOpen"
    :project="editingProject"
    @created="onProjectCreated"
  />

  <ChatSidebarDialogs ref="dialogs" />
</template>
