# 04 - Dashboard shell: collapsible sidebar + chat panel

## Goal

Build the dashboard layout skeleton: a left **collapsible sidebar** and a main
**chat panel**, using Nuxt UI v4 dashboard components. After this doc, `/dashboard`
shows an empty sidebar shell and an empty chat panel. Later docs fill them in.

## Prerequisites

- None for layout, but you need the app running. The existing
  `apps/web/app/pages/dashboard.vue` and `middleware/auth.ts` already protect
  this route.

## Context & files

Read first:

- `apps/web/app/pages/dashboard.vue` - current dashboard page (will be rewritten).
- `apps/web/app/layouts/default.vue` - the existing layout with `<Header />`.
- `apps/web/app/components/Header.vue` - existing header (we will NOT use it on
  the dashboard; the dashboard gets its own full-height layout).
- `apps/web/app/app.config.ts` - theme tokens.

Files you will create / edit:

- **Create** `apps/web/app/layouts/dashboard.vue`
- **Create** `apps/web/app/components/chat/Sidebar.vue` (shell only)
- **Edit** `apps/web/app/pages/dashboard.vue` (use the new layout)

> Folder note: create a `components/chat/` folder to keep all chat-related
> components together. Nuxt auto-imports them as `<ChatSidebar />`,
> `<ChatBox />`, etc. (folder name is prefixed to the component name).

## Background knowledge

Nuxt UI v4 ships dashboard layout components (confirmed available in this repo's
`@nuxt/ui@^4.5.1`):

- `UDashboardGroup` - the outer flex container. It also persists panel sizes via
  `storage` + `storage-key`.
- `UDashboardSidebar` - a resizable, collapsible sidebar. Key props:
  - `collapsible` - lets it collapse to a narrow rail.
  - `resizable` - drag to resize.
  - `v-model:collapsed` - control/observe the collapsed state.
  - `:min-size`, `:default-size`, `:max-size`, `:collapsed-size` - sizes
    (percentages by default).
  - Slots: `#header`, `#default`, `#footer`. Each slot receives
    `{ collapsed, collapse }`. Use `collapsed` to swap labels for icons.
- `UDashboardSidebarCollapse` - a button that toggles collapse on desktop. Only
  works when the sidebar is `collapsible`. This is our **Toggle** control.
- `UDashboardPanel` - the main content panel. Has a `#header` slot (for a navbar)
  and a `#body` slot.
- `UDashboardNavbar` - a top bar inside a panel (`title`, `#leading`, `#right`).
- On mobile the sidebar becomes a slideover automatically; a toggle button is
  shown for you.

The collapsed state persists automatically when `UDashboardGroup` has `storage`
+ `storage-key`, so the user's preference survives reloads.

## Steps

### 1. Create the dashboard layout `apps/web/app/layouts/dashboard.vue`

```vue
<script setup lang="ts"></script>

<template>
  <UDashboardGroup storage="local" storage-key="chestnut-dashboard">
    <ChatSidebar />

    <UDashboardPanel id="chat">
      <slot />
    </UDashboardPanel>
  </UDashboardGroup>
</template>
```

### 2. Create the sidebar shell `apps/web/app/components/chat/Sidebar.vue`

This is a **shell** only. Doc 05 fills the history list; doc 06 fills the footer
(user/login). For now wire the toggle, a "New chat" button placeholder, and
empty regions so the layout is visible.

```vue
<script setup lang="ts">
const collapsed = ref(false);
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
      />

      <!-- Doc 05: search input + grouped chat history go here -->
      <div class="flex-1 overflow-y-auto" />
    </template>

    <template #footer="{ collapsed }">
      <!-- Doc 06: user menu (auth) / login button (no auth) goes here -->
      <span v-if="!collapsed" class="text-xs text-muted">Footer slot</span>
    </template>
  </UDashboardSidebar>
</template>
```

### 3. Rewrite `apps/web/app/pages/dashboard.vue` to use the layout

Keep the existing `auth` middleware. Set the page to use the new `dashboard`
layout, and leave the body empty for now (doc 08 + doc 10 fill it):

```vue
<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
  middleware: ["auth"],
});
</script>

<template>
  <template #body>
    <div class="flex h-full items-center justify-center text-muted">
      Chat panel (filled in docs 08 + 10)
    </div>
  </template>
</template>
```

> Note: `UDashboardPanel` exposes a `#body` slot. Because the layout puts
> `<slot />` directly inside the panel, the page content is the panel body. If
> you prefer an explicit navbar, add a `#header` with `UDashboardNavbar` in the
> layout's `UDashboardPanel`. Keep it simple for now.

### 4. Confirm there is no double header

The default layout renders `<Header />`. The dashboard uses its **own** layout
(`layout: "dashboard"`), so the global `Header` does not appear here. That is
intended - the dashboard is a full-height app shell.

## Acceptance criteria

- [ ] `apps/web/app/layouts/dashboard.vue` exists and renders
      `UDashboardGroup > (ChatSidebar + UDashboardPanel)`.
- [ ] `apps/web/app/components/chat/Sidebar.vue` exists and renders a
      `UDashboardSidebar` that is collapsible + resizable, with a working
      `UDashboardSidebarCollapse` toggle.
- [ ] `/dashboard` uses `layout: "dashboard"` and keeps the `auth` middleware.
- [ ] Collapsing the sidebar hides labels and shrinks it to a rail; the
      collapsed state persists across reloads.
- [ ] `pnpm run check-types` is clean.

## Verification

```bash
pnpm run dev:web
# Sign in, open http://localhost:3011/dashboard
# - sidebar shows, toggle collapses/expands it, drag-resize works
# - reload: collapsed state is remembered
pnpm run check-types
```

## Out of scope

- No chat history, search, user menu, or chat box yet (docs 05, 06, 08, 10).
- Do not delete `Header.vue` or the default layout; other pages still use them.
