import type { auth } from "@chestnut-chat/auth";

let clientRefreshPromise: Promise<void> | null = null;

export type AuthSessionData = typeof auth.$Infer.Session | null;
type AuthSessionError =
  | {
      message?: string;
      status: number;
      statusText: string;
    }
  | Error
  | null;

export function useAuthSession() {
  const { $authClient } = useNuxtApp();

  const data = useState<AuthSessionData>("auth-session:data", () => null);
  const error = useState<AuthSessionError>("auth-session:error", () => null);
  const initialized = useState("auth-session:initialized", () => false);
  const isPending = useState("auth-session:pending", () => false);

  async function refresh() {
    if (import.meta.client && clientRefreshPromise) {
      await clientRefreshPromise;
      return data.value;
    }

    isPending.value = true;
    const refreshRequest = $authClient
      .getSession()
      .then((result) => {
        data.value = result.data;
        error.value = result.error;
        initialized.value = true;
      })
      .catch((cause) => {
        data.value = null;
        error.value = cause as AuthSessionError;
        initialized.value = true;
      })
      .finally(() => {
        isPending.value = false;
        if (import.meta.client) {
          clientRefreshPromise = null;
        }
      });

    if (import.meta.client) {
      clientRefreshPromise = refreshRequest;
    }

    await refreshRequest;
    return data.value;
  }

  async function ensure() {
    if (!initialized.value) {
      return refresh();
    }

    return data.value;
  }

  function clear() {
    data.value = null;
    error.value = null;
    initialized.value = true;
    isPending.value = false;
  }

  return reactive({
    data: readonly(data),
    error: readonly(error),
    initialized: readonly(initialized),
    isPending: readonly(isPending),
    refresh,
    ensure,
    clear,
  });
}
