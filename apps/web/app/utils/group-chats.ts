export type ChatRow = {
  id: string;
  title: string;
  pinned: boolean;
  archived: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type ChatGroup = {
  key: "pinned" | "today" | "yesterday" | "week" | "month" | "earlier";
  chats: ChatRow[];
};

const DAY = 24 * 60 * 60 * 1000;

export function groupChats(chats: ChatRow[]): ChatGroup[] {
  const visible = chats.filter((chat) => !chat.archived);
  const pinned = visible.filter((chat) => chat.pinned);
  const rest = visible.filter((chat) => !chat.pinned);
  const now = Date.now();
  const buckets: Record<ChatGroup["key"], ChatRow[]> = {
    pinned,
    today: [],
    yesterday: [],
    week: [],
    month: [],
    earlier: [],
  };

  for (const row of rest) {
    const diff = now - new Date(row.updatedAt).getTime();
    if (diff < DAY) buckets.today.push(row);
    else if (diff < 2 * DAY) buckets.yesterday.push(row);
    else if (diff < 7 * DAY) buckets.week.push(row);
    else if (diff < 30 * DAY) buckets.month.push(row);
    else buckets.earlier.push(row);
  }

  return (["pinned", "today", "yesterday", "week", "month", "earlier"] as const)
    .map((key) => ({ key, chats: buckets[key] }))
    .filter((group) => group.chats.length);
}
