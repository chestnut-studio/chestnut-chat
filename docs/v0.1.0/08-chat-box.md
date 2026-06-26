# 08 - Chat box (composer) + chat page wiring

## Goal

Build the chat **composer**: a textarea with a model picker, a reasoning toggle,
a web-search toggle (UI only), a file-attach button (UI only), and a submit
button. Create the `/chat/[id]` page that holds the AI SDK `Chat` instance and
places the composer (centered for an empty chat, pinned to the bottom once
messages exist). Make the dashboard "New chat" centered composer start a
conversation.

## Prerequisites

- `02-api-chat-routers.md` (`$orpc.chat.*`).
- `04-dashboard-shell.md` (dashboard layout).
- `05-sidebar-history.md` (navigates to `/chat/<id>`).
- Pairs with `09-chat-streaming-backend.md` (the endpoint the composer posts to)
  and `10-chat-messages-ui.md` (renders the messages). Build the UI here; full
  end-to-end test happens after doc 09.

## Context & files

Read first:

- `apps/web/app/plugins/orpc.ts` - how the server URL is resolved
  (`config.public.serverUrl`). The streaming endpoint lives on the **Hono
  server** (port 3010), same origin the oRPC client already targets.
- Nuxt UI chat components docs concepts (already summarized below).

Files you will install / create / edit:

- Install `ai`, `@ai-sdk/vue` in `apps/web`.
- **Create** `apps/web/app/utils/models.ts`
- **Create** `apps/web/app/components/chat/Box.vue`
- **Create** `apps/web/app/pages/chat/[id].vue`
- **Edit** `apps/web/app/pages/dashboard.vue` (centered new-chat composer)

## Background knowledge

- We use the **Vercel AI SDK** on the client via `@ai-sdk/vue`. The `Chat` class
  manages messages + streaming state. You create one per conversation:
  ```ts
  import { Chat } from "@ai-sdk/vue";
  import { DefaultChatTransport } from "ai";
  const chat = new Chat({ transport, messages: initialMessages });
  ```
  - `chat.messages` - reactive array of UI messages (each has `id`, `role`,
    `parts`).
  - `chat.status` - `'ready' | 'submitted' | 'streaming' | 'error'`.
  - `chat.sendMessage({ text }, { body })` - send a user message; `body` is
    merged into the POST body (we use it to pass model/reasoning/etc.).
  - `chat.stop()`, `chat.regenerate()`.
- **Transport**: `DefaultChatTransport` posts to an HTTP endpoint. Our endpoint
  is on the Hono server, a different origin in dev, so we must send cookies with
  `credentials: "include"` (the oRPC client does the same).
- Nuxt UI provides composer components: `UChatPrompt` (the textarea shell, with
  `v-model`, a `#footer` area via default slot, and a `@submit` event) and
  `UChatPromptSubmit` (submit button that reflects `chat.status` and can `stop`
  / `reload`). We will use these.
- **DeepSeek models** for the picker:
  - `deepseek-chat` - fast general model (no reasoning).
  - `deepseek-reasoner` - reasoning model (streams a thinking block).
  The reasoning toggle either selects `deepseek-reasoner` or passes a provider
  option; we keep it simple: toggling reasoning sends a `reasoning: true` flag
  that the backend (doc 09) maps to the reasoner model / thinking option.
- Web search + file attach are **UI only** in v0.1.0: the web toggle sends a
  `webSearch` boolean (the backend ignores it for now), and attached files are
  shown as chips but not uploaded.

## Steps

### 1. Install client deps

```bash
pnpm add ai @ai-sdk/vue --filter web
```

### 2. Model list `apps/web/app/utils/models.ts`

```ts
export type ModelOption = {
  value: string;
  label: string;
  reasoning: boolean;
};

export const MODELS: ModelOption[] = [
  { value: "deepseek-chat", label: "DeepSeek Chat", reasoning: false },
  { value: "deepseek-reasoner", label: "DeepSeek Reasoner", reasoning: true },
];

export const DEFAULT_MODEL = "deepseek-chat";
```

### 3. The composer `apps/web/app/components/chat/Box.vue`

Self-contained: owns the input + option state and emits a `submit` payload. The
parent page decides what to do with it (send to the existing chat, or create a
new chat first).

```vue
<script setup lang="ts">
import { DEFAULT_MODEL, MODELS } from "~/utils/models";

defineProps<{ status?: string }>();
const emit = defineEmits<{
  submit: [{ text: string; model: string; reasoning: boolean; webSearch: boolean }];
  stop: [];
}>();

const input = ref("");
const model = ref(DEFAULT_MODEL);
const reasoning = ref(false);
const webSearch = ref(false);
const files = ref<File[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);

function onPickFiles(e: Event) {
  const target = e.target as HTMLInputElement;
  files.value = Array.from(target.files ?? []);
}

function onSubmit() {
  const text = input.value.trim();
  if (!text) return;
  emit("submit", {
    text,
    model: model.value,
    reasoning: reasoning.value,
    webSearch: webSearch.value,
  });
  input.value = "";
  files.value = [];
}
</script>

<template>
  <div class="w-full">
    <div v-if="files.length" class="mb-2 flex flex-wrap gap-2">
      <UBadge
        v-for="(f, i) in files"
        :key="i"
        color="neutral"
        variant="subtle"
        :label="f.name"
        icon="i-lucide-paperclip"
      />
    </div>

    <UChatPrompt
      v-model="input"
      :placeholder="$t('chat.placeholder')"
      @submit="onSubmit"
    >
      <template #footer>
        <div class="flex items-center gap-1.5">
          <USelect v-model="model" :items="MODELS" value-key="value" size="sm" class="w-44" />

          <UButton
            :color="reasoning ? 'primary' : 'neutral'"
            :variant="reasoning ? 'soft' : 'ghost'"
            icon="i-lucide-brain"
            size="sm"
            square
            :aria-label="$t('chat.reasoning')"
            @click="reasoning = !reasoning"
          />
          <UButton
            :color="webSearch ? 'primary' : 'neutral'"
            :variant="webSearch ? 'soft' : 'ghost'"
            icon="i-lucide-globe"
            size="sm"
            square
            :aria-label="$t('chat.webSearch')"
            @click="webSearch = !webSearch"
          />
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-paperclip"
            size="sm"
            square
            :aria-label="$t('chat.attach')"
            @click="fileInput?.click()"
          />
          <input ref="fileInput" type="file" multiple class="hidden" @change="onPickFiles" />

          <UChatPromptSubmit
            class="ms-auto"
            :status="status"
            @stop="emit('stop')"
          />
        </div>
      </template>
    </UChatPrompt>
  </div>
</template>
```

> If `UChatPrompt` does not expose a `#footer` slot in your installed version,
> place the control row + `UChatPromptSubmit` immediately under the
> `UChatPrompt` inside the same bordered container. Check the component with
> `apps/web` running and the Nuxt UI docs.

### 4. Chat page `apps/web/app/pages/chat/[id].vue`

Creates the `Chat` instance pointing at the Hono streaming endpoint, loads any
persisted messages, and lays out messages + composer. Message **rendering** is
completed in doc 10; here render a minimal list so you can test.

```vue
<script setup lang="ts">
import { Chat } from "@ai-sdk/vue";
import { useQuery } from "@tanstack/vue-query";
import { DefaultChatTransport } from "ai";

definePageMeta({
  layout: "dashboard",
  middleware: ["auth"],
});

const route = useRoute();
const { $orpc } = useNuxtApp();
const config = useRuntimeConfig();
const chatId = computed(() => route.params.id as string);

const serverUrl = config.public.serverUrl;

// Load persisted messages for this chat (parts are AI SDK UI parts).
const history = useQuery(
  $orpc.chat.messages.queryOptions({ input: { chatId: chatId.value } }),
);

const chat = new Chat({
  id: chatId.value,
  messages: [],
  transport: new DefaultChatTransport({
    api: `${serverUrl}/ai/chat`,
    credentials: "include",
  }),
  onError(error) {
    console.error(error);
  },
});

// Seed the Chat with persisted history once it arrives.
watch(
  () => history.data.value,
  (rows) => {
    if (rows && chat.messages.length === 0) {
      chat.messages = rows.map((r) => ({
        id: r.id,
        role: r.role as "user" | "assistant",
        parts: r.parts as any,
      }));
    }
  },
  { immediate: true },
);

// A new chat may carry a first prompt from the dashboard.
const pendingPrompt = useState<{
  text: string;
  model: string;
  reasoning: boolean;
  webSearch: boolean;
} | null>("pendingPrompt", () => null);

onMounted(() => {
  if (pendingPrompt.value) {
    const p = pendingPrompt.value;
    pendingPrompt.value = null;
    send(p);
  }
});

function send(payload: { text: string; model: string; reasoning: boolean; webSearch: boolean }) {
  chat.sendMessage(
    { text: payload.text },
    {
      body: {
        chatId: chatId.value,
        model: payload.model,
        reasoning: payload.reasoning,
        webSearch: payload.webSearch,
      },
    },
  );
}
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="flex-1 overflow-y-auto">
      <!-- DOC 10 replaces this with UChatMessages + markdown rendering -->
      <div v-for="m in chat.messages" :key="m.id" class="px-4 py-2">
        <strong>{{ m.role }}:</strong>
        <template v-for="(part, i) in m.parts" :key="i">
          <span v-if="part.type === 'text'">{{ part.text }}</span>
        </template>
      </div>
    </div>

    <div class="border-t border-default p-4">
      <ChatBox :status="chat.status" @submit="send" @stop="chat.stop()" />
    </div>
  </div>
</template>
```

> `$orpc.chat.messages.queryOptions({ input: { chatId } })` is the oRPC +
> TanStack pattern for a query that takes input. If your oRPC version uses a
> different signature, mirror what `dashboard.vue` does for `privateData` and
> pass the input as that version expects.

### 5. Dashboard centered composer `apps/web/app/pages/dashboard.vue`

On submit: create a chat, stash the first prompt in `pendingPrompt`, and
navigate to the new chat (which auto-sends on mount).

```vue
<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
  middleware: ["auth"],
});

const { create } = useChats();

const pendingPrompt = useState<unknown>("pendingPrompt", () => null);

async function onSubmit(payload: {
  text: string;
  model: string;
  reasoning: boolean;
  webSearch: boolean;
}) {
  const chat = await create.mutateAsync({ title: payload.text.slice(0, 60) });
  if (!chat) return;
  pendingPrompt.value = payload;
  navigateTo(`/chat/${chat.id}`);
}
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center px-4">
    <div class="w-full max-w-2xl space-y-6">
      <h1 class="text-center text-2xl font-semibold">{{ $t("chat.placeholder") }}</h1>
      <ChatBox @submit="onSubmit" />
    </div>
  </div>
</template>
```

This satisfies "chat box in the middle when it's a new chat": the dashboard
shows the centered composer; once you are inside `/chat/[id]` with messages, the
composer sits at the bottom.

## Acceptance criteria

- [ ] `ai` and `@ai-sdk/vue` are installed in `apps/web`.
- [ ] The composer renders: textarea, model `USelect` (DeepSeek Chat / Reasoner),
      reasoning toggle, web-search toggle, attach button, submit button.
- [ ] Toggles visibly reflect on/off state; attached files show as chips.
- [ ] Submitting on the dashboard creates a chat (title = first 60 chars),
      navigates to `/chat/<id>`, and auto-sends the first message.
- [ ] `/chat/[id]` creates a `Chat` bound to `${serverUrl}/ai/chat` with
      `credentials: "include"`, seeds persisted history, and re-sends correctly.
- [ ] Submit is disabled/echoed appropriately while `status` is streaming
      (handled by `UChatPromptSubmit`).
- [ ] `pnpm run check-types` is clean.
- [ ] (Full streaming test deferred to doc 09.)

## Verification

```bash
pnpm add ai @ai-sdk/vue --filter web
pnpm run check-types
pnpm run dev:web
# Visit /dashboard, type a message, submit -> routes to /chat/<id>.
# (Responses stream only after doc 09 is done.)
```

## Out of scope

- Real web search and file upload (UI only; flags/chips just exist).
- Message actions (copy/regenerate/edit) and markdown - those are doc 10.
- The backend endpoint - that is doc 09.
