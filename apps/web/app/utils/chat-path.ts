/** Build the canonical path for a chat, nested under its project when present. */
export function chatPath(chat: { id: string; projectId?: string | null }) {
  if (chat.projectId) return `/${chat.projectId}/${chat.id}`;
  return `/chat/${chat.id}`;
}

export function projectPath(projectId: string) {
  return `/${projectId}`;
}
