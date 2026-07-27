<script setup lang="ts">
import type { ProjectRow } from "~/composables/useProjects";
import type { ChatRow } from "~/utils/group-chats";

defineProps<{
  projects: ProjectRow[];
  chatsByProject: Record<string, ChatRow[]>;
  activeChatId?: string;
  expanded: boolean;
  isProjectOpen: (projectId: string) => boolean;
  forceOpenProjectIds: Set<string>;
}>();

const emit = defineEmits<{
  create: [];
  toggleSection: [];
  toggle: [string];
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
  <div class="space-y-1">
    <div class="flex items-center gap-1">
      <button
        type="button"
        class="flex min-w-0 flex-1 items-center gap-1 rounded-md px-2 py-1 text-base font-medium text-muted hover:bg-elevated"
        @click="emit('toggleSection')"
      >
        <UIcon
          :name="expanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
          class="size-5 shrink-0"
        />
        <span class="truncate">{{ $t("project.section") }}</span>
      </button>
      <UButton
        icon="i-lucide-plus"
        color="neutral"
        variant="ghost"
        size="xs"
        square
        :aria-label="$t('project.create')"
        @click="emit('create')"
      />
    </div>

    <template v-if="expanded">
      <ProjectSidebarItem
        v-for="project in projects"
        :key="project.id"
        :project="project"
        :chats="chatsByProject[project.id] ?? []"
        :open="isProjectOpen(project.id)"
        :force-open="forceOpenProjectIds.has(project.id)"
        :active-chat-id="activeChatId"
        @toggle="emit('toggle', project.id)"
        @new-chat="emit('newChat', $event)"
        @edit="emit('edit', $event)"
        @delete="emit('delete', $event)"
        @rename-chat="emit('renameChat', $event)"
        @pin-chat="emit('pinChat', $event)"
        @archive-chat="emit('archiveChat', $event)"
        @delete-chat="emit('deleteChat', $event)"
        @move-chat="emit('moveChat', $event)"
      />

      <p v-if="!projects.length" class="px-2 text-xs text-muted">
        {{ $t("project.empty") }}
      </p>
    </template>
  </div>
</template>
