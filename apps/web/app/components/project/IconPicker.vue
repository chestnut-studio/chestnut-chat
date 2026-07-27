<script setup lang="ts">
import {
  PROJECT_EMOJI_ALLOWLIST,
  PROJECT_ICON_COLORS,
  PROJECT_LUCIDE_ALLOWLIST,
  projectIconColorClass,
  type ProjectIconColor,
  type ProjectIconKind,
} from "@chestnut-chat/api/project/icons";

const kind = defineModel<ProjectIconKind>("kind", { required: true });
const value = defineModel<string>("value", { required: true });
const color = defineModel<ProjectIconColor>("color", { required: true });

const open = shallowRef(false);
const tab = shallowRef<"lucide" | "emoji">("lucide");

watch(open, (isOpen) => {
  if (isOpen) tab.value = kind.value === "emoji" ? "emoji" : "lucide";
});

function selectEmoji(emoji: string) {
  kind.value = "emoji";
  value.value = emoji;
}

function selectLucide(icon: string) {
  kind.value = "lucide";
  value.value = icon;
}

function selectColor(next: ProjectIconColor) {
  color.value = next;
  if (kind.value === "emoji") {
    kind.value = "lucide";
    if (!(PROJECT_LUCIDE_ALLOWLIST as readonly string[]).includes(value.value)) {
      value.value = "folder";
    }
  }
}

const colorClass = computed(() => projectIconColorClass(color.value));
</script>

<template>
  <UPopover v-model:open="open" :ui="{ content: 'w-[19.5rem] p-3' }">
    <button
      type="button"
      class="flex size-10 shrink-0 items-center justify-center rounded-full bg-elevated text-highlighted transition-colors hover:bg-accented"
      :aria-label="$t('project.icon')"
      :aria-expanded="open"
    >
      <span v-if="kind === 'emoji'" class="text-lg leading-none">{{ value }}</span>
      <UIcon v-else :name="`i-lucide-${value}`" class="size-5" :class="colorClass" />
    </button>

    <template #content>
      <div class="space-y-3">
        <div class="flex justify-center">
          <div class="inline-flex rounded-full bg-elevated p-0.5">
            <button
              type="button"
              class="rounded-full px-3 py-1 text-xs font-medium transition-colors"
              :class="
                tab === 'lucide'
                  ? 'bg-default text-highlighted shadow-sm'
                  : 'text-muted hover:text-default'
              "
              @click="tab = 'lucide'"
            >
              {{ $t("project.lucideIcons") }}
            </button>
            <button
              type="button"
              class="rounded-full px-3 py-1 text-xs font-medium transition-colors"
              :class="
                tab === 'emoji'
                  ? 'bg-default text-highlighted shadow-sm'
                  : 'text-muted hover:text-default'
              "
              @click="tab = 'emoji'"
            >
              {{ $t("project.emojiIcons") }}
            </button>
          </div>
        </div>

        <div v-if="tab === 'lucide'" class="grid grid-cols-7 gap-0.5">
          <button
            v-for="icon in PROJECT_LUCIDE_ALLOWLIST"
            :key="icon"
            type="button"
            class="flex size-9 items-center justify-center rounded-md transition-colors hover:bg-elevated"
            :class="kind === 'lucide' && value === icon ? 'bg-elevated' : ''"
            :aria-label="icon"
            :aria-pressed="kind === 'lucide' && value === icon"
            @click="selectLucide(icon)"
          >
            <UIcon
              :name="`i-lucide-${icon}`"
              class="size-5"
              :class="projectIconColorClass(color)"
            />
          </button>
        </div>

        <div v-else class="grid grid-cols-7 gap-0.5">
          <button
            v-for="emoji in PROJECT_EMOJI_ALLOWLIST"
            :key="emoji"
            type="button"
            class="flex size-9 items-center justify-center rounded-md text-base transition-colors hover:bg-elevated"
            :class="kind === 'emoji' && value === emoji ? 'bg-elevated' : ''"
            :aria-label="emoji"
            :aria-pressed="kind === 'emoji' && value === emoji"
            @click="selectEmoji(emoji)"
          >
            {{ emoji }}
          </button>
        </div>

        <div v-if="tab === 'lucide'" class="border-t border-default pt-3">
          <div class="flex items-center justify-center gap-2.5">
            <button
              v-for="item in PROJECT_ICON_COLORS"
              :key="item.key"
              type="button"
              class="size-5 rounded-full transition-shadow"
              :class="[
                item.swatch,
                color === item.key ? 'ring-2 ring-offset-2 ring-offset-default ring-inverted' : '',
              ]"
              :aria-label="item.key"
              :aria-pressed="color === item.key"
              @click="selectColor(item.key)"
            />
          </div>
        </div>
      </div>
    </template>
  </UPopover>
</template>
