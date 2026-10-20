<script setup lang="ts">
import { projectIconName } from "@chestnut-chat/api/project/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@chestnut-chat/ui/components/ui/dialog";
import { cn } from "@chestnut-chat/ui/lib/utils";

type PaletteItem = {
  id: string;
  label: string;
  icon: string;
  hint?: string;
  to: string;
};

const open = defineModel<boolean>("open", { default: false });

const { t } = useI18n();
const { list: chatList } = useChats();
const { list: projectList } = useProjects();

const query = shallowRef("");
const activeIndex = ref(0);
const listEl = useTemplateRef<HTMLElement>("listEl");

const projects = computed(() => (projectList.data.value ?? []) as ProjectRow[]);
const chats = computed(() =>
  ((chatList.data.value ?? []) as ChatRow[]).filter((chat) => !chat.archived),
);

const groups = computed(() => {
  const needle = query.value.trim().toLowerCase();
  const projectNames = new Map(projects.value.map((project) => [project.id, project.name]));
  const matches = (item: PaletteItem) =>
    !needle || [item.label, item.hint].some((value) => value?.toLowerCase().includes(needle));

  const all = [
    {
      id: "chats",
      label: t("sidebar.chats"),
      items: chats.value.map<PaletteItem>((chat) => ({
        id: `chat:${chat.id}`,
        label: chat.title,
        icon: "i-ri-chat-1-line",
        hint: chat.projectId ? projectNames.get(chat.projectId) : undefined,
        to: chatPath(chat),
      })),
    },
    {
      id: "projects",
      label: t("project.section"),
      items: projects.value.map<PaletteItem>((project) => ({
        id: `project:${project.id}`,
        label: project.name,
        icon:
          project.iconKind === "lucide" ? projectIconName(project.iconValue) : "i-ri-folder-line",
        to: projectPath(project.id),
      })),
    },
  ];

  return all
    .map((group) => ({ ...group, items: group.items.filter(matches) }))
    .filter((group) => group.items.length);
});

const flatItems = computed(() => groups.value.flatMap((group) => group.items));

watch(query, () => (activeIndex.value = 0));
watch(open, (isOpen) => {
  if (!isOpen) return;
  query.value = "";
  activeIndex.value = 0;
});

function onShortcut(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    open.value = !open.value;
  }
}

onMounted(() => window.addEventListener("keydown", onShortcut));
onBeforeUnmount(() => window.removeEventListener("keydown", onShortcut));

async function select(item?: PaletteItem) {
  if (!item) return;
  open.value = false;
  await navigateTo(item.to);
}

function move(step: number) {
  const count = flatItems.value.length;
  if (!count) return;
  activeIndex.value = (activeIndex.value + step + count) % count;
  void nextTick(() =>
    listEl.value
      ?.querySelector(`[data-index="${activeIndex.value}"]`)
      ?.scrollIntoView({ block: "nearest" }),
  );
}

function indexOf(item: PaletteItem) {
  return flatItems.value.indexOf(item);
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      :show-close-button="false"
      class="top-[18%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl"
    >
      <DialogTitle class="sr-only">{{ $t("sidebar.search") }}</DialogTitle>
      <DialogDescription class="sr-only">{{ $t("sidebar.searchHint") }}</DialogDescription>

      <div class="flex items-center gap-3 border-b border-separator-border px-4">
        <BIcon name="i-ri-search-line" class="size-5 shrink-0 text-foreground-icon-tertiary" />
        <input
          v-model="query"
          type="text"
          autofocus
          autocomplete="off"
          role="combobox"
          aria-expanded="true"
          aria-controls="sidebar-search-list"
          :placeholder="$t('sidebar.search')"
          class="h-14 min-w-0 flex-1 bg-transparent text-body-regular text-text-primary outline-none placeholder:text-text-placeholder"
          @keydown.down.prevent="move(1)"
          @keydown.up.prevent="move(-1)"
          @keydown.enter.prevent="select(flatItems[activeIndex])"
        />
        <kbd
          class="rounded-md bg-background-secondary-default px-1.5 py-0.5 text-caption-1-regular text-text-tertiary"
        >
          Esc
        </kbd>
      </div>

      <div
        id="sidebar-search-list"
        ref="listEl"
        role="listbox"
        class="max-h-[22rem] overflow-y-auto p-2"
      >
        <section v-for="group in groups" :key="group.id" class="not-first:mt-2">
          <h3 class="px-3 pt-2 pb-1 text-caption-1-semibold text-text-tertiary">
            {{ group.label }}
          </h3>
          <button
            v-for="item in group.items"
            :key="item.id"
            type="button"
            role="option"
            :data-index="indexOf(item)"
            :aria-selected="indexOf(item) === activeIndex"
            :class="
              cn(
                'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-body-regular text-text-primary transition-colors duration-150',
                indexOf(item) === activeIndex && 'bg-background-secondary-hover',
              )
            "
            @mousemove="activeIndex = indexOf(item)"
            @click="select(item)"
          >
            <BIcon :name="item.icon" class="size-4 shrink-0 text-foreground-icon-secondary" />
            <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
            <span
              v-if="item.hint"
              class="max-w-40 truncate text-caption-1-regular text-text-tertiary"
            >
              {{ item.hint }}
            </span>
            <BIcon
              v-if="indexOf(item) === activeIndex"
              name="i-ri-corner-down-left-line"
              class="size-4 shrink-0 text-foreground-icon-tertiary"
            />
          </button>
        </section>

        <div
          v-if="!flatItems.length"
          class="flex flex-col items-center gap-2 px-4 py-10 text-center"
        >
          <BIcon name="i-ri-search-line" class="size-6 text-foreground-icon-quaternary" />
          <p class="text-body-medium text-text-primary">{{ $t("sidebar.searchEmpty") }}</p>
          <p class="text-caption-1-regular text-text-tertiary">
            {{ $t("sidebar.searchEmptyHint") }}
          </p>
        </div>
      </div>

      <div
        class="flex items-center gap-4 border-t border-separator-border px-4 py-2.5 text-caption-1-regular text-text-tertiary"
      >
        <span class="flex items-center gap-1.5">
          <BIcon name="i-ri-arrow-up-line" class="size-3.5" />
          <BIcon name="i-ri-arrow-down-line" class="size-3.5" />
          {{ $t("sidebar.searchNavigate") }}
        </span>
        <span class="flex items-center gap-1.5">
          <BIcon name="i-ri-corner-down-left-line" class="size-3.5" />
          {{ $t("sidebar.searchOpen") }}
        </span>
      </div>
    </DialogContent>
  </Dialog>
</template>
