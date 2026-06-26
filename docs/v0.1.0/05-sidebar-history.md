# 05 - Sidebar: new chat, search, grouped history, item actions

## Goal

Fill the sidebar with: a **New chat** button, a **search** input, and the
**chat history** list grouped by time (Today, Yesterday, Previous 7 days,
Previous 30 days, Earlier). Each history item supports **rename**, **pin**,
**archive**, and **delete** via a context menu.

## Prerequisites

- `02-api-chat-routers.md` (the `$orpc.chat.*` routes).
- `04-dashboard-shell.md` (the sidebar shell to fill in).

## Context & files

Read first:

- `apps/web/app/components/chat/Sidebar.vue` - the shell from doc 04.
- `apps/web/app/plugins/orpc.ts` and `apps/web/app/plugins/vue-query.ts` - how
  `$orpc` + TanStack Query work.
- `apps/web/app/pages/dashboard.vue` - existing `useQuery($orpc...)` usage to copy.

Files you will create / edit:

- **Edit** `apps/web/app/components/chat/Sidebar.vue`
- **Create** `apps/web/app/components/chat/HistoryItem.vue`
- **Create** `apps/web/app/composables/useChats.ts` (data + mutations helper)
- **Create** `apps/web/app/utils/group-chats.ts` (pure grouping function)

## Background knowledge

- **Reading data**: `useQuery($orpc.chat.list.queryOptions())`. The result has
  `.data` (a `Ref`), `.status`, etc. (see `dashboard.vue`).
- **Mutations**: `useMutation($orpc.chat.create.mutationOptions())`, then
  `mutateAsync(input)`. After a mutation, **invalidate** the list query so the
  sidebar refreshes:
  ```ts
  const queryClient = useQueryClient();
  await queryClient.invalidateQueries({ queryKey: $orpc.chat.list.queryKey() });
  ```
- **Routing to a chat**: each chat is a route `/chat/[id]`. (Doc 08/10 build that
  page; here just `navigateTo(`/chat/${id}`)`.) The active chat id comes from
  `useRoute().params.id`.
- **Context menu**: use `UDropdownMenu` with `items` (array of arrays = grouped
  sections). Each item: `{ label, icon, color?, onSelect }`.
- **Rename / delete confirm**: use a `UModal` (or `UPopover`) with a `UInput`
  for rename; a `UModal` confirm for delete. Keep it simple and Nuxt UI native.
- **Grouping by time**: compute the day difference between `now` and
  `chat.updatedAt` to bucket each chat. Pinned chats get their own top group.

## Steps

### 1. Pure grouping helper `apps/web/app/utils/group-chats.ts`

```ts
export type ChatRow = {
  id: string;
  title: string;
  pinned: boolean;
  archived: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type ChatGroup = { key: string; label: string; chats: ChatRow[] };

const DAY = 24 * 60 * 60 * 1000;

export function groupChats(chats: ChatRow[]): ChatGroup[] {
  const visible = chats.filter((c) => !c.archived);
  const pinned = visible.filter((c) => c.pinned);
  const rest = visible.filter((c) => !c.pinned);

  const now = Date.now();
  const buckets: Record<string, ChatRow[]> = {
    today: [],
    yesterday: [],
    week: [],
    month: [],
    earlier: [],
  };

  for (const c of rest) {
    const diff = now - new Date(c.updatedAt).getTime();
    if (diff < DAY) buckets.today.push(c);
    else if (diff < 2 * DAY) buckets.yesterday.push(c);
    else if (diff < 7 * DAY) buckets.week.push(c);
    else if (diff < 30 * DAY) buckets.month.push(c);
    else buckets.earlier.push(c);
  }

  const groups: ChatGroup[] = [];
  if (pinned.length) groups.push({ key: "pinned", label: "Pinned", chats: pinned });
  if (buckets.today.length) groups.push({ key: "today", label: "Today", chats: buckets.today });
  if (buckets.yesterday.length)
    groups.push({ key: "yesterday", label: "Yesterday", chats: buckets.yesterday });
  if (buckets.week.length)
    groups.push({ key: "week", label: "Previous 7 days", chats: buckets.week });
  if (buckets.month.length)
    groups.push({ key: "month", label: "Previous 30 days", chats: buckets.month });
  if (buckets.earlier.length)
    groups.push({ key: "earlier", label: "Earlier", chats: buckets.earlier });
  return groups;
}
```

> Group labels are wrapped with i18n in doc 07. For now, plain English strings
> are fine - doc 07 will replace them with `t("...")` keys.

### 2. Data + mutations composable `apps/web/app/composables/useChats.ts`

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

export function useChats() {
  const { $orpc } = useNuxtApp();
  const queryClient = useQueryClient();

  const list = useQuery($orpc.chat.list.queryOptions());

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: $orpc.chat.list.queryKey() });

  const create = useMutation({
    ...$orpc.chat.create.mutationOptions(),
    onSuccess: invalidate,
  });
  const rename = useMutation({
    ...$orpc.chat.rename.mutationOptions(),
    onSuccess: invalidate,
  });
  const setPinned = useMutation({
    ...$orpc.chat.setPinned.mutationOptions(),
    onSuccess: invalidate,
  });
  const setArchived = useMutation({
    ...$orpc.chat.setArchived.mutationOptions(),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    ...$orpc.chat.delete.mutationOptions(),
    onSuccess: invalidate,
  });

  return { list, create, rename, setPinned, setArchived, remove, invalidate };
}
```

### 3. History item `apps/web/app/components/chat/HistoryItem.vue`

A clickable row + a `UDropdownMenu` of actions. Emits events; the parent owns
the mutations and modals.

```vue
<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

import type { ChatRow } from "~/utils/group-chats";

const props = defineProps<{ chat: ChatRow; active: boolean }>();
const emit = defineEmits<{
  rename: [ChatRow];
  pin: [ChatRow];
  archive: [ChatRow];
  delete: [ChatRow];
}>();

const items = computed<DropdownMenuItem[][]>(() => [
  [
    { label: "Rename", icon: "i-lucide-pencil", onSelect: () => emit("rename", props.chat) },
    {
      label: props.chat.pinned ? "Unpin" : "Pin",
      icon: "i-lucide-pin",
      onSelect: () => emit("pin", props.chat),
    },
    { label: "Archive", icon: "i-lucide-archive", onSelect: () => emit("archive", props.chat) },
  ],
  [
    {
      label: "Delete",
      icon: "i-lucide-trash-2",
      color: "error",
      onSelect: () => emit("delete", props.chat),
    },
  ],
]);
</script>

<template>
  <div
    class="group flex items-center gap-1 rounded-md px-2 py-1.5 cursor-pointer hover:bg-elevated"
    :class="active ? 'bg-elevated' : ''"
    @click="navigateTo(`/chat/${chat.id}`)"
  >
    <UIcon v-if="chat.pinned" name="i-lucide-pin" class="size-3 shrink-0 text-muted" />
    <span class="truncate text-sm flex-1">{{ chat.title }}</span>
    <UDropdownMenu :items="items" @click.stop>
      <UButton
        icon="i-lucide-ellipsis"
        color="neutral"
        variant="ghost"
        size="xs"
        class="opacity-0 group-hover:opacity-100"
        @click.stop
      />
    </UDropdownMenu>
  </div>
</template>
```

### 4. Wire it all into `apps/web/app/components/chat/Sidebar.vue`

Replace the doc-04 shell's `#default` region. Add: a New chat button that
creates a chat then navigates to it, a search `UInput` that filters by title,
the grouped list, and the rename/delete modals.

```vue
<script setup lang="ts">
import { groupChats } from "~/utils/group-chats";

const { list, create, rename, setPinned, setArchived, remove } = useChats();
const route = useRoute();

const collapsed = ref(false);
const search = ref("");

const filtered = computed(() => {
  const all = list.data.value ?? [];
  const q = search.value.trim().toLowerCase();
  return q ? all.filter((c) => c.title.toLowerCase().includes(q)) : all;
});
const groups = computed(() => groupChats(filtered.value));
const activeId = computed(() => route.params.id as string | undefined);

async function onNewChat() {
  const chat = await create.mutateAsync({});
  if (chat) navigateTo(`/chat/${chat.id}`);
}

// Rename modal state
const renameOpen = ref(false);
const renameTarget = ref<{ id: string; title: string } | null>(null);
const renameValue = ref("");
function openRename(chat: { id: string; title: string }) {
  renameTarget.value = chat;
  renameValue.value = chat.title;
  renameOpen.value = true;
}
async function confirmRename() {
  if (renameTarget.value && renameValue.value.trim()) {
    await rename.mutateAsync({ id: renameTarget.value.id, title: renameValue.value.trim() });
  }
  renameOpen.value = false;
}

// Delete modal state
const deleteOpen = ref(false);
const deleteTarget = ref<{ id: string } | null>(null);
function openDelete(chat: { id: string }) {
  deleteTarget.value = chat;
  deleteOpen.value = true;
}
async function confirmDelete() {
  if (deleteTarget.value) {
    const wasActive = activeId.value === deleteTarget.value.id;
    await remove.mutateAsync({ id: deleteTarget.value.id });
    if (wasActive) navigateTo("/dashboard");
  }
  deleteOpen.value = false;
}

async function onPin(chat: { id: string; pinned: boolean }) {
  await setPinned.mutateAsync({ id: chat.id, pinned: !chat.pinned });
}
async function onArchive(chat: { id: string }) {
  await setArchived.mutateAsync({ id: chat.id, archived: true });
}
</script>

<template>
  <UDashboardSidebar
    v-model:collapsed="collapsed"
    collapsible
    resizable
    :min-size="16"
    :default-size="20"
    :max-size="30"
    :ui="{ footer: 'border-t border-default' }"
  >
    <template #header="{ collapsed }">
      <span v-if="!collapsed" class="font-semibold">Chestnut Chat</span>
      <UDashboardSidebarCollapse class="ms-auto" />
    </template>

    <template #default="{ collapsed }">
      <UButton
        :label="collapsed ? undefined : 'New chat'"
        icon="i-lucide-plus"
        color="neutral"
        variant="outline"
        block
        :square="collapsed"
        :loading="create.isPending.value"
        @click="onNewChat"
      />

      <UInput
        v-if="!collapsed"
        v-model="search"
        icon="i-lucide-search"
        placeholder="Search chats"
        size="sm"
      />

      <div v-if="!collapsed" class="flex-1 overflow-y-auto space-y-4">
        <div v-for="group in groups" :key="group.key">
          <p class="px-2 pb-1 text-xs font-medium text-muted">{{ group.label }}</p>
          <ChatHistoryItem
            v-for="chat in group.chats"
            :key="chat.id"
            :chat="chat"
            :active="chat.id === activeId"
            @rename="openRename"
            @pin="onPin"
            @archive="onArchive"
            @delete="openDelete"
          />
        </div>
        <p
          v-if="!groups.length && list.status.value === 'success'"
          class="px-2 text-sm text-muted"
        >
          No chats yet.
        </p>
      </div>
    </template>

    <template #footer="{ collapsed }">
      <span v-if="!collapsed" class="text-xs text-muted">Footer slot (doc 06)</span>
    </template>
  </UDashboardSidebar>

  <!-- Rename modal -->
  <UModal v-model:open="renameOpen" title="Rename chat">
    <template #body>
      <UInput v-model="renameValue" class="w-full" @keydown.enter="confirmRename" />
    </template>
    <template #footer>
      <UButton color="neutral" variant="ghost" label="Cancel" @click="renameOpen = false" />
      <UButton label="Save" :loading="rename.isPending.value" @click="confirmRename" />
    </template>
  </UModal>

  <!-- Delete confirm -->
  <UModal v-model:open="deleteOpen" title="Delete chat">
    <template #body>
      <p class="text-sm text-muted">This permanently deletes the chat and its messages.</p>
    </template>
    <template #footer>
      <UButton color="neutral" variant="ghost" label="Cancel" @click="deleteOpen = false" />
      <UButton
        color="error"
        label="Delete"
        :loading="remove.isPending.value"
        @click="confirmDelete"
      />
    </template>
  </UModal>
</template>
```

> When collapsed, the search box and history list hide (rail mode). That matches
> common chat UIs. Expanding restores them.

## Acceptance criteria

- [ ] New chat button creates a chat (`$orpc.chat.create`) and navigates to
      `/chat/<id>`; the new chat appears in the list.
- [ ] Search filters the visible history by title (case-insensitive).
- [ ] History is grouped: Pinned, Today, Yesterday, Previous 7 days, Previous
      30 days, Earlier. Empty groups are hidden.
- [ ] Per-item menu: Rename (modal + `$orpc.chat.rename`), Pin/Unpin
      (`$orpc.chat.setPinned`), Archive (`$orpc.chat.setArchived`, hides it from
      the list), Delete (confirm modal + `$orpc.chat.delete`).
- [ ] After any mutation the list refreshes (query invalidated).
- [ ] Deleting the active chat routes back to `/dashboard`.
- [ ] `pnpm run check-types` is clean.

## Verification

```bash
pnpm run dev:web
# Create several chats; rename/pin/archive/delete; type in search to filter.
pnpm run check-types
```

## Out of scope

- No archived-chats viewer/restore UI (archive just hides for v0.1.0).
- No server-side search (filtering is client-side).
- The `/chat/[id]` page itself is built in docs 08 + 10; here we only navigate.
