/**
 * GET/POST /api/cron/worker/embeddings — vector embedding worker (alias)
 */

import {
  cronMethodHandlers,
  handleCronWorker,
} from "@/lib/infrastructure/cron/handlers";

export const runtime = "nodejs";
export const maxDuration = 120;

export const { GET, POST } = cronMethodHandlers((request) =>
  handleCronWorker(request, "embeddings")
);
