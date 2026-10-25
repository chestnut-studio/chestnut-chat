import type { AppRouterClient } from "@chestnut-chat/api/routers/index";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const serverUrl = (import.meta.server && config.serverUrl) || config.public.serverUrl;
  // RPCLink calls `new URL(url)`, which rejects relative paths like "/rpc".
  const origin = serverUrl || useRequestURL().origin;
  const rpcUrl = `${origin.replace(/\/+$/, "")}/rpc`;

  const rpcLink = new RPCLink({
    url: rpcUrl,
    fetch(url, options) {
      return fetch(url, {
        ...options,
        credentials: "include",
      });
    },
  });

  const client: AppRouterClient = createORPCClient(rpcLink);
  const orpcUtils = createTanstackQueryUtils(client);

  return {
    provide: {
      orpc: orpcUtils,
    },
  };
});
