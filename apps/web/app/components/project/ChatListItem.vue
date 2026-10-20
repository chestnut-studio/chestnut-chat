<script setup lang="ts">
import { Ellipsis } from "~/utils/icons";
import { BButton, BDropdown, type DropdownItem } from "@chestnut-chat/ui";

import type { ChatRow } from "~/utils/group-chats";

const props = defineProps<{
  chat: ChatRow;
  dateLabel: string;
}>();

const emit = defineEmits<{
  open: [ChatRow];
  rename: [ChatRow];
  pin: [ChatRow];
  archive: [ChatRow];
  delete: [ChatRow];
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
  <div
    class="group flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-elevated"
    @click="emit('open', chat)"
  >
    <BIcon v-if="chat.pinned" name="i-ri-pushpin-line" class="size-3.5 shrink-0 text-muted" />
    <span class="min-w-0 flex-1 truncate text-sm">{{ chat.title }}</span>
    <span class="shrink-0 text-xs text-muted">{{ dateLabel }}</span>
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
