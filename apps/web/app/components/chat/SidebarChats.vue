<script setup lang="ts">
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from "@chestnut-chat/ui/components/ui/sidebar";

import type { ChatRow } from "~/utils/group-chats";

defineProps<{
  chats: ChatRow[];
  activeChatId?: string;
  expanded: boolean;
  loaded: boolean;
}>();

const emit = defineEmits<{
  toggle: [];
  rename: [ChatRow];
  pin: [ChatRow];
  archive: [ChatRow];
  delete: [ChatRow];
  move: [ChatRow];
}>();
</script>

<template>
  <SidebarGroup class="py-1">
    <SidebarGroupLabel as-child>
      <button type="button" class="gap-1" :aria-expanded="expanded" @click="emit('toggle')">
        <Icon size="16" :name="expanded ? 'i-ri-arrow-down-s-line' : 'i-ri-arrow-right-s-line'" />
        <span class="truncate">{{ $t("sidebar.chats") }}</span>
      </button>
    </SidebarGroupLabel>

    <SidebarGroupContent v-if="expanded">
      <SidebarMenu>
        <ChatHistoryItem
          v-for="chat in chats"
          :key="chat.id"
          :chat="chat"
          :active="chat.id === activeChatId"
          @rename="emit('rename', $event)"
          @pin="emit('pin', $event)"
          @archive="emit('archive', $event)"
          @delete="emit('delete', $event)"
          @move="emit('move', $event)"
        />
      </SidebarMenu>

      <p
        v-if="!chats.length && loaded"
        class="px-2 py-1 text-caption-1-regular text-text-secondary"
      >
        {{ $t("sidebar.empty") }}
      </p>
    </SidebarGroupContent>
  </SidebarGroup>
</template>
