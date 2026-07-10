<script setup lang="ts">
const { list, rename, setPinned, setArchived, remove } = useChats();
const authSession = useAuthSession();
const { show: showLogin } = useLoginModal();
const route = useRoute();

const collapsed = ref(false);
const search = ref("");
const renameOpen = ref(false);
const renameTarget = ref<{ id: string; title: string } | null>(null);
const renameValue = ref("");
const deleteOpen = ref(false);
const deleteTarget = ref<{ id: string } | null>(null);

const filtered = computed(() => {
  const all = list.data.value ?? [];
  const query = search.value.trim().toLowerCase();
  return query ? all.filter((row) => row.title.toLowerCase().includes(query)) : all;
});
const groups = computed(() => groupChats(filtered.value));
const activeId = computed(() => route.params.id as string | undefined);

async function onNewChat() {
  const session = await authSession.ensure();
  if (!session?.user) {
    showLogin();
    return;
  }

  await navigateTo("/");
}

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

function openDelete(chat: { id: string }) {
  deleteTarget.value = chat;
  deleteOpen.value = true;
}

async function confirmDelete() {
  if (deleteTarget.value) {
    const wasActive = activeId.value === deleteTarget.value.id;
    await remove.mutateAsync({ id: deleteTarget.value.id });
    if (wasActive) {
      await navigateTo("/");
    }
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
    :ui="{ header: 'border-b border-default', footer: 'border-t border-default' }"
  >
    <template #header="{ collapsed: isCollapsed }">
      <span v-if="!isCollapsed" class="truncate font-semibold">{{ $t("app.name") }}</span>
      <UDashboardSidebarCollapse class="ms-auto" />
    </template>

    <template #default="{ collapsed: isCollapsed }">
      <div class="flex h-full min-h-0 flex-col gap-3">
        <UButton
          :label="isCollapsed ? undefined : $t('sidebar.newChat')"
          icon="i-lucide-plus"
          color="neutral"
          variant="outline"
          block
          :square="isCollapsed"
          :loading="authSession.isPending"
          @click="onNewChat"
        />

        <UInput
          v-if="!isCollapsed"
          v-model="search"
          icon="i-lucide-search"
          :placeholder="$t('sidebar.search')"
          size="sm"
        />

        <div v-if="!isCollapsed" class="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <div v-for="group in groups" :key="group.key">
            <p class="px-2 pb-1 text-xs font-medium text-muted">
              {{ $t(`groups.${group.key}`) }}
            </p>
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
            {{ $t("sidebar.empty") }}
          </p>
        </div>
      </div>
    </template>

    <template #footer="{ collapsed: isCollapsed }">
      <ChatSidebarFooter :collapsed="isCollapsed" />
    </template>
  </UDashboardSidebar>

  <UModal
    v-model:open="renameOpen"
    :title="$t('confirm.renameTitle')"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <UInput v-model="renameValue" class="w-full" @keydown.enter="confirmRename" />
    </template>

    <template #footer="{ close }">
      <UButton color="neutral" variant="outline" :label="$t('actions.cancel')" @click="close" />
      <UButton
        :label="$t('actions.save')"
        :loading="rename.isPending.value"
        @click="confirmRename"
      />
    </template>
  </UModal>

  <UModal
    v-model:open="deleteOpen"
    :title="$t('confirm.deleteTitle')"
    :description="$t('confirm.deleteDescription')"
    :ui="{ footer: 'justify-end' }"
  >
    <template #footer="{ close }">
      <UButton color="neutral" variant="outline" :label="$t('actions.cancel')" @click="close" />
      <UButton
        color="error"
        :label="$t('actions.delete')"
        :loading="remove.isPending.value"
        @click="confirmDelete"
      />
    </template>
  </UModal>
</template>
