import type { DehydratedState, VueQueryPluginOptions } from "@tanstack/vue-query";
import { dehydrate, hydrate, QueryCache, QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { toast } from "vue-sonner";

function isUnauthorizedError(error: unknown) {
  const details = error as {
    code?: unknown;
    data?: unknown;
    message?: unknown;
    status?: unknown;
  };
  const data =
    typeof details.data === "object" && details.data
      ? (details.data as { code?: unknown; status?: unknown })
      : null;
  const message = typeof details.message === "string" ? details.message.toLowerCase() : "";

  return (
    details.code === "UNAUTHORIZED" ||
    details.status === 401 ||
    data?.code === "UNAUTHORIZED" ||
    data?.status === 401 ||
    message.includes("unauthorized") ||
    message.includes("not authorized")
  );
}

export default defineNuxtPlugin((nuxt) => {
  const vueQueryState = useState<DehydratedState | null>("vue-query");

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5_000,
      },
    },
    queryCache: new QueryCache({
      onError: (error) => {
        if (isUnauthorizedError(error)) return;

        console.error(error);
        if (import.meta.client) {
          toast.error("Error", {
            description: error?.message || "An unexpected error occurred.",
          });
        }
      },
    }),
  });
  const options: VueQueryPluginOptions = { queryClient };

  nuxt.vueApp.use(VueQueryPlugin, options);

  if (import.meta.server) {
    nuxt.hooks.hook("app:rendered", () => {
      vueQueryState.value = dehydrate(queryClient);
    });
  }

  if (import.meta.client) {
    nuxt.hooks.hook("app:created", () => {
      hydrate(queryClient, vueQueryState.value);
    });
  }
});
