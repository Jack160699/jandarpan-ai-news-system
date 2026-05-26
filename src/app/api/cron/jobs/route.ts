/**
 * GET/POST /api/cron/jobs — drain unified worker job queue + event bus
 * No request body required (cron-job.org, GitHub Actions, curl)
 */

import {
  cronMethodHandlers,
  handleCronJobs,
} from "@/lib/infrastructure/cron/handlers";

export const runtime = "nodejs";
export const maxDuration = 120;

export const { GET, POST } = cronMethodHandlers(handleCronJobs);
