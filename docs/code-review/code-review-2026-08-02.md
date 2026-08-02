# Chestnut Chat 代码审查报告

- **审查日期**: 2026-08-02
- **审查范围**: 整个仓库（`apps/web`、`apps/server`、`packages/*`），约 15,600 行 TS/Vue 源码，基于 `release/v0.3.1`（HEAD `25b224a`）
- **审查方法**: 全仓库阅读 + 三个并行子代理分区审查（AI 层、Memory 层、前端），关键发现经人工逐条验证
- **标准基线**: `AGENTS.md` 记录的仓库规范；Fowler 代码坏味道基线；常见 bug/安全/性能问题模式

## 严重级别说明

| 级别 | 含义 |
|---|---|
| 🔴 高 | 功能性 bug / 数据正确性问题 / 安全风险，应尽快修复 |
| 🟡 中 | 可靠性、健壮性、性能问题；在特定场景下引发故障 |
| 🟢 低 | 代码质量、维护性、轻微 UX 问题 |

---

## 一、🔴 高优先级问题（Bug / 数据正确性 / 安全）

### 1.1 `/chat/[id].vue` 页面是 350+ 行死代码，且创建了重复的 `useChat` 实例

`apps/web/app/pages/chat/[id].vue` 的 `<script setup>`（约 378 行）完整复制了 `components/chat/Workspace.vue` 的全部逻辑——`useChat`、`chatMeta`/`history` 查询、`errorMessage`、`restoreLastOptionsFromChat`、四个 watch、`send`/`regenerate`/`confirmEdit` 等——但模板只渲染一行：

```vue
<template>
  <ChatWorkspace :chat-id="chatId" />
</template>
```

- 页面自身的 `useChat`（`[id].vue:96-134`）与 `Workspace.vue` 里的 `useChat` 使用同一个 `chatId`，产生两套重复的聊天状态实例；
- `onMounted`（`[id].vue:285-290`）与 `Workspace.vue:297-302` **都会** consume `pendingChatPrompt`，发送逻辑依赖两个实例共享 store 才不重复发送，脆弱且难以推理；
- 页面副本已与 Workspace 漂移：`[id].vue:261-265` 的历史映射缺 `metadata`、无 `useChatUsage`；
- 修复建议：把页面删成薄壳（只保留 `route`、`authSession`、`chatId` 与 `definePageMeta`），或者反过来让 Workspace 接受 `history`/`chatMeta` 作为 prop 从页面注入。当前双份逻辑意味着任何聊天修复都要改两处（Shotgun Surgery）。

### 1.2 流式回复结束后 `chat.messages` 缓存不失效，重访对话丢失最后一轮

`Workspace.vue:138-142` 与 `[id].vue:128-132` 的 `onFinish` 只调用 `invalidateChats()`（失效 `chat.list`），从不失效 `chat.messages` 查询。

历史填充 watch（`Workspace.vue:266-281`）只在 `messages.value.length === 0` 时从 `history.data` 填充分组消息。流程：发消息 → 流式完成后返回会话列表 → 再次点进该会话：`chat.messages` 命中 5s 内的陈旧缓存（`plugins/vue-query.ts:34` `staleTime: 5_000`），缓存里是流式前的旧消息 → 赋值给 `messages`（非空）→ 后台 refetch 到达时 watch 因 `messages` 非空而跳过 → **最后一轮对话缺失，直到整页刷新**。

修复建议：`onFinish` 里同时 `queryClient.invalidateQueries($orpc.chat.messages.queryKey(...))`（以及 `chat.get`），或在 `onFinish` 时用流数据同步写入缓存。

### 1.3 重新生成（regenerate）的消息永远不会进入长期记忆

`apps/server/src/ai/chat.ts:163-192`：`savedUserMessage` 只在 `!isRegeneration` 时被赋值；而记忆索引入队在 `chat.ts:374-382` 依赖 `if (savedUserMessage)`。因此：

- 所有 regenerate 出的新内容都不触发 `enqueuePostChatJobs`，**重新生成的高质量回答不会进入记忆系统**（数据正确性缺陷，用户编辑/重试后记忆与对话不符）；
- 更糟：如果 regenerate 请求体里带了 `message`（schema 允许 `message: z.any().optional()`），`savedUserMessage.id` 会被传给任务队列，但该行从未写入数据库，worker 的 `loadMessage` 会查无此行并让 extract 任务失败。

修复建议：regenerate 时也构造 `savedUserMessage`（或改为不依赖该变量，直接把新 assistant 消息入队），并显式校验。

### 1.4 记忆队列把一切插入错误当作“去重成功”，任务静默丢失

`apps/server/src/memory/queue.ts:30-37`：`try/catch` 把所有异常（连接失败、FK 违反、任何约束错误）都当作去重冲突打印后返回 `enqueued: false`，调用方（`enqueuePostChatJobs`、backfill）完全忽略返回值。结果：瞬时数据库故障时记忆任务被永久丢弃，无重试。

修复建议：仅对唯一键冲突（pg code `23505`）视为幂等成功，其他错误抛出并让调用方重试/记录。

### 1.5 记忆去重键命名空间不一致 + `chat_reindex` 重试必然失败

同一逻辑对（chat, assistant-message）在不同入口生成三种 dedupeKey：

- 正常抽取：`"extract:..."`（`queue.ts:52`）
- backfill：`"backfill_extract:..."`（`backfill.ts:41`）
- reindex：`"reindex_extract:..."`（`worker.ts:101`）

后果：backfill 跑两次、或 reindex 与正常抽取同时存在时，同一段对话被抽取多次 → **重复记忆**。且 `worker.ts:95-106` 的 `processChatReindex` 绕过 `enqueueMemoryJob` 直接 `db.insert` 无冲突处理：任务失败重试时第一个重复插入即抛唯一键错误 → `chat_reindex` 5 次重试后永久失败。

修复建议：统一 dedupeKey 前缀（如全部 `extract:`），reindex 插入时捕获 23505 跳过。

### 1.6 worker 崩溃窗口产生重复记忆

`extract.ts:191` 插入 `memoryItem` 无唯一约束；`worker.ts:154-157` 在插入完成后才标记 job completed。worker 在两者之间崩溃（或租约过期被另一实例重新领取）→ 同一任务重跑 → 完全相同的记忆行插入两份。`summarize.ts:76-88` 存在类似竞态（两实例并发时一个失败）。

修复建议：`memoryItem` 上加 `(sourceChatId, sourceMessageId, memoryKey)` 唯一约束或让 extract 任务先查重再插入；summarize 用 `onConflictDoNothing`。

### 1.7 语义检索失败会拖垮整个对话请求

`apps/server/src/memory/retrieve.ts:142-145`：`embedText` 与 `semanticMemories` **没有** try/catch，而词法路径（`147-156`）有。嵌入服务 429/5xx、或换过嵌入模型导致维度不匹配（`models.ts:66-72` 直接 throw）时，异常穿透到 `chat.ts:203` 的 `buildChatContext`——而它又在任何 try/catch 之外——整个 `/ai/chat` 请求返回 500（HTML），用户看到的是“服务器错误”而不是可恢复的提示。

修复建议：语义路径与词法路径一样降级（空结果 + 日志）；`buildChatContext` 整体包 try/catch，失败时退回纯历史上下文而非 500。

### 1.8 流式错误把上游原始错误信息透传给客户端

`chat.ts:86-88` 的 `streamErrorMessage` 直接返回 `error.message`，`createUIMessageStream.onError` 与 web-search 错误事件（`chat.ts:293`）都会把它写进 SSE 流。上游 401/quota/校验错误体可能包含 key 前缀、内部 URL、计费信息等，直接展示给浏览器。同理 `models.ts:113` 的解密失败错误（`decryptApiKey` 的原始 crypto 消息）经 `chat.ts:127` 以 400 返回。

修复建议：服务端映射为固定的用户友好文案（如 `DEFAULT_STREAM_ERROR`），原始错误只进服务端日志。

### 1.9 `chat.messages` / `chat.get` 在移动会话后不失效，前端导航回弹

`Sidebar.vue:224-237` 的 `confirmMove` 只 `list.refetch()`，不失效 `chat.get` 缓存；`Workspace.vue:49-64` 的 watch 依赖 `chatMeta.data.projectId`——陈旧缓存仍携带旧 projectId，`navigateTo(chatPath(...))` 到新路径后立刻被 watch 弹回旧 project 路径，直到 5s 后 refetch 才稳定。

修复建议：`move` mutation 成功后失效 `chat.get`（或乐观更新缓存）。

### 1.10 硬刷新会重复发送未消费的待发消息

`Workspace.vue:297-302` 的 `onMounted` `consume()` 从 `sessionStorage` 读取 `pending-chat-prompt:*`（`usePendingChatPrompt.ts:94` 无过期时间）。`sessionStorage` 在硬刷新后仍然存活，而 `onMounted` 每次挂载都会消费并 `send()` → 刷新聊天页会把同一条消息再发一遍（重复轮次、重复计费）。

修复建议：写入时带时间戳，消费时校验过期（如 2 分钟）；或刷新后仅恢复输入框内容而不自动发送。

---

## 二、🟡 中优先级（健壮性 / 性能）

### 2.1 后端所有 AI 调用无服务端超时

`streamText`（`chat.ts:304`）与两处 web-search fetch（`web-search.ts:199, 342`）只挂客户端 `abortSignal`。客户端连接异常断开后（信号未触发）或上游挂起时，请求无限挂起，占用连接与 token。ai@7 的 `streamText` 支持 `timeout` 选项，未使用。

### 2.2 上下文预算不含历史消息，长对话可撑爆模型窗口

`context.ts:183-189`：`historyMessages = rows.slice(-16)` 固定保留 16 轮，**从不计入 20k token 预算**（`budget.ts` 只覆盖 instructions/memory/chunk/newest）。16 轮 × 大文档/长回复很容易超过模型 context window → 上游 400 报错。且 `RECENT_TURN_KEEP = 8`（`budget.ts:3`）与 `slice(-16)` 不一致，摘要与上下文对“保留几轮”理解不同。

### 2.3 每次聊天请求全量加载消息历史

`context.ts:83-89`（`loadChatMessages`）、`summarize.ts:24-28`、`backfill.ts:25-29` 都无 limit 地 `select().from(message)`——消息表里的 `parts` JSONB 可能含 base64 大图（MB 级）。随对话增长每请求成本线性上涨，且 99% 的数据只为了 `.slice(-16)`。应改为只取最近 N 条（如 `orderBy(createdAt desc).limit(40)` 再反转）。

### 2.4 文件索引先删后嵌，嵌入失败时文件静默丢失索引

`index-file.ts:21-24`：先 `delete(projectFileChunk)` 再 `embedTexts`。嵌入服务持续失败（5 次重试耗尽）时：旧 chunk 已删、新 chunk 未写、`status` 也不会被置为 `failed`（只有 `empty_text` 会，`index-file.ts:14-18`）→ 文件显示 indexed 但实际不可检索。

修复建议：先嵌入成功后删除旧 chunk + 插入新 chunk 在事务/顺序上调整；失败时把 `status` 置 `failed`。

### 2.5 `chunkDocument` 在特定参数下死循环

`chunk.ts:46-47`：当 `overlapChars > targetChars`（导出 API 允许该组合，有测试文件）时 `start = Math.max(0, end - overlap)` 会把 `start` 往**后退**，`if (start >= end) start = end` 又因为 `start < end` 不生效 → 无限循环。另外 `findBreak`（`chunk.ts:8`）硬编码 `TARGET_CHUNK_CHARS * 0.6` 而不是 `options.targetChars`，自定义 `targetChars` 时完全失效。

### 2.6 无嵌入向量的记忆/分块永远检索不到

嵌入未配置期间插入的行（`extract.ts:188`、`index-file.ts:33` 的 `embedding: null`）在 `cosineDistance` 查询中永远不命中（`retrieve.ts:33-48` 无 `embedding is not null` 之外的兜底），也没有事后补嵌的回填任务。配置嵌入后旧数据全部不可检索。

### 2.7 编辑/重新生成的截断逻辑有两个隐患

`chat-store.ts:65-80`（`truncateFromMessage`）：

- **毫秒级时间戳**：`createdAt` 精度为 ms，同一毫秒插入的两条消息会被 edit 模式误删、regenerate 模式可能留下目标消息；
- **不可重试**：若 `truncate` 成功后、`saveUserMessage` 失败（`chat.ts:176-188` 返回 500），客户端重试 regenerate 时再次执行 `truncateFromMessage`——目标消息已被删，抛 “Message not found for truncate” → 永久 500。应在截断前先保存新消息，或让 truncate 幂等。

### 2.8 worker 吞吐与可靠性

- `worker.ts:192-213`：每 2s tick 只处理 1 个任务，backfill 大量 chat 时约 30 任务/分钟；多实例都会启动 worker（`index.ts:92`），仅靠原子 claim 竞争；
- `jobs.ts:4-8` 退避无 jitter，多实例失败重试会同步风暴；
- `backfill.ts:14-20` 用 offset 分页，backfill 期间新建的 chat 会被跳过。

### 2.9 聊天请求体无大小限制、无频率限制

`/ai/chat`、`/ai/attachments`、`/ai/projects/:id/files` 三个带 cookie 认证的端点没有 body 大小限制（base64 大图可达数 MB）也没有限流。`sameSite: lax` 缓解了跨站 CSRF，但登录用户可以高频打爆上游 API 配额。建议：Hono body 大小中间件 + 每用户限流。

### 2.10 每次请求都执行数据库 session 查询

`index.ts:55-77` 的 `app.use("/*")` 对**所有**请求（包括健康检查 `/`、未知路径）都执行 `createContext` → `auth.api.getSession`（一次 DB 往返）。健康检查与静态/错误路径不应触发 DB 查询，应只对 `/rpc`、`/api-reference` 做上下文创建。

### 2.11 `chat.get` 与 `[projectId]/index.vue` 之间切换会话可能短暂白屏

`Workspace.vue` 中 history watch（`266`）声明在 chatId watch（`283`）之前：切换到**已缓存**的另一会话时（5s staleTime 内），history watcher 先触发（此时 `messages` 还是旧会话内容，非空 → 跳过填充），随后 chatId watcher 清空 `messages` → 直到缓存过期 refetch 前会话显示为空。修复：清空后主动从 `history.data` 立即填充。

---

## 三、🟢 低优先级（代码质量 / 坏味道 / 维护性）

### 3.1 死代码

| 位置 | 内容 |
|---|---|
| `chat-store.ts:32-39` | `hasMessages` 全仓库无调用 |
| `context.ts:185-189` | `void keptMessageIds; void estimateTokens;` 被放弃的逐轮裁剪逻辑残留 |
| `chunk.ts:53-60` | `chunkOverlap` 无调用 |
| `ranking.ts:31-45` | `cosineSimilarity` 疑似无调用（需确认） |
| `budget.ts:3` | `RECENT_TURN_KEEP = 8` 与 `context.ts` 硬编码 16 不一致（见 2.2） |

### 3.2 重复代码（Duplicated Code）

- **`pages/chat/[id].vue` ↔ `Workspace.vue`**：~90% 相同（见 1.1），最大的一项；
- **重命名/删除的 `UModal` 代码块**逐字重复于 `Sidebar.vue:385-419` 与 `pages/[projectId]/index.vue:206-239`；
- **Blob/File 归一化 `flatMap`** 逐字复制于 `attachments.ts:105-120` 与 `project-files.ts:38-51`；
- **`retrieve.ts:27-115`** 四个 select+orderBy+limit 结构几乎相同（语义/词法 × memory/chunk）；
- **用户→助手配对循环** 重复于 `backfill.ts:31-34` 与 `worker.ts:90-93`；
- **namespace 解析**在 4 个文件里重复推导；
- **`attachments.ts:15-47`** `isImageAttachment`/`resolveImageMediaType` 各自重复计算 `normalizedType` 与扩展名。

### 3.3 其他坏味道

- **Primitive Obsession**: `memoryJob.payload` 是 JSON 字符串 + 运行时 cast（`worker.ts:116-121`），应有类型化 `JobPayload` 联合；
- **Mysterious Name**: `isMemoryChatDeepSeek`（`memory/models.ts:21-23`）名字像布尔能力检查，实际按 URL hostname 判断；
- **死分支**: `kimi.ts:79` `isKimiK25Model || isKimiThinkingModel`（后者已包含前者）；
- **Data Clumps**: `(providerId, modelId, reasoning, reasoningEffort)` 在 `chatProviderOptions`/`titleProviderOptions`/`kimiProviderOptions`/`miniMaxProviderOptions` 间反复传递，应收敛为 options 对象；
- **Middle Man**: `summarize.ts:16-18` `partsToUi` 是纯 cast；`ModelCapabilityIcons.vue` 是 3 行透传组件；
- **Speculative Generality**: `ChatBoxAttachmentPayload` 别名与 `MAX_ATTACHMENT_*` re-export（`utils/attachments.ts:14-16`）仅在本文件内使用；`chat-store.ts` 的 `hasMessages`。

### 3.4 前端小问题

- `Header.vue:7` 硬编码 `"Home"` 未走 i18n；`plugins/vue-query.ts:43` `toast.error("Error", ...)` 硬编码英文；
- `Messages.vue:147-150` `navigator.clipboard.writeText` 拒绝（非安全上下文）未处理 → toast 不出现且报 unhandled rejection；
- `useProviderCredits.ts:49-52` 吞掉 credits 拉取失败，无任何提示；
- `uploadAttachments`（`utils/attachments.ts:95-120`）与 `useProjects.ts:64-99` 无 AbortController，卸载后上传继续；
- `usePendingChatPrompt` 把文档 `extractedText` 与图片 data-URL 存进 `sessionStorage` 且不设过期——敏感内容在浏览器存储中长期残留（配合 1.10 的过期修复一起处理）；
- `verify-otp.vue:52-76` 两个平行的 `switch`（getErrorMessage/getErrorDescription）是 Repeated Switches；
- `useChatUsage.ts:32-33` 两个分支实现相同。

### 3.5 配置与环境

- `packages/auth/src/index.ts:102-111` **硬编码** `crossSubDomainCookies.domain = "bobbylin.top"` 且 `secure: true` 恒定——生产域名写死在代码里，任何环境变化都要改源码；建议从 env 注入；
- `packages/env/src/web.ts` 有未提交的本地改动（删除了一段说明注释），且这段注释其实记录了"运行时应用 `useRuntimeConfig()` 而不是 import env"的重要约定——建议要么提交要么还原，避免工作区脏状态掩盖真实 diff；
- `ensure-extensions.ts:5-6` 用 CWD 相对路径加载 `.env`，从其他 package 调用时失效（脆弱）。

### 3.6 值得肯定的地方（无需改动）

- 权限模型整体扎实：所有 oRPC 路由都有 owner 校验（`assertOwnedRow`/`providerWhere`/`getOwnedProject`），`chat.messages` 通过 join 校验 userId；
- 提示词注入防御写得好：`chat-title.ts:52` 与 `web-search.ts:319-320` 都显式声明检索内容不可信、不可作为指令；引用 URL 经过协议白名单（`web-search.ts:61-71`）；
- 自定义 provider 的 baseUrl 不会造成 SSRF（MiniMax 重试目标硬编码、credits 端点由用户自己的 key/baseUrl 决定，属预期行为）；
- API key 永不进入客户端 bundle（`providers.list` 只暴露 `hasApiKey`）；markdown 链接做了协议过滤；i18n 两个 locale 304 个 key 完全对齐；
- `encryption.ts` 的 AES-256-GCM 实现（版本前缀、随机 IV、认证标签）正确。

---

## 四、建议修复顺序（Action Items）

> 更新于 2026-08-02：P0/P1 已全部实施并通过验证（22 个测试、`check-types` 全 workspace、oxlint 0 错误）。状态列：✅ 已完成 / ⏳ 已排期 / 🔍 已核查。

| 优先级 | 事项 | 涉及文件 | 状态 |
|---|---|---|---|
| P0 | 删除/重构 `pages/chat/[id].vue` 死代码 | `[id].vue` | ✅ 瘦身为 12 行薄壳 |
| P0 | `onFinish` 失效 `chat.messages`/`chat.get` | `Workspace.vue` | ✅ 同时重构历史同步 watch（顺带修复 2.11 白屏竞态） |
| P0 | regenerate 走记忆索引 + 修复入队校验 | `chat.ts` | ✅ 复用被保留的用户轮次 id 入队 |
| P0 | 队列错误分类（23505 才幂等） | `queue.ts` | ✅ 其他错误抛出，backfill 逐条捕获 |
| P0 | 统一 dedupeKey + reindex 冲突处理 | `worker.ts`、`backfill.ts`、`queue.ts` | ✅ 见下方说明① |
| P0 | `memoryItem` 唯一约束/查重 | `schema/memory.ts`、`extract.ts` | ✅ 唯一索引 + `onConflictDoUpdate` upsert；迁移 `0004` 已生成 |
| P1 | 语义检索降级而非 500 | `retrieve.ts`、`chat.ts` | ✅ 语义路径全部 try/catch 降级；`buildChatContext` 包 try/catch |
| P1 | 错误信息脱敏（流式 + 解密） | `chat.ts`、`encryption.ts` 及 5 处调用点 | ✅ 流式统一泛化文案；新增 `decryptApiKeyForRequest` |
| P1 | 截断逻辑幂等化 + 保存顺序调整 | `chat-store.ts` | ✅ 改为按插入顺序的 id 列表删除（顺带修复毫秒时间戳误删） |
| P1 | 历史消息预算化 + 分页加载 | `context.ts`、`summarize.ts` | ✅ 预算计入最近 16 轮（最新轮恒保留）；消息只取最近 40 条；summarize 两步查询 |
| P1 | 索引失败状态回写 | `index-file.ts` | ✅ 先嵌入后删除，失败置 `failed` 并保留旧 chunk |
| P1 | `chunkDocument` 死循环与参数修复 | `chunk.ts` | ✅ overlap 不再吞没 chunk；`findBreak` 尊重 `targetChars`；新增 2 个回归测试 |
| P2 | 服务端超时（streamText） | `chat.ts` | ✅ 5 分钟总超时；web-search fetch 超时与限流、body 限制未做 |
| P2 | `chat.get` 移动后失效 | `Sidebar.vue` | ✅ |
| P2 | pending prompt 过期 | `usePendingChatPrompt.ts` | 🔍 已核查：`consume()` 在挂载时同步清除 storage，硬刷新不会重发；原描述场景无法复现，未改动 |
| P2 | worker 批量处理 + jitter | `worker.ts`、`jobs.ts` | ⏳ |
| P2 | context 创建只作用于 API 路由 | `index.ts` | ⏳ |
| P2 | web-search fetch 超时、请求体限制、限流 | `web-search.ts`、`index.ts` | ⏳ |
| P3 | 死代码清理（`hasMessages`、`void` 语句、`cosineSimilarity`、kimi 死分支） | 多处 | ✅ |
| P3 | i18n 硬编码（Header "Home"、vue-query "Error"、copy 失败提示） | `Header.vue`、`vue-query.ts`、`Messages.vue`、两个 locale | ✅ 三个新 key 已同步 en/zh |
| P3 | `useChatUsage` 重复分支 | `useChatUsage.ts` | ✅ |
| P3 | cookie 域名 env 化、上传 AbortController、credits 失败提示、verify-otp 双 switch、附件全有全无 | 多处 | ⏳ |

> ① dedupeKey 说明：backfill 与正常抽取统一为 `extract:` 前缀；reindex 保留强制重抽取语义（先重置该 chat 的 extract 任务 → 用统一前缀重新入队 → 最后才删记忆，崩溃窗口不再丢数据），重复记忆由 memoryItem 唯一约束兜底。

> ⚠️ 迁移注意：`memory_item_source_message_key_idx` 唯一索引要求现有数据无重复 `(source_chat_id, source_message_id, memory_key)`。执行 `pnpm run db:migrate` 前如曾出现过重复抽取，需先清理：
> ```sql
> DELETE FROM memory_item a USING memory_item b
> WHERE a.id > b.id
>   AND a.source_chat_id = b.source_chat_id
>   AND a.source_message_id = b.source_message_id
>   AND a.memory_key = b.memory_key;
> ```

---

## 附：审查说明

- 本仓库无 `CODING_STANDARDS.md`，以 `AGENTS.md` 为唯一书面标准；未发现违反 AGENTS.md 明确规则的行为（ESM、严格 TS、oxlint/oxfmt 由工具强制）。
- 全仓库无 `Spec` 文档可对照（`docs/v0.1.0/functions.md` 为空），故本报告聚焦正确性、健壮性、安全与坏味道，而非规格符合度。
- 发现数量：🔴 高 10 项、🟡 中 11 项、🟢 低 ~20 项。
- 最严重问题（按轴）：**功能正确性**——`/chat/[id].vue` 350 行死代码与聊天缓存失效不全（1.1/1.2）；**数据完整性**——记忆去重键不一致与任务静默丢失导致记忆重复/缺失（1.4/1.5/1.6）。
