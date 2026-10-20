<script setup lang="ts">
import { Ellipsis } from "~/utils/icons";
import { BDropdown, type DropdownItem } from "@chestnut-chat/ui";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@chestnut-chat/ui/components/ui/sidebar";

import type { ChatRow } from "~/utils/group-chats";
import { chatPath } from "~/utils/chat-path";

const props = defineProps<{
  chat: ChatRow;
  active: boolean;
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
  <SidebarMenuItem>
    <SidebarMenuButton as-child :is-active="active">
      <NuxtLink :to="chatPath(chat)" :aria-current="active ? 'page' : undefined">
        <BIcon v-if="chat.pinned" name="i-ri-pushpin-line" />
        <span>{{ chat.title }}</span>
      </NuxtLink>
    </SidebarMenuButton>
    <BDropdown :items="items">
      <SidebarMenuAction show-on-hover :aria-label="`${$t('sidebar.chats')}: ${chat.title}`">
        <Ellipsis />
      </SidebarMenuAction>
    </BDropdown>
  </SidebarMenuItem>
</template>
