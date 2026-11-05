import { createTRPCClient, httpLink } from "@trpc/client";
import type { AppRouter } from "@/server/tasks-router";

export const trpcClient = createTRPCClient<AppRouter>({
  links: [httpLink({ url: "/api/trpc" })],
});
