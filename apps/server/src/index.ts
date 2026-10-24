import { serve } from "@hono/node-server";
import { env } from "@chestnut-chat/env/server";

import { app } from "./app";
import { startMemoryWorker } from "./memory/worker";

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
    startMemoryWorker();
  },
);
