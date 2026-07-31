import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { toast } from "vue-sonner";

export type ProjectRow = {
  id: string;
  name: string;
  iconKind: "emoji" | "lucide";
  iconValue: string;
  iconColor: string;
  memoryMode: "default" | "project";
  instructions: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type ProjectFormInput = {
  name: string;
  iconKind: "emoji" | "lucide";
  iconValue: string;
  iconColor: string;
  memoryMode: "default" | "project";
  instructions?: string | null;
};

export function useProjects() {
  const { $orpc } = useNuxtApp();
  const authSession = useAuthSession();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const config = useRuntimeConfig();
  const listQueryKey = $orpc.project.list.queryKey();
  const list = useQuery(
    computed(() => ({
      ...$orpc.project.list.queryOptions(),
      enabled: authSession.isAuthenticated,
    })),
  );
  const { invalidate: invalidateChats } = useChats();

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: listQueryKey });
    await invalidateChats();
  };

  const create = useMutation({
    ...$orpc.project.create.mutationOptions(),
    onSuccess: invalidate,
  });

  const update = useMutation({
    ...$orpc.project.update.mutationOptions(),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    ...$orpc.project.delete.mutationOptions(),
    onSuccess: invalidate,
  });

  const deleteFile = useMutation({
    ...$orpc.project.deleteFile.mutationOptions(),
  });

  async function uploadFiles(projectId: string, files: File[]) {
    if (!files.length) {
      return {
        succeeded: 0,
        failed: 0,
        results: [] as Array<{ filename: string; ok: boolean; error?: string }>,
      };
    }

    const form = new FormData();
    for (const file of files) form.append("files", file);

    const response = await fetch(`${config.public.serverUrl}/ai/projects/${projectId}/files`, {
      method: "POST",
      credentials: "include",
      body: form,
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      message?: string;
      succeeded?: number;
      failed?: number;
      results?: Array<{ filename: string; ok: boolean; error?: string }>;
    } | null;

    if (!response.ok) {
      throw new Error(payload?.message || payload?.error || t("project.uploadFailed"));
    }

    return {
      succeeded: payload?.succeeded ?? 0,
      failed: payload?.failed ?? 0,
      results: payload?.results ?? [],
    };
  }

  async function createWithFiles(input: ProjectFormInput, files: File[]) {
    const created = await create.mutateAsync(input);
    if (files.length) {
      try {
        const upload = await uploadFiles(created.project.id, files);
        for (const result of upload.results) {
          if (!result.ok) {
            toast.error(t("project.fileFailed", { name: result.filename }), {
              description: result.error,
            });
          }
        }
      } catch (error) {
        toast.error(t("project.uploadFailed"), {
          description: error instanceof Error ? error.message : undefined,
        });
      }
    }
    await invalidate();
    return created;
  }

  return {
    list,
    create,
    update,
    remove,
    deleteFile,
    uploadFiles,
    createWithFiles,
    invalidate,
  };
}
