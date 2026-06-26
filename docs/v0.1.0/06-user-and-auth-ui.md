# 06 - Sidebar footer: user menu, settings modal, login modal

## Goal

Fill the sidebar footer. When **signed in**, show a **User button** with a menu
(Logout, Settings). The **Settings modal** has tabs: Mode toggle (light/dark),
UI language, Profile (read-only), About. When **signed out**, show a **Login
button** that opens a **Login modal** offering GitHub, Google, and Email + OTP.

## Prerequisites

- `03-auth-providers.md` (social + Email OTP must be configured).
- `04-dashboard-shell.md` (the sidebar footer slot to fill).
- `07-i18n.md` is related (the language switcher lives here). You may build the
  Settings UI now and connect the language control when doc 07 lands - this doc
  notes exactly where.

## Context & files

Read first:

- `apps/web/app/components/UserMenu.vue` - existing sign-out logic (copy the
  `$authClient.signOut` pattern with toasts + redirect).
- `apps/web/app/components/SignInForm.vue` - existing `UAuthForm` + zod pattern.
- `apps/web/app/plugins/auth-client.ts` - `$authClient` (now with `emailOtp`).

Files you will create / edit:

- **Create** `apps/web/app/components/chat/SidebarFooter.vue`
- **Create** `apps/web/app/components/SettingsModal.vue`
- **Create** `apps/web/app/components/LoginModal.vue`
- **Edit** `apps/web/app/components/chat/Sidebar.vue` (use `SidebarFooter` in the
  `#footer` slot)

## Background knowledge

- **Session in Vue**: `const session = $authClient.useSession();`. Then
  `session.value.data?.user` is the user (or `null`), and `session.value.isPending`
  is the loading flag (see `UserMenu.vue`, `login.vue`).
- **Color mode** (light/dark) in Nuxt UI: use the composable `useColorMode()`.
  `colorMode.preference` is `'system' | 'light' | 'dark'`. There is also a
  ready-made `UColorModeButton`/`UColorModeSwitch`. For the settings toggle we
  set `colorMode.preference` directly.
- **Modals**: `UModal` with `v-model:open`. Put content in `#body`, actions in
  `#footer`. For tabs use `UTabs` with `items: [{ label, icon, slot }]` and named
  slots.
- **Logout**: `await $authClient.signOut({ fetchOptions: { onSuccess } })` then
  `navigateTo("/", { replace: true, external: true })` - copy `UserMenu.vue`.
- **Login methods** (from doc 03):
  ```ts
  await $authClient.signIn.social({ provider: "github", callbackURL: "/dashboard" });
  await $authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" });
  await $authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
  await $authClient.signIn.emailOtp({ email, otp });
  ```

## Steps

### 1. Settings modal `apps/web/app/components/SettingsModal.vue`

Tabs: General (mode + language), Profile, About. The language control is a
placeholder `USelect` until doc 07 provides real locales - this doc marks the
exact spot.

```vue
<script setup lang="ts">
const open = defineModel<boolean>("open", { default: false });

const { $authClient } = useNuxtApp();
const session = $authClient.useSession();
const colorMode = useColorMode();

const tabs = [
  { label: "General", icon: "i-lucide-settings", slot: "general" as const },
  { label: "Profile", icon: "i-lucide-user", slot: "profile" as const },
  { label: "About", icon: "i-lucide-info", slot: "about" as const },
];

const modeOptions = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
];

// DOC 07: replace these placeholder options + binding with i18n `locales`
// and `setLocale`. See 07-i18n.md "Wire into Settings".
const languageOptions = [
  { label: "English", value: "en" },
  { label: "简体中文", value: "zh" },
];
const language = ref("en");
</script>

<template>
  <UModal v-model:open="open" title="Settings" :ui="{ content: 'max-w-xl' }">
    <template #body>
      <UTabs :items="tabs" class="w-full">
        <template #general>
          <div class="space-y-4 pt-4">
            <div class="flex items-center justify-between">
              <span class="text-sm">Appearance</span>
              <USelect v-model="colorMode.preference" :items="modeOptions" class="w-40" />
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm">Language</span>
              <USelect v-model="language" :items="languageOptions" class="w-40" />
            </div>
          </div>
        </template>

        <template #profile>
          <div class="space-y-3 pt-4">
            <div class="flex items-center gap-3">
              <UAvatar :src="session.data?.user?.image ?? undefined" :alt="session.data?.user?.name" />
              <div>
                <p class="font-medium">{{ session.data?.user?.name }}</p>
                <p class="text-sm text-muted">{{ session.data?.user?.email }}</p>
              </div>
            </div>
          </div>
        </template>

        <template #about>
          <div class="space-y-1 pt-4 text-sm text-muted">
            <p>Chestnut Chat</p>
            <p>Version v0.1.0</p>
          </div>
        </template>
      </UTabs>
    </template>
  </UModal>
</template>
```

### 2. Login modal `apps/web/app/components/LoginModal.vue`

Social buttons + an Email OTP two-step form.

```vue
<script setup lang="ts">
const open = defineModel<boolean>("open", { default: false });

const { $authClient } = useNuxtApp();
const toast = useToast();

const email = ref("");
const otp = ref("");
const otpSent = ref(false);
const loading = ref(false);

async function social(provider: "github" | "google") {
  await $authClient.signIn.social({ provider, callbackURL: "/dashboard" });
}

async function sendOtp() {
  if (!email.value) return;
  loading.value = true;
  try {
    await $authClient.emailOtp.sendVerificationOtp({ email: email.value, type: "sign-in" });
    otpSent.value = true;
    toast.add({ title: "Code sent", description: "Check your email (or server console in dev)." });
  } catch (e: any) {
    toast.add({ title: "Failed to send code", description: e?.message });
  } finally {
    loading.value = false;
  }
}

async function verifyOtp() {
  loading.value = true;
  try {
    await $authClient.signIn.emailOtp(
      { email: email.value, otp: otp.value },
      {
        onSuccess: () => {
          toast.add({ title: "Signed in" });
          open.value = false;
          navigateTo("/dashboard", { replace: true });
        },
        onError: (err) => toast.add({ title: "Sign in failed", description: err.error.message }),
      },
    );
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Sign in" :ui="{ content: 'max-w-md' }">
    <template #body>
      <div class="space-y-3">
        <UButton
          block
          color="neutral"
          variant="outline"
          icon="i-simple-icons-github"
          label="Continue with GitHub"
          @click="social('github')"
        />
        <UButton
          block
          color="neutral"
          variant="outline"
          icon="i-simple-icons-google"
          label="Continue with Google"
          @click="social('google')"
        />

        <USeparator label="or" />

        <UInput v-model="email" type="email" placeholder="you@example.com" class="w-full" />
        <UInput
          v-if="otpSent"
          v-model="otp"
          placeholder="6-digit code"
          class="w-full"
          @keydown.enter="verifyOtp"
        />
        <UButton
          v-if="!otpSent"
          block
          label="Email me a code"
          :loading="loading"
          @click="sendOtp"
        />
        <UButton v-else block label="Verify & sign in" :loading="loading" @click="verifyOtp" />
      </div>
    </template>
  </UModal>
</template>
```

> Icon note: `i-simple-icons-github` / `i-simple-icons-google` require the
> `@iconify-json/simple-icons` collection. If it is not installed, either add it
> (`pnpm add -D @iconify-json/simple-icons --filter web`) or fall back to lucide
> icons (`i-lucide-github`, `i-lucide-mail`). Lucide is already installed.

### 3. Sidebar footer `apps/web/app/components/chat/SidebarFooter.vue`

Shows the user button + menu when authed; a login button otherwise. Owns the
two modals.

```vue
<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

const props = defineProps<{ collapsed?: boolean }>();

const { $authClient } = useNuxtApp();
const session = $authClient.useSession();
const toast = useToast();

const settingsOpen = ref(false);
const loginOpen = ref(false);

const menuItems = computed<DropdownMenuItem[][]>(() => [
  [{ label: "Settings", icon: "i-lucide-settings", onSelect: () => (settingsOpen.value = true) }],
  [{ label: "Logout", icon: "i-lucide-log-out", color: "error", onSelect: signOut }],
]);

async function signOut() {
  await $authClient.signOut({
    fetchOptions: {
      onSuccess: async () => {
        toast.add({ title: "Signed out successfully" });
        await navigateTo("/", { replace: true, external: true });
      },
      onError: (error) =>
        toast.add({ title: "Sign out failed", description: error?.error?.message }),
    },
  });
}
</script>

<template>
  <div class="w-full">
    <USkeleton v-if="session.isPending" class="h-9 w-full" />

    <UDropdownMenu v-else-if="session.data" :items="menuItems" class="w-full">
      <UButton
        :avatar="{ src: session.data.user.image ?? undefined, alt: session.data.user.name }"
        :label="collapsed ? undefined : session.data.user.name"
        color="neutral"
        variant="ghost"
        class="w-full"
        :block="collapsed"
        trailing-icon="i-lucide-chevron-up"
      />
    </UDropdownMenu>

    <UButton
      v-else
      :label="collapsed ? undefined : 'Sign in'"
      icon="i-lucide-log-in"
      color="neutral"
      variant="outline"
      block
      :square="collapsed"
      @click="loginOpen = true"
    />

    <SettingsModal v-model:open="settingsOpen" />
    <LoginModal v-model:open="loginOpen" />
  </div>
</template>
```

### 4. Use the footer in `Sidebar.vue`

Replace the placeholder footer slot from doc 05:

```vue
<template #footer="{ collapsed }">
  <ChatSidebarFooter :collapsed="collapsed" />
</template>
```

## Acceptance criteria

- [ ] Signed in: footer shows the user's avatar/name; menu has Settings + Logout.
- [ ] Logout signs out and redirects to `/`.
- [ ] Settings modal opens with General (Appearance + Language), Profile
      (read-only avatar/name/email), and About (app + version) tabs.
- [ ] Appearance select changes light/dark/system immediately
      (`useColorMode().preference`).
- [ ] Signed out: footer shows a Sign in button opening the Login modal.
- [ ] Login modal: GitHub and Google buttons call `signIn.social`; Email OTP
      sends a code then verifies and signs in.
- [ ] Collapsed sidebar still shows a usable icon-only footer control.
- [ ] `pnpm run check-types` is clean.

## Verification

```bash
pnpm run dev:web
# Signed out: open login modal, test Email OTP (code prints in server console).
# Signed in: open settings, toggle dark mode, open profile/about, then logout.
pnpm run check-types
```

## Out of scope

- Profile editing (read-only in v0.1.0).
- Real email delivery for OTP (logged to console - see doc 03).
- The actual locale switching logic (doc 07 replaces the language placeholder).
