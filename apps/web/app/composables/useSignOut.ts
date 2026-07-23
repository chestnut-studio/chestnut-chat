import { toast } from "vue-sonner";

export function useSignOut() {
  const { $authClient } = useNuxtApp();
  const authSession = useAuthSession();
  const { t } = useI18n();

  return async function signOut() {
    await $authClient.signOut({
      fetchOptions: {
        onSuccess: async () => {
          authSession.clear();
          toast.success(t("toast.signedOut"));
          await navigateTo("/", { replace: true, external: true });
        },
        onError: (error) => {
          toast.error(t("toast.signOutFailed"), { description: error?.error?.message });
        },
      },
    });
  };
}
