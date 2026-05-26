/**
 * GET/POST /api/cron/worker/intelligence-snapshot — snapshot precompute worker (alias)
 */

import {
  cronMethodHandlers,
  handleCronWorker,
} from "@/lib/infrastructure/cron/handlers";

export const runtime = "nodejs";
export const maxDuration = 120;

export const { GET, POST } = cronMethodHandlers((request) =>
  handleCronWorker(request, "intelligence-snapshot")
);
