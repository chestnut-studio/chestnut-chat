import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/vue";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const headers = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;

  const authClient = createAuthClient({
    baseURL: (import.meta.server && config.serverUrl) || config.public.serverUrl,
    fetchOptions: {
      headers,
    },
    plugins: [emailOTPClient()],
    sessionOptions: {
      refetchOnWindowFocus: false,
    },
  });

  return {
    provide: {
      authClient: authClient,
    },
  };
});
