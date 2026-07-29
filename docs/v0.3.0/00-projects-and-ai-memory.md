# Projects/Folders and AI Memory

## Summary

Add flat, user-owned projects that group chats, carry instructions/files, and choose one of two memory scopes:

- **Default:** use the user’s global memory plus the current project’s instructions and files.
- **Project:** isolate memory to chats inside that project; never read or write global memory.

The memory architecture will combine recent messages, rolling summaries, durable extracted facts, and retrieval over project files. This follows established short-term/long-term memory patterns, avoids replaying unlimited chat history, and stays within the existing AI SDK + Neon stack rather than adding LangGraph itself.

References:

- [LangGraph memory guidance](https://docs.langchain.com/oss/javascript/concepts/memory)
- [AI SDK persistence pattern](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence)
- [AI SDK embeddings](https://ai-sdk.dev/docs/ai-sdk-core/embeddings)
- [Neon pgvector guidance](https://neon.com/docs/ai/ai-vector-search-optimization)

## Product and UI Changes

- Restructure the expanded sidebar into:
  - New chat and search controls.
  - A **Chats** button with chevron that collapses/expands standalone chats.
  - A **Projects** label with a create button.
  - Flat project rows that independently expand/collapse their nested chats.
  - Project row actions: new chat, edit settings, and delete.
  - Chat action **Move to project**, including **No project**; no drag-and-drop in v1.
- Search project names and chat titles. During search, automatically reveal matching sections without overwriting the user’s saved expansion state.
- Persist Chats/project expansion state locally. The existing sidebar-width/collapsed state remains owned by `UDashboardGroup`.
- Add a reusable project form modal:
  - Required name, 1–80 characters.
  - Emoji/Lucide icon picker backed by curated allowlists; persist `iconKind` and `iconValue`.
  - Localized quick suggestions: Work, Personal, Study, and Travel, each with a suggested emoji.
  - Collapsed **Advanced settings** area containing:
    - Memory select: **Default** or **Project**.
    - Optional instructions, maximum 8,000 characters.
    - PDF, DOC, DOCX, TXT, and MD upload; maximum 10 files per project, 10 MB each.
  - Editing a project reuses the modal and also lists/removes existing files.
- On creation:
  - Create the project and its initial empty chat together.
  - Process selected files, reporting individual failures without deleting the successfully created project.
  - Redirect to `/chat/{initialChatId}`.
- Extend `ChatBox` with an optional project prop and render the project emoji/icon and title in `UChatPrompt`’s header slot. Standalone chats retain the current prompt.
- Component boundaries:
  - `ProjectFormModal`: form orchestration and submission.
  - `ProjectIconPicker`: typed emoji/icon selection.
  - `ProjectSidebarSection` and `ProjectSidebarItem`: project/chat navigation only, emitting actions upward.
  - `useProjects`: project queries, mutations, cache updates, and uploads.
  - `ChatBox`: presentation-only project identity through a typed prop.
- Add all new strings and validation/error states to both English and Chinese locale files.

## Data Model and Interfaces

- Enable `vector` and `pg_trgm` extensions in a generated Drizzle migration.
- Add:
  - `project`: user, name, icon kind/value, `memoryMode: "default" | "project"`, instructions, timestamps.
  - Nullable `chat.projectId`; existing chats remain standalone. The foreign key cascades because project deletion must delete all chats/messages.
  - `projectFile`: project, metadata, extracted text, indexing status/error, timestamps. Raw binaries are discarded.
  - `projectFileChunk`: file/project, chunk order, content, fixed 1,536-dimensional embedding.
  - `chatSummary`: chat, rolling summary, and the last summarized message marker.
  - `memoryItem`: user, nullable project scope, source chat/message, memory key/type/content/importance, 1,536-dimensional embedding, timestamp. `projectId = null` represents global memory.
  - `memoryJob`: durable extraction, summarization, file-index, and chat-reindex work with status, dedupe key, attempts, lease time, and error.
- Cascade account deletion through every new table. Project deletion cascades chats, messages, files, chunks, summaries, and all memory items attributed to those chats, including globally scoped items.
- Add indexes for ownership/project lookups, source chat cleanup, pending jobs, trigram content search, and HNSW cosine similarity.
- Project APIs:
  - `project.list`
  - `project.create` → `{ project, initialChat }`
  - `project.update`
  - `project.delete`
  - `project.files`
  - `project.deleteFile`
- Chat API changes:
  - `chat.list` returns `projectId`.
  - Add `chat.get` with project metadata.
  - `chat.create` accepts optional `projectId`.
  - Add `chat.move({ chatId, projectId: string | null })`.
  - Every route verifies both resources belong to the authenticated user.
- Use `db.batch` for atomic project/chat creation because the current Neon HTTP driver does not support interactive Drizzle transactions.
- Add authenticated `POST /ai/projects/:projectId/files` for multipart project-file ingestion, reusing the current document extractors but rejecting image/OCR inputs.
- Add server-managed environment configuration:
  - `MEMORY_CHAT_BASE_URL`, `MEMORY_CHAT_API_KEY`, `MEMORY_CHAT_MODEL`
  - `MEMORY_EMBEDDING_BASE_URL`, `MEMORY_EMBEDDING_API_KEY`, `MEMORY_EMBEDDING_MODEL`
  - Embeddings must return 1,536 dimensions; changing dimensions requires a migration and full reindex.

## Memory and Chat Pipeline

- Change AI SDK transport to send only the newest UI message plus `chatId`, trigger/message ID, and model options. The server loads authoritative history from Postgres and validates the incoming UI message.
- Preserve edit/regenerate behavior server-side by truncating/replacing the appropriate persisted message branch before generation, preventing stale or duplicate messages on reload.
- Build model context in this priority order:
  1. Base application instructions.
  2. Project instructions, if present.
  3. Current chat rolling summary.
  4. Relevant long-term memories.
  5. Relevant project-file chunks.
  6. Most recent unsummarized chat messages and the newest user message.
- Treat memories and file chunks as quoted, untrusted context that cannot override base/project instructions.
- Use a configurable 24,000-token input budget with 4,000 tokens reserved for output. Preserve the newest message and instructions first; trim low-ranked file chunks, memories, and older turns in that order.
- Memory scope resolution:
  - Standalone chat → read/write global memory.
  - Default project → read/write global memory, plus project instructions/files.
  - Project-only project → read/write only memory rows for that project, plus project instructions/files.
- After each successful assistant response, enqueue durable background work:
  - Use the app-managed chat model with AI SDK structured output to extract at most five explicit user facts, preferences, goals, decisions, or constraints.
  - Never save passwords, API keys, authentication codes, or transient one-off requests.
  - Embed accepted items in batches and persist their source chat/message.
  - Keep separate source-attributed items; during retrieval, group matching keys and prefer the newest item so project deletion and chat movement remain reversible.
- Summarize older chat history in the background once unsummarized history exceeds approximately 16,000 tokens. Retain the latest eight user/assistant turns verbatim.
- Chunk project documents deterministically around paragraph/sentence boundaries, targeting 2,000 Unicode characters with 200-character overlap, then batch-embed them.
- Retrieve up to eight memory items and six project-file chunks using semantic similarity plus trigram lexical search, merged with reciprocal-rank fusion and bounded by the context budget.
- Run a lease-based in-process worker:
  - Atomically claim pending jobs, retry failures up to five times with exponential backoff, and reclaim leases older than five minutes.
  - Memory/indexing failures never block ordinary chat streaming; log structured failure, latency, and retrieval-count data.
- Moving a chat or changing project memory mode deletes that chat’s derived memory items and enqueues a complete reindex into the destination namespace. No memories are promoted across scopes.
- Provide an idempotent `memory:backfill` command to enqueue existing standalone chat histories into global memory in controlled batches after deployment.
- Do not add a saved-memory inspection/clear UI in v1, per the chosen scope.

## Test and Rollout Plan

- Add Vitest and cover:
  - Memory namespace resolution for standalone, Default, and Project-only chats.
  - Project ownership checks and cross-user denial.
  - Project/chat cascade deletion and chat movement.
  - Project mode changes and reindex job creation.
  - File validation, extraction, chunk overlap, and partial upload failure.
  - Structured memory filtering, sensitive-data exclusion, deduplication, and newest-value precedence.
  - Hybrid ranking, token-budget trimming, rolling-summary boundaries, job leasing, retries, and idempotency.
  - AI SDK last-message request preparation and edit/regenerate persistence.
- Manually verify:
  - Sidebar collapse/expand, search, project nesting, menus, mobile sidebar, and saved expansion state.
  - Project creation with each icon type, quick suggestions, advanced settings, and file errors.
  - Redirect to the initial project chat and project title in the chatbox.
  - Global memories appear in Default projects but never in Project-only projects, and Project-only memories never leak elsewhere.
  - English and Chinese UI, keyboard navigation, focus handling, and screen-reader labels.
- Run `pnpm run db:generate`, apply the migration on a Neon branch, then run `pnpm run check-types`, Vitest, and `pnpm run check`.
- Deploy schema and configured memory services before enabling the worker; run the explicit backfill command afterward and monitor job failure rate and retrieval latency.

## Assumptions

- “Projects” and “folders” are the same flat concept; nested folders are out of scope.
- A chat belongs to zero or one project.
- Project files are project context regardless of the selected memory mode.
- Deleting a project permanently deletes all chats and project data after a destructive confirmation.
- Raw uploaded files, image OCR, memory-management UI, sharing/collaboration, drag-and-drop organization, and nested projects are out of scope for v1.
