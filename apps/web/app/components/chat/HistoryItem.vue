<script setup lang="ts">
import { Ellipsis } from "lucide-vue-next";
import { BButton, BDropdown, type DropdownItem } from "@chestnut-chat/ui";

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
      icon: "i-lucide-pencil",
      onSelect: () => emit("rename", props.chat),
    },
    {
      label: props.chat.pinned ? t("actions.unpin") : t("actions.pin"),
      icon: "i-lucide-pin",
      onSelect: () => emit("pin", props.chat),
    },
    {
      label: t("actions.archive"),
      icon: "i-lucide-archive",
      onSelect: () => emit("archive", props.chat),
    },
    {
      label: t("project.moveToProject"),
      icon: "i-lucide-folder-input",
      onSelect: () => emit("move", props.chat),
    },
  ],
  [
    {
      label: t("actions.delete"),
      icon: "i-lucide-trash-2",
      color: "danger",
      onSelect: () => emit("delete", props.chat),
    },
  ],
]);
</script>

<template>
  <div
    class="group flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 hover:bg-elevated"
    :class="active ? 'bg-elevated' : ''"
    @click="navigateTo(chatPath(chat))"
  >
    <BIcon v-if="chat.pinned" name="i-lucide-pin" class="size-3 shrink-0 text-muted" />
    <span class="min-w-0 flex-1 truncate text-sm">{{ chat.title }}</span>
    <BDropdown :items="items" @click.stop>
      <BButton
        variant="ghost"
        size="xs"
        icon-only
        :leading-icon="Ellipsis"
        class="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
        @click.stop
      />
    </BDropdown>
  </div>
</template>
