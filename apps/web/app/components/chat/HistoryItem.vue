<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

import type { ChatRow } from "~/utils/group-chats";

const props = defineProps<{
  chat: ChatRow;
  active: boolean;
}>();

const emit = defineEmits<{
  rename: [ChatRow];
  pin: [ChatRow];
  archive: [ChatRow];
  delete: [ChatRow];
}>();

const { t } = useI18n();

const items = computed<DropdownMenuItem[][]>(() => [
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
  ],
  [
    {
      label: t("actions.delete"),
      icon: "i-lucide-trash-2",
      color: "error",
      onSelect: () => emit("delete", props.chat),
    },
  ],
]);
</script>

<template>
  <div
    class="group flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 hover:bg-elevated"
    :class="active ? 'bg-elevated' : ''"
    @click="navigateTo(`/chat/${chat.id}`)"
  >
    <UIcon v-if="chat.pinned" name="i-lucide-pin" class="size-3 shrink-0 text-muted" />
    <span class="min-w-0 flex-1 truncate text-sm">{{ chat.title }}</span>
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
</template>
