<script setup lang="ts">
import { BButton, BInput, BModal, BSelect } from "@chestnut-chat/ui";
import { useMutation, useQueryClient } from "@tanstack/vue-query";

const { t } = useI18n();
const route = useRoute();
const { $orpc } = useNuxtApp();
const queryClient = useQueryClient();
const { list, rename, remove } = useChats();
const { list: projects, remove: removeProject } = useProjects();
const { mutateAsync: moveChat, isPending: isMoving } = useMutation(
  $orpc.chat.move.mutationOptions(),
);

const activeChatId = computed(() => (route.params.chatId ?? route.params.id) as string | undefined);
const routeProjectId = computed(() => route.params.projectId as string | undefined);

const renameTarget = ref<ChatRow | null>(null);
const renameValue = ref("");
const deleteTarget = ref<ChatRow | null>(null);
const moveTarget = ref<ChatRow | null>(null);
const moveProjectId = ref<string | null>(null);
const deleteProjectTarget = ref<ProjectRow | null>(null);

const isOpen = (target: Ref<unknown>) =>
  computed({
    get: () => target.value !== null,
    set: (open) => {
      if (!open) target.value = null;
    },
  });
const renameOpen = isOpen(renameTarget);
const deleteOpen = isOpen(deleteTarget);
const moveOpen = isOpen(moveTarget);
const deleteProjectOpen = isOpen(deleteProjectTarget);

const moveItems = computed(() => [
  { label: t("project.noProject"), value: null as string | null },
  ...((projects.data.value ?? []) as ProjectRow[]).map((project) => ({
    label: project.name,
    value: project.id as string | null,
  })),
]);

async function confirmRename() {
  const title = renameValue.value.trim();
  if (renameTarget.value && title) {
    await rename.mutateAsync({ id: renameTarget.value.id, title });
  }
  renameTarget.value = null;
}

async function confirmDelete() {
  const target = deleteTarget.value;
  if (target) {
    await remove.mutateAsync({ id: target.id });
    if (activeChatId.value === target.id) {
      const projectId = target.projectId ?? routeProjectId.value;
      await navigateTo(projectId ? projectPath(projectId) : "/");
    }
  }
  deleteTarget.value = null;
}

async function confirmDeleteProject() {
  const target = deleteProjectTarget.value;
  if (!target) return;
  const activeInProject =
    routeProjectId.value === target.id ||
    ((list.data.value ?? []) as ChatRow[]).some(
      (chat) => chat.id === activeChatId.value && chat.projectId === target.id,
    );
  await removeProject.mutateAsync({ id: target.id });
  if (activeInProject) await navigateTo("/");
  deleteProjectTarget.value = null;
}

async function confirmMove() {
  const target = moveTarget.value;
  if (!target) return;
  const projectId = moveProjectId.value;
  await moveChat({ chatId: target.id, projectId });
  await list.refetch();
  // The chat.get cache still holds the old projectId; the workspace watch
  // would bounce the navigation back to the stale project path otherwise.
  void queryClient.invalidateQueries({
    queryKey: $orpc.chat.get.queryKey({ input: { id: target.id } }),
  });
  moveTarget.value = null;
  if (activeChatId.value === target.id) {
    await navigateTo(chatPath({ id: target.id, projectId }));
  }
}

defineExpose({
  rename(chat: ChatRow) {
    renameTarget.value = chat;
    renameValue.value = chat.title;
  },
  remove(chat: ChatRow) {
    deleteTarget.value = chat;
  },
  move(chat: ChatRow) {
    moveTarget.value = chat;
    moveProjectId.value = chat.projectId ?? null;
  },
  removeProject(project: ProjectRow) {
    deleteProjectTarget.value = project;
  },
});
</script>

<template>
  <BModal
    v-model:open="renameOpen"
    :title="$t('confirm.renameTitle')"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <BInput v-model="renameValue" class="w-full" @keydown.enter="confirmRename" />
    </template>
    <template #footer="{ close }">
      <BButton variant="secondary" :disabled="rename.isPending.value" @click="close">
        {{ $t("actions.cancel") }}
      </BButton>
      <BButton :disabled="rename.isPending.value" @click="confirmRename">
        {{ $t("actions.save") }}
      </BButton>
    </template>
  </BModal>

  <BModal
    v-model:open="deleteOpen"
    :title="$t('confirm.deleteTitle')"
    :description="$t('confirm.deleteDescription')"
    :ui="{ footer: 'justify-end' }"
  >
    <template #footer="{ close }">
      <BButton variant="secondary" :disabled="remove.isPending.value" @click="close">
        {{ $t("actions.cancel") }}
      </BButton>
      <BButton variant="danger" :disabled="remove.isPending.value" @click="confirmDelete">
        {{ $t("actions.delete") }}
      </BButton>
    </template>
  </BModal>

  <BModal
    v-model:open="deleteProjectOpen"
    :title="$t('project.deleteTitle')"
    :description="$t('project.deleteDescription')"
    :ui="{ footer: 'justify-end' }"
  >
    <template #footer="{ close }">
      <BButton variant="secondary" :disabled="removeProject.isPending.value" @click="close">
        {{ $t("actions.cancel") }}
      </BButton>
      <BButton
        variant="danger"
        :disabled="removeProject.isPending.value"
        @click="confirmDeleteProject"
      >
        {{ $t("actions.delete") }}
      </BButton>
    </template>
  </BModal>

  <BModal
    v-model:open="moveOpen"
    :title="$t('project.moveToProject')"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <BSelect v-model="moveProjectId" :items="moveItems" class="w-full" />
    </template>
    <template #footer="{ close }">
      <BButton variant="secondary" :disabled="isMoving" @click="close">
        {{ $t("actions.cancel") }}
      </BButton>
      <BButton :disabled="isMoving" @click="confirmMove">
        {{ $t("actions.save") }}
      </BButton>
    </template>
  </BModal>
</template>
