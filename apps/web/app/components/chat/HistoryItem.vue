<script setup lang="ts">
import { Ellipsis } from "~/utils/icons";
import { BDropdown, type DropdownItem } from "@chestnut-chat/ui";
import {
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@chestnut-chat/ui/components/ui/sidebar";

import type { ChatRow } from "~/utils/group-chats";
import { chatPath } from "~/utils/chat-path";

const props = defineProps<{
  chat: ChatRow;
  active: boolean;
  tree?: boolean;
}>();

const emit = defineEmits<{
  rename: [ChatRow];
  pin: [ChatRow];
  archive: [ChatRow];
  delete: [ChatRow];
  move: [ChatRow];
}>();

const { t } = useI18n();

const items = computed<DropdownItem[][]>(() => [
  [
    {
      label: t("actions.rename"),
      icon: "i-ri-pencil-line",
      onSelect: () => emit("rename", props.chat),
    },
    {
      label: props.chat.pinned ? t("actions.unpin") : t("actions.pin"),
      icon: "i-ri-pushpin-line",
      onSelect: () => emit("pin", props.chat),
    },
    {
      label: t("actions.archive"),
      icon: "i-ri-archive-line",
      onSelect: () => emit("archive", props.chat),
    },
    {
      label: t("project.moveToProject"),
      icon: "i-ri-folder-transfer-line",
      onSelect: () => emit("move", props.chat),
    },
  ],
  [
    {
      label: t("actions.delete"),
      icon: "i-ri-delete-bin-line",
      color: "danger",
      onSelect: () => emit("delete", props.chat),
    },
  ],
]);
</script>

<template>
  <SidebarMenuItem
    :class="
      tree &&
      'before:absolute before:top-0 before:-left-3 before:h-full before:border-l before:border-sidebar-border after:absolute after:top-0 after:-left-3 after:h-1/2 after:w-2.5 after:rounded-bl-lg after:border-b after:border-l after:border-sidebar-border last:before:hidden'
    "
  >
    <SidebarMenuButton as-child :is-active="active">
      <NuxtLink :to="chatPath(chat)" :aria-current="active ? 'page' : undefined">
        <BIcon v-if="chat.pinned" name="i-ri-pushpin-line" />
        <span>{{ chat.title }}</span>
      </NuxtLink>
    </SidebarMenuButton>
    <SidebarMenuBadge
      class="right-2 bg-background-secondary font-normal text-text-tertiary group-hover/menu-item:hidden"
    >
      {{ formatShortAge(chat.updatedAt) }}
    </SidebarMenuBadge>
    <BDropdown :items="items">
      <SidebarMenuAction show-on-hover :aria-label="`${$t('sidebar.chats')}: ${chat.title}`">
        <Ellipsis />
      </SidebarMenuAction>
    </BDropdown>
  </SidebarMenuItem>
</template>
