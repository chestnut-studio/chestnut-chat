# 10 - Chat messages: markdown render + actions

## Goal

Render the message list with streaming **markdown**, a collapsible **reasoning**
block, and per-message actions: **user messages** get copy, regenerate, and
edit; **assistant messages** get copy and regenerate.

## Prerequisites

- `08-chat-box.md` (the `/chat/[id]` page + `Chat` instance).
- `09-chat-streaming-backend.md` (so messages actually stream + persist).

## Context & files

Read first:

- `apps/web/app/pages/chat/[id].vue` - the minimal message list from doc 08
  (you replace its render block).
- Nuxt UI chat components (summarized below).

Files you will install / create / edit:

- Install `@comark/nuxt` (streaming markdown renderer) + add it to `modules`.
- **Create** `apps/web/app/components/chat/Messages.vue`
- **Edit** `apps/web/app/pages/chat/[id].vue` (use `ChatMessages`; add
  regenerate/edit handlers)

## Background knowledge

- Nuxt UI provides chat-render components designed for the AI SDK:
  - `UChatMessages` - scrollable list with auto-scroll; `:messages`, `:status`,
    and a `#content` slot that receives `{ message }`.
  - `UChatMessage` - a single message bubble with `:actions` (an array of
    buttons) and avatar/side handling.
  - `UChatReasoning` - a collapsible block for reasoning/thinking parts.
- **Streaming markdown**: render assistant text with the `Comark` component from
  `@comark/nuxt`. It incrementally renders markdown tokens as they stream
  (no flicker). User text is shown as plain pre-wrapped text (not markdown).
- **AI SDK message parts**: each message has `parts: Array<part>`. Helpers from
  `ai` identify part kinds: `isTextUIPart(part)`, `isReasoningUIPart(part)`.
  Nuxt UI's `isPartStreaming(part)` (from `@nuxt/ui/utils/ai`) tells you whether
  a part is still streaming, so `Comark`/`UChatReasoning` can show a live state.
- **Actions** on `Chat`:
  - copy: `navigator.clipboard.writeText(text)` where `text` is the joined text
    parts of the message.
  - regenerate: `chat.regenerate({ messageId })` re-runs generation. Calling it
    on an assistant message regenerates that response; the SDK handles trimming.
  - edit (user only): replace the message text and re-send. Simplest robust
    approach: truncate `chat.messages` to before the edited message, then
    `chat.sendMessage({ text: newText }, { body })` again.

## Steps

### 1. Install the markdown renderer

```bash
pnpm add @comark/nuxt --filter web
```

Add it to `apps/web/nuxt.config.ts` modules (keep existing entries):

```ts
modules: ["@nuxt/ui", "@nuxtjs/i18n", "@comark/nuxt"],
```

> `@comark/nuxt` auto-registers a global `<Comark>` component and enables Nuxt
> UI prose styles. No extra import is needed in components.

### 2. Messages component `apps/web/app/components/chat/Messages.vue`

Receives the `Chat` instance and emits action events to the page.

```vue
<script setup lang="ts">
import type { Chat } from "@ai-sdk/vue";
import { isPartStreaming } from "@nuxt/ui/utils/ai";
import { isReasoningUIPart, isTextUIPart } from "ai";
import { toast } from "vue-sonner";

const props = defineProps<{ chat: Chat }>();
const emit = defineEmits<{
  regenerate: [string];
  edit: [{ id: string; text: string }];
}>();

function messageText(message: { parts: { type: string; text?: string }[] }) {
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join("");
}

async function copy(message: { parts: { type: string; text?: string }[] }) {
  await navigator.clipboard.writeText(messageText(message));
  toast.success("Copied");
}

function actionsFor(message: { id: string; role: string; parts: any[] }) {
  const base = [
    {
      label: "Copy",
      icon: "i-lucide-copy",
      onClick: () => copy(message),
    },
    {
      label: "Regenerate",
      icon: "i-lucide-refresh-cw",
      onClick: () => emit("regenerate", message.id),
    },
  ];
  if (message.role === "user") {
    base.push({
      label: "Edit",
      icon: "i-lucide-pencil",
      onClick: () => emit("edit", { id: message.id, text: messageText(message) }),
    });
  }
  return base;
}
</script>

<template>
  <UChatMessages :messages="props.chat.messages" :status="props.chat.status">
    <template #content="{ message }">
      <UChatMessage :actions="actionsFor(message)">
        <template
          v-for="(part, index) in message.parts"
          :key="`${message.id}-${index}`"
        >
          <UChatReasoning
            v-if="isReasoningUIPart(part)"
            :text="part.text"
            :streaming="isPartStreaming(part)"
          >
            <Comark :markdown="part.text" :streaming="isPartStreaming(part)" />
          </UChatReasoning>

          <template v-else-if="isTextUIPart(part)">
            <Comark
              v-if="message.role === 'assistant'"
              :markdown="part.text"
              :streaming="isPartStreaming(part)"
            />
            <p v-else class="whitespace-pre-wrap">{{ part.text }}</p>
          </template>
        </template>
      </UChatMessage>
    </template>
  </UChatMessages>
</template>
```

> The exact `UChatMessage` action prop name/shape can differ slightly by Nuxt UI
> version. If `:actions` does not render buttons, check the
> `ui.nuxt.com/docs/components/chat-message` API for your version and adapt
> (some versions take `{ label, icon, onSelect }`). Keep the copy/regenerate/edit
> behavior identical.

### 3. Wire into `apps/web/app/pages/chat/[id].vue`

Replace the placeholder render block from doc 08 with `ChatMessages`, and add
the regenerate/edit handlers. Edit truncates history then re-sends:

```vue
<!-- template: swap the message loop for: -->
<div class="flex-1 overflow-y-auto">
  <ChatMessages :chat="chat" @regenerate="onRegenerate" @edit="onEdit" />
</div>
```

```ts
// script: add handlers (reuse the existing `send` and `chat`).
function onRegenerate(messageId: string) {
  chat.regenerate({ messageId });
}

const lastOptions = ref({ model: "deepseek-chat", reasoning: false, webSearch: false });

// capture the options used on each send so edit/regenerate can reuse them
function send(payload: { text: string; model: string; reasoning: boolean; webSearch: boolean }) {
  lastOptions.value = {
    model: payload.model,
    reasoning: payload.reasoning,
    webSearch: payload.webSearch,
  };
  chat.sendMessage(
    { text: payload.text },
    { body: { chatId: chatId.value, ...lastOptions.value } },
  );
}

function onEdit({ id, text }: { id: string; text: string }) {
  const index = chat.messages.findIndex((m) => m.id === id);
  if (index === -1) return;
  // Drop the edited user message and everything after it, then resend.
  chat.messages = chat.messages.slice(0, index);
  chat.sendMessage({ text }, { body: { chatId: chatId.value, ...lastOptions.value } });
}
```

> For a nicer edit UX you may open a small inline `UTextarea` or a `UModal`
> prefilled with the message text and call `onEdit` on confirm. The minimum bar
> is: edit replaces the message and regenerates the answer.

### 4. Dark-mode code highlighting (optional polish)

If you enable Comark's `highlight` plugin for code blocks, add the dark-mode CSS
from the Nuxt UI chat docs to `apps/web/app/assets/css/main.css`:

```css
html.dark .shiki span {
  color: var(--shiki-dark) !important;
  background-color: var(--shiki-dark-bg) !important;
  font-style: var(--shiki-dark-font-style) !important;
  font-weight: var(--shiki-dark-font-weight) !important;
  text-decoration: var(--shiki-dark-text-decoration) !important;
}
```

## Acceptance criteria

- [ ] Assistant messages render as **markdown** and update smoothly while
      streaming; user messages render as plain wrapped text.
- [ ] Reasoning parts (DeepSeek Reasoner) show in a collapsible `UChatReasoning`
      block.
- [ ] Every message has a working **Copy** button (copies the joined text).
- [ ] Every message has a **Regenerate** button (`chat.regenerate`).
- [ ] **User** messages additionally have **Edit**, which replaces the message
      and regenerates the response.
- [ ] The list auto-scrolls to the newest message while streaming.
- [ ] `pnpm run check-types` is clean.

## Verification

```bash
pnpm add @comark/nuxt --filter web
pnpm run check-types
pnpm run dev
# Send messages: confirm markdown renders, reasoning collapses, copy works,
# regenerate re-answers, and editing a user message re-runs generation.
```

## Out of scope

- Tool-call rendering (`UChatTool`) - no tools in v0.1.0.
- Message-level token/cost display.
- Attachment rendering (file attach is UI-only).
```

## You are done with v0.1.0

After this doc, the full function list in `functions.md` is implemented:
sidebar (toggle, new chat, search, grouped history with rename/archive/delete/
pin), user menu + settings (mode, language, profile, about), login (GitHub,
Google, Email OTP), the chat box (textarea, model, reasoning, web-search and
file-attach UI), streamed DeepSeek responses, and the message list with markdown
+ copy/regenerate/edit. Run the full check before wrapping up:

```bash
pnpm run check-types && pnpm run check
```
