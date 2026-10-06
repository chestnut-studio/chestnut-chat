<script setup lang="ts">
import { Plus } from "lucide-vue-next";
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from "@chestnut-chat/ui/components/ui/sidebar";

import type { ProjectRow } from "~/composables/useProjects";
import type { ChatRow } from "~/utils/group-chats";

defineProps<{
  projects: ProjectRow[];
  chatsByProject: Record<string, ChatRow[]>;
  activeChatId?: string;
  activeProjectId?: string;
  expanded: boolean;
  isProjectOpen: (projectId: string) => boolean;
  forceOpenProjectIds: Set<string>;
}>();

const emit = defineEmits<{
  create: [];
  toggleSection: [];
  toggle: [string];
  select: [ProjectRow];
  newChat: [ProjectRow];
  edit: [ProjectRow];
  delete: [ProjectRow];
  renameChat: [ChatRow];
  pinChat: [ChatRow];
  archiveChat: [ChatRow];
  deleteChat: [ChatRow];
  moveChat: [ChatRow];
}>();
</script>

<template>
  <SidebarGroup>
    <SidebarGroupLabel as-child>
      <button
        type="button"
        class="gap-1 pr-8"
        :aria-expanded="expanded"
        @click="emit('toggleSection')"
      >
        <BIcon :name="expanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" />
        <span class="truncate">{{ $t("project.section") }}</span>
      </button>
    </SidebarGroupLabel>
    <SidebarGroupAction as="button" :aria-label="$t('project.create')" @click="emit('create')">
      <Plus />
    </SidebarGroupAction>

    <SidebarGroupContent v-if="expanded">
      <SidebarMenu>
        <ProjectSidebarItem
          v-for="project in projects"
          :key="project.id"
          :project="project"
          :chats="chatsByProject[project.id] ?? []"
          :open="isProjectOpen(project.id)"
          :force-open="forceOpenProjectIds.has(project.id)"
          :active-chat-id="activeChatId"
          :active-project-id="activeProjectId"
          @toggle="emit('toggle', project.id)"
          @select="emit('select', $event)"
          @new-chat="emit('newChat', $event)"
          @edit="emit('edit', $event)"
          @delete="emit('delete', $event)"
          @rename-chat="emit('renameChat', $event)"
          @pin-chat="emit('pinChat', $event)"
          @archive-chat="emit('archiveChat', $event)"
          @delete-chat="emit('deleteChat', $event)"
          @move-chat="emit('moveChat', $event)"
        />
      </SidebarMenu>

      <p v-if="!projects.length" class="px-2 py-1 text-xs text-muted-foreground">
        {{ $t("project.empty") }}
      </p>
    </SidebarGroupContent>
  </SidebarGroup>
</template>
