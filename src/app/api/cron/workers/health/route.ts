/**
 * GET/POST /api/cron/workers/health — job queue stats + worker run health
 * No request body required
 */

import {
  cronMethodHandlers,
  handleCronHealth,
} from "@/lib/infrastructure/cron/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST } = cronMethodHandlers(handleCronHealth);
