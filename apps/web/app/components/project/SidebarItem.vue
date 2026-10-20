<script setup lang="ts">
import { Ellipsis } from "~/utils/icons";
import { BDropdown, type DropdownItem } from "@chestnut-chat/ui";
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
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
  activeProjectId?: string;
  forceOpen?: boolean;
}>();

const emit = defineEmits<{
  toggle: [];
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

const { t } = useI18n();

const expanded = computed(() => props.forceOpen || props.open);
const isActive = computed(() => props.activeProjectId === props.project.id);

const items = computed<DropdownItem[][]>(() => [
  [
    {
      label: t("project.newChat"),
      icon: "i-ri-add-line",
      onSelect: () => emit("newChat", props.project),
    },
    {
      label: t("project.edit"),
      icon: "i-ri-settings-3-line",
      onSelect: () => emit("edit", props.project),
    },
  ],
  [
    {
      label: t("actions.delete"),
      icon: "i-ri-delete-bin-line",
      color: "danger",
      onSelect: () => emit("delete", props.project),
    },
  ],
]);
</script>

<template>
  <SidebarMenuItem>
    <SidebarMenuButton as-child :is-active="isActive" class="pl-8">
      <NuxtLink
        :to="projectPath(project.id)"
        :aria-current="isActive ? 'page' : undefined"
        @click="emit('select', project)"
      >
        <span>{{ project.name }}</span>
      </NuxtLink>
    </SidebarMenuButton>
    <button
      type="button"
      class="absolute left-1.5 top-2 flex size-5 items-center justify-center rounded-md text-text-secondary hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
      :aria-label="expanded ? $t('project.collapse') : $t('project.expand')"
      :aria-expanded="expanded"
      @click="emit('toggle')"
    >
      <BIcon :name="expanded ? 'i-ri-folder-open-line' : 'i-ri-folder-line'" class="size-4" />
    </button>
    <BDropdown :items="items">
      <SidebarMenuAction show-on-hover :aria-label="`${$t('project.section')}: ${project.name}`">
        <Ellipsis />
      </SidebarMenuAction>
    </BDropdown>

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
