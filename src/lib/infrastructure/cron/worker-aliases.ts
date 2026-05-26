/**
 * Cron worker path aliases — kebab-case URLs for external schedulers
 */

import type { WorkerId } from "@/lib/infrastructure/workers/types";

export const CRON_WORKER_IDS: WorkerId[] = [
  "ingest",
  "ai_enrich",
  "editorial_generate",
  "editorial_images",
  "job_processor",
  "intelligence_embed",
  "intelligence_snapshot",
  "analytics_aggregate",
  "dam_analyze",
  "event_cluster",
];

/** Public slug → internal worker id */
export const CRON_WORKER_ALIASES: Record<string, WorkerId> = {
  embeddings: "intelligence_embed",
  embed: "intelligence_embed",
  intelligence_embed: "intelligence_embed",
  "intelligence-embed": "intelligence_embed",
  "intelligence-snapshot": "intelligence_snapshot",
  intelligence_snapshot: "intelligence_snapshot",
  snapshot: "intelligence_snapshot",
  jobs: "job_processor",
  ingest: "ingest",
  ai_enrich: "ai_enrich",
  editorial_generate: "editorial_generate",
  editorial_images: "editorial_images",
  job_processor: "job_processor",
  analytics_aggregate: "analytics_aggregate",
  dam_analyze: "dam_analyze",
  event_cluster: "event_cluster",
};

export function resolveCronWorkerId(name: string): WorkerId | null {
  const key = name.trim().toLowerCase();
  const aliased = CRON_WORKER_ALIASES[key];
  if (aliased) return aliased;
  if (CRON_WORKER_IDS.includes(key as WorkerId)) return key as WorkerId;
  return null;
}
