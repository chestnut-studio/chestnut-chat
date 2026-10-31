import { serve } from "@hono/node-server";
import { withMemoryJobNotifier } from "@chestnut-chat/api/memory/queue";
import { env } from "@chestnut-chat/env/server";

import { app } from "./app";
import { startMemoryWorker, wakeMemoryWorker } from "./memory/worker";

serve(
  {
    fetch: (request, ...args) =>
      withMemoryJobNotifier(
        async () => wakeMemoryWorker(),
        () => app.fetch(request, ...args),
      ),
    port: env.PORT,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
    startMemoryWorker();
  },
);
