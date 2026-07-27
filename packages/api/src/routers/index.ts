import type { RouterClient } from "@orpc/server";

import { publicProcedure } from "../index";
import { chatRouter } from "./chat";
import { projectRouter } from "./project";
import { providersRouter } from "./providers";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  chat: chatRouter,
  project: projectRouter,
  providers: providersRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
