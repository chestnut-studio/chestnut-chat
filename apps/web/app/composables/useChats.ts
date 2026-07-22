import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

export function useChats() {
  const { $orpc } = useNuxtApp();
  const queryClient = useQueryClient();
  const listQueryKey = $orpc.chat.list.queryKey();
  const list = useQuery($orpc.chat.list.queryOptions());
  const invalidate = () => queryClient.invalidateQueries({ queryKey: listQueryKey });

  function applyTitle(chatId: string, title: string) {
    queryClient.setQueryData(listQueryKey, (chats) => {
      if (!Array.isArray(chats)) return chats;
      return chats.map((chat) => (chat.id === chatId ? { ...chat, title } : chat));
    });
  }

  const create = useMutation({
    ...$orpc.chat.create.mutationOptions(),
    onSuccess: invalidate,
  });
  const rename = useMutation({
    ...$orpc.chat.rename.mutationOptions(),
    onSuccess: invalidate,
  });
  const setPinned = useMutation({
    ...$orpc.chat.setPinned.mutationOptions(),
    onSuccess: invalidate,
  });
  const setArchived = useMutation({
    ...$orpc.chat.setArchived.mutationOptions(),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    ...$orpc.chat.delete.mutationOptions(),
    onSuccess: invalidate,
  });

  return { list, create, rename, setPinned, setArchived, remove, invalidate, applyTitle };
}
