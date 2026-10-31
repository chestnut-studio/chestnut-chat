import { enqueueMemoryJob } from "@chestnut-chat/api/memory/queue";

export { enqueueMemoryJob };

export async function enqueuePostChatJobs(input: {
  userId: string;
  chatId: string;
  projectId: string | null;
  userMessageId: string;
  assistantMessageId: string;
}) {
  await enqueueMemoryJob({
    userId: input.userId,
    type: "extract",
    chatId: input.chatId,
    projectId: input.projectId,
    dedupeParts: ["extract", input.chatId, input.assistantMessageId],
    payload: {
      userMessageId: input.userMessageId,
      assistantMessageId: input.assistantMessageId,
    },
  });

  await enqueueMemoryJob({
    userId: input.userId,
    type: "summarize",
    chatId: input.chatId,
    projectId: input.projectId,
    dedupeParts: ["summarize", input.chatId, input.assistantMessageId],
  });
}
