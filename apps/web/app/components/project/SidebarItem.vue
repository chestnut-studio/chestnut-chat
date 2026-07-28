<script setup lang="ts">
import { projectIconColorClass } from "@chestnut-chat/api/project/icons";
import type { DropdownMenuItem } from "@nuxt/ui";

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

const items = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: t("project.newChat"),
      icon: "i-lucide-plus",
      onSelect: () => emit("newChat", props.project),
    },
    {
      label: t("project.edit"),
      icon: "i-lucide-settings-2",
      onSelect: () => emit("edit", props.project),
    },
  ],
  [
    {
      label: t("actions.delete"),
      icon: "i-lucide-trash-2",
      color: "error",
      onSelect: () => emit("delete", props.project),
    },
  ],
]);

const iconColorClass = computed(() => projectIconColorClass(props.project.iconColor));
</script>

<template>
  <div>
    <div
      class="group flex cursor-pointer items-center gap-1 rounded-md px-2 pl-4 py-1.5 hover:bg-elevated"
      :class="isActive ? 'bg-elevated' : ''"
      @click="emit('select', project)"
    >
      <button
        type="button"
        class="flex size-4 shrink-0 items-center justify-center rounded text-muted hover:text-default"
        :aria-label="expanded ? $t('project.collapse') : $t('project.expand')"
        @click.stop="emit('toggle')"
      >
        <UIcon
          :name="expanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
          class="size-4"
        />
      </button>
      <span v-if="project.iconKind === 'emoji'" class="text-sm">{{ project.iconValue }}</span>
      <UIcon
        v-else
        :name="`i-lucide-${project.iconValue}`"
        class="size-3.5 shrink-0"
        :class="iconColorClass"
      />
      <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ project.name }}</span>
      <UDropdownMenu :items="items" @click.stop>
        <UButton
          icon="i-lucide-ellipsis"
          color="neutral"
          variant="ghost"
          size="xs"
          class="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
          @click.stop
        />
      </UDropdownMenu>
    </div>

    <div v-if="expanded" class="ms-3 space-y-0.5 border-s border-default ps-2">
      <ChatHistoryItem
        v-for="chat in chats"
        :key="chat.id"
        :chat="chat"
        :active="chat.id === activeChatId"
        @rename="emit('renameChat', $event)"
        @pin="emit('pinChat', $event)"
        @archive="emit('archiveChat', $event)"
        @delete="emit('deleteChat', $event)"
        @move="emit('moveChat', $event)"
      />
      <p v-if="!chats.length" class="px-2 py-1 text-xs text-muted">
        {{ $t("project.noChats") }}
      </p>
    </div>
  </div>
</template>
