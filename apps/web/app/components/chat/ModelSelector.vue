<script setup lang="ts">
import { Search } from "~/utils/icons";
import { BButton, BInput, BPopover, BTooltip } from "@chestnut-chat/ui";
import type { ModelOption } from "~/utils/models";
import type { ProviderIconId } from "~/types/providers";

import ModelIcon from "./ModelIcon.vue";

const props = defineProps<{
  items: readonly ModelOption[];
  loading?: boolean;
}>();

const model = defineModel<string>({ required: true });

const open = shallowRef(false);
const searching = shallowRef(false);
const query = shallowRef("");
const activeProvider = shallowRef("");
const panelEl = ref<HTMLElement | null>(null);
const listEl = ref<HTMLElement | null>(null);

const selectedOption = computed(() => props.items.find((item) => item.value === model.value));
const selectedLabel = computed(() => selectedOption.value?.label ?? model.value);
const selectedProviderIcon = computed(() => selectedOption.value?.providerIcon ?? "openrouter");

const providers = computed(() => {
  const map = new Map<string, ProviderIconId>();
  for (const item of props.items) {
    if (!map.has(item.providerName)) map.set(item.providerName, item.providerIcon);
  }
  return Array.from(map, ([name, icon]) => ({ name, icon }));
});

const hasQuery = computed(() => query.value.trim().length > 0);

const visibleItems = computed(() => {
  if (hasQuery.value) {
    const term = query.value.trim().toLowerCase();
    return props.items.filter((item) =>
      [item.label, item.providerName, item.value].some((value) =>
        value.toLowerCase().includes(term),
      ),
    );
  }
  if (providers.value.length < 2) return props.items;
  return props.items.filter((item) => item.providerName === activeProvider.value);
});

function updateOpen(value: boolean) {
  open.value = value;
  if (!value) return;
  query.value = "";
  searching.value = false;
  activeProvider.value = selectedOption.value?.providerName ?? providers.value[0]?.name ?? "";
}

async function toggleSearch() {
  searching.value = !searching.value;
  if (!searching.value) {
    query.value = "";
    return;
  }
  await nextTick();
  panelEl.value?.querySelector("input")?.focus();
}

function selectProvider(name: string) {
  activeProvider.value = name;
  query.value = "";
  searching.value = false;
}

function selectModel(value: string) {
  model.value = value;
  open.value = false;
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && searching.value) {
    event.stopPropagation();
    searching.value = false;
    query.value = "";
    return;
  }
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  const options = Array.from(
    listEl.value?.querySelectorAll<HTMLElement>("[data-model-option]") ?? [],
  );
  if (!options.length) return;
  event.preventDefault();
  const index = options.indexOf(document.activeElement as HTMLElement);
  const next =
    event.key === "ArrowDown"
      ? (options[index + 1] ?? options[0])
      : index > 0
        ? options[index - 1]
        : undefined;
  if (next) next.focus();
  else panelEl.value?.querySelector("input")?.focus();
}
</script>

<template>
  <BPopover
    :open="open"
    :content="{ align: 'start', side: 'bottom', sideOffset: 8 }"
    width="w-[min(calc(100vw-2rem),26rem)] overflow-hidden rounded-3xl"
    @update:open="updateOpen"
  >
    <BButton
      type="button"
      :variant="open ? 'ghost' : 'secondary'"
      size="small"
      class="max-w-full justify-start sm:max-w-64"
      :title="selectedLabel"
      :aria-label="$t('chat.selectModel')"
      :disabled="loading && !items.length"
    >
      <ModelIcon :icon="selectedProviderIcon" />
      <span class="min-w-0 truncate text-left">{{ selectedLabel }}</span>
      <BIcon
        name="i-ri-arrow-down-s-line"
        class="size-4 shrink-0 transition-transform duration-150"
        :class="open ? 'rotate-180' : ''"
      />
    </BButton>

    <template #content>
      <div ref="panelEl" class="flex h-[22rem]" @keydown="onKeydown">
        <nav
          v-if="providers.length > 1"
          class="flex w-14 shrink-0 flex-col items-center gap-1 overflow-y-auto bg-background-secondary-default p-2"
          :aria-label="$t('chat.selectModel')"
        >
          <BTooltip
            v-for="provider in providers"
            :key="provider.name"
            side="right"
            :text="provider.name"
          >
            <button
              type="button"
              class="flex size-10 cursor-pointer items-center justify-center rounded-xl text-foreground-icon-secondary transition-colors duration-150 outline-none hover:bg-background-secondary-hover hover:text-foreground-icon-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
              :class="
                !hasQuery && provider.name === activeProvider
                  ? 'bg-background-primary-default text-foreground-icon-primary shadow-card'
                  : ''
              "
              :aria-label="provider.name"
              :aria-pressed="!hasQuery && provider.name === activeProvider"
              @click="selectProvider(provider.name)"
            >
              <ModelIcon :icon="provider.icon" />
            </button>
          </BTooltip>
        </nav>

        <div class="flex min-w-0 flex-1 flex-col">
          <div class="flex h-12 shrink-0 items-center justify-between gap-2 px-4">
            <BInput
              v-if="searching"
              v-model="query"
              :leading-icon="Search"
              :placeholder="$t('chat.searchModels')"
              class="w-full"
            />
            <template v-else>
              <span class="text-body-medium text-text-tertiary">{{ $t("chat.models") }}</span>
              <button
                type="button"
                class="flex cursor-pointer items-center gap-1.5 rounded-lg px-1.5 py-1 text-body-medium text-text-tertiary transition-colors duration-150 outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                @click="toggleSearch"
              >
                {{ $t("chat.quickSearch") }}
                <BIcon name="i-ri-search-line" class="size-4" />
              </button>
            </template>
          </div>

          <div
            ref="listEl"
            class="min-h-0 flex-1 overflow-y-auto px-2 pb-2"
            role="listbox"
            :aria-label="$t('chat.selectModel')"
          >
            <div
              v-if="!visibleItems.length"
              class="flex h-full flex-col items-center justify-center gap-2 text-body-2-regular text-text-secondary"
            >
              <BIcon name="i-ri-search-line" class="size-5 text-foreground-icon-tertiary" />
              {{ $t("chat.noMatchingModels") }}
            </div>

            <button
              v-for="item in visibleItems"
              v-else
              :key="item.value"
              type="button"
              data-model-option
              class="flex w-full cursor-pointer items-center gap-3 rounded-2lg px-2 py-2.5 text-start text-body-medium text-text-primary transition-colors duration-150 outline-none hover:bg-dropdown-item-hover-background focus-visible:bg-dropdown-item-hover-background focus-visible:ring-2 focus-visible:ring-border-focus-ring"
              role="option"
              :aria-selected="item.value === model"
              @click="selectModel(item.value)"
            >
              <ModelIcon :icon="item.providerIcon" />
              <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
              <ModelCapabilityTags
                :reasoning="item.reasoning"
                :vision="item.vision"
                :multimodal="item.multimodal"
                compact
              />
              <span
                class="flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-150"
                :class="
                  item.value === model
                    ? 'border-accent-500 bg-accent-500 text-text-white'
                    : 'border-border-button-default'
                "
                aria-hidden="true"
              >
                <BIcon v-if="item.value === model" name="i-ri-check-line" class="size-3.5" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </template>
  </BPopover>
</template>
