<script setup lang="ts">
import {
  BAvatar,
  BBadge,
  BButton,
  BButtonGroup,
  BButtonGroupItem,
  BCheckbox,
  BChip,
  BCloseButton,
  BDivider,
  BHintText,
  BIconButton,
  BInput,
  BKbd,
  BLinkButton,
  BRadio,
  BRadioGroup,
  BStatusDot,
  BSwitch,
  BTab,
  BTabList,
  BTabPanel,
  BTabs,
} from "@chestnut-chat/ui";
import { Bell, ChevronRight, Moon, Plus, Search, Sun, Trash2 } from "lucide-vue-next";

useHead({ title: "BoardUI (Vue) showcase" });

const dark = ref(false);
function toggleDark() {
  dark.value = !dark.value;
  document.documentElement.classList.toggle("dark", dark.value);
}

const input = ref("");
const inputInvalid = ref("bad@");
const checkbox = ref(true);
const checkboxIndeterminate = ref(false);
const switchOn = ref(true);
const switchRect = ref(false);
const radio = ref("a");
const activeTab = ref("overview");
const selectedToolbar = ref<string | null>("center");
</script>

<template>
  <div class="min-h-screen bg-background-full text-text-primary">
    <div class="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-10">
      <header class="flex items-center justify-between">
        <div>
          <h1 class="text-title-1-semibold">BoardUI components (Vue port)</h1>
          <p class="text-body-regular text-text-secondary">
            Rendered from <code class="font-mono">@chestnut-chat/ui</code> — tokens + components.
          </p>
        </div>
        <BIconButton :icon="dark ? Sun : Moon" aria-label="Toggle dark mode" @click="toggleDark" />
      </header>

      <!-- Buttons -->
      <section class="flex flex-col gap-4">
        <h2 class="text-title-2-medium">Buttons</h2>
        <div class="flex flex-wrap items-center gap-3">
          <BButton :leading-icon="Plus">Primary</BButton>
          <BButton variant="secondary">Secondary</BButton>
          <BButton variant="ghost">Ghost</BButton>
          <BButton variant="danger" :leading-icon="Trash2">Danger</BButton>
          <BButton disabled>Disabled</BButton>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <BButton size="small">Small</BButton>
          <BButton size="xs">Extra small</BButton>
          <BButton icon-only :leading-icon="Plus" aria-label="Add" />
          <BButton icon-only size="small" :leading-icon="Search" aria-label="Search" />
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <BIconButton :icon="Bell" aria-label="Notifications" />
          <BIconButton :icon="Trash2" size="small" aria-label="Delete" />
          <BCloseButton size="md" aria-label="Close" />
          <BLinkButton :trailing-icon="ChevronRight">Learn more</BLinkButton>
          <BLinkButton variant="secondary">Dismiss</BLinkButton>
        </div>
      </section>

      <BDivider />

      <!-- Button group -->
      <section class="flex flex-col gap-4">
        <h2 class="text-title-2-medium">Button group</h2>
        <BButtonGroup>
          <BButtonGroupItem
            :leading-icon="ChevronRight"
            :selected="selectedToolbar === 'left'"
            @click="selectedToolbar = 'left'"
          >
            Left
          </BButtonGroupItem>
          <BButtonGroupItem
            :selected="selectedToolbar === 'center'"
            @click="selectedToolbar = 'center'"
          >
            Center
          </BButtonGroupItem>
          <BButtonGroupItem
            icon-only
            :leading-icon="Bell"
            aria-label="Right"
            :selected="selectedToolbar === 'right'"
            @click="selectedToolbar = 'right'"
          />
        </BButtonGroup>
      </section>

      <!-- Badges + chips -->
      <section class="flex flex-col gap-4">
        <h2 class="text-title-2-medium">Badges, chips, status</h2>
        <div class="flex flex-wrap items-center gap-3">
          <BBadge color="primary">4</BBadge>
          <BBadge color="neutral">12</BBadge>
          <BChip color="lime">Active</BChip>
          <BChip color="rose">Failed</BChip>
          <BChip color="blue">Info</BChip>
          <BChip variant="caption" color="purple">role-tag</BChip>
          <BChip variant="subtle" color="neutral">$24.00</BChip>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <BStatusDot color="green" />
          <BStatusDot color="yellow" />
          <BStatusDot color="indigo" />
          <BKbd>⌘K</BKbd>
        </div>
      </section>

      <!-- Avatar -->
      <section class="flex flex-col gap-4">
        <h2 class="text-title-2-medium">Avatar</h2>
        <div class="flex flex-wrap items-center gap-4">
          <BAvatar size="xs" initials="L" />
          <BAvatar size="sm" initials="LZ" color="blue" />
          <BAvatar size="md" initials="LC" color="lime" />
          <BAvatar size="lg" initials="LS" color="pink" />
        </div>
      </section>

      <!-- Dividers -->
      <section class="flex flex-col gap-4">
        <h2 class="text-title-2-medium">Dividers</h2>
        <BDivider variant="single" align="center">Single with content</BDivider>
        <BDivider variant="double" align="start">Double framing</BDivider>
        <BDivider variant="fill" align="end">Filled strip</BDivider>
      </section>

      <!-- Inputs -->
      <section class="flex flex-col gap-4">
        <h2 class="text-title-2-medium">Inputs</h2>
        <div class="grid max-w-md grid-cols-1 gap-4">
          <BInput v-model="input" label="Project name" placeholder="my-project" required />
          <BInput
            v-model="inputInvalid"
            label="Email"
            invalid
            hint="Enter a valid email address."
            :trailing-icon="Bell"
          />
          <BInput label="Search" placeholder="Search models…" :leading-icon="Search" size="small" />
          <BInput label="Disabled" placeholder="Locked" disabled />
          <BHintText class="text-text-tertiary"> Bound value: {{ input || "—" }} </BHintText>
        </div>
      </section>

      <!-- Checkbox / switch / radio -->
      <section class="flex flex-col gap-4">
        <h2 class="text-title-2-medium">Checkbox, switch, radio</h2>
        <div class="flex flex-col gap-3">
          <BCheckbox v-model="checkbox">Notify me by email</BCheckbox>
          <BCheckbox v-model="checkboxIndeterminate" indeterminate>Indeterminate</BCheckbox>
          <BCheckbox disabled>Disabled</BCheckbox>
          <div class="flex flex-wrap items-center gap-6">
            <BSwitch v-model="switchOn">Pill switch</BSwitch>
            <BSwitch v-model="switchRect" shape="rectangle">Rectangle switch</BSwitch>
            <BSwitch :model-value="false" size="sm" disabled>Small disabled</BSwitch>
          </div>
          <BRadioGroup v-model="radio" name="showcase-radio">
            <BRadio value="a">Plan A</BRadio>
            <BRadio value="b">Plan B</BRadio>
            <BRadio value="c" disabled>Plan C (disabled)</BRadio>
          </BRadioGroup>
        </div>
      </section>

      <!-- Tabs -->
      <section class="flex flex-col gap-4">
        <h2 class="text-title-2-medium">Tabs</h2>
        <BTabs v-model="activeTab">
          <BTabList>
            <BTab value="overview">Overview</BTab>
            <BTab value="providers" :count="3">Providers</BTab>
            <BTab value="advanced" :leading-icon="Bell">Advanced</BTab>
          </BTabList>
          <BTabPanel value="overview" class="text-body-regular text-text-secondary">
            Overview panel content.
          </BTabPanel>
          <BTabPanel value="providers" class="text-body-regular text-text-secondary">
            Providers panel content (3 configured).
          </BTabPanel>
          <BTabPanel value="advanced" class="text-body-regular text-text-secondary">
            Advanced panel content. Arrow keys move between tabs.
          </BTabPanel>
        </BTabs>
      </section>
    </div>
  </div>
</template>
