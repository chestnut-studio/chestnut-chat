<script setup lang="ts">
import { projectIconColorClass, projectIconName } from "@chestnut-chat/api/project/icons";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@chestnut-chat/ui/components/ui/context-menu";
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
} from "@chestnut-chat/ui/components/ui/sidebar";

import type { ProjectRow } from "~/composables/useProjects";
import type { ChatRow } from "~/utils/group-chats";

const props = defineProps<{
  project: ProjectRow;
  chats: ChatRow[];
  open: boolean;
  activeChatId?: string;
  forceOpen?: boolean;
}>();

const emit = defineEmits<{
  toggle: [];
  newChat: [ProjectRow];
  edit: [ProjectRow];
  delete: [ProjectRow];
  renameChat: [ChatRow];
  pinChat: [ChatRow];
  archiveChat: [ChatRow];
  deleteChat: [ChatRow];
  moveChat: [ChatRow];
}>();

const expanded = computed(() => props.forceOpen || props.open);
</script>

<template>
  <SidebarMenuItem>
    <ContextMenu>
      <ContextMenuTrigger as-child>
        <SidebarMenuButton :aria-expanded="expanded" @click="emit('toggle')">
          <span
            v-if="project.iconKind === 'emoji'"
            class="flex size-4 shrink-0 items-center justify-center text-sm"
            aria-hidden="true"
          >
            {{ project.iconValue }}
          </span>
          <BIcon
            v-else
            :name="projectIconName(project.iconValue)"
            class="size-4"
            :class="projectIconColorClass(project.iconColor)"
          />
          <span>{{ project.name }}</span>
        </SidebarMenuButton>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem @select="emit('newChat', project)">
          <BIcon name="i-ri-add-line" />
          {{ $t("project.newChat") }}
        </ContextMenuItem>
        <ContextMenuItem @select="emit('edit', project)">
          <BIcon name="i-ri-settings-3-line" />
          {{ $t("project.edit") }}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" @select="emit('delete', project)">
          <BIcon name="i-ri-delete-bin-line" />
          {{ $t("actions.delete") }}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>

    <SidebarMenuSub v-if="expanded" class="mx-0 ml-3.5 gap-0 border-l-0 pr-0 pl-3">
      <ChatHistoryItem
        v-for="chat in chats"
        :key="chat.id"
        :chat="chat"
        :active="chat.id === activeChatId"
        tree
        @rename="emit('renameChat', $event)"
        @pin="emit('pinChat', $event)"
        @archive="emit('archiveChat', $event)"
        @delete="emit('deleteChat', $event)"
        @move="emit('moveChat', $event)"
      />
      <SidebarMenuSubItem v-if="!chats.length">
        <p class="px-2 py-1 text-caption-1-regular text-text-secondary">
          {{ $t("project.noChats") }}
        </p>
      </SidebarMenuSubItem>
    </SidebarMenuSub>
  </SidebarMenuItem>
</template>
