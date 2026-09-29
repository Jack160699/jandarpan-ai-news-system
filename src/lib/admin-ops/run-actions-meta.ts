/** Client-safe description of the run-now actions (no server imports). Execution lives in run-actions.ts. */

export const RUN_ACTION_IDS = [
  "ingest",
  "editorial",
  "retry_failed",
  "reprocess_stale",
  "refresh_rankings",
  "refresh_analytics",
  "voice_test",
] as const;
export type RunActionId = (typeof RUN_ACTION_IDS)[number];

export const RUN_ACTION_META: Record<RunActionId, { label: string; description: string }> = {
  ingest: {
    label: "Run ingestion now",
    description: "Fetch RSS + NewsData + GNews, normalise, dedupe and store signals.",
  },
  editorial: {
    label: "Run editorial generation now",
    description: "Generate, validate and publish articles from fresh events.",
  },
  retry_failed: {
    label: "Retry failed editorial jobs",
    description:
      "Re-queue transient failures (quota/timeout/database). Quality, geo, stale and duplicate rejections stay terminal.",
  },
  reprocess_stale: {
    label: "Reprocess stale queue",
    description: "Reject queue items older than 48h and close orphaned editorial jobs.",
  },
  refresh_rankings: {
    label: "Refresh rankings",
    description: "Invalidate homepage, latest and district caches so ranking is recomputed.",
  },
  refresh_analytics: {
    label: "Refresh analytics",
    description: "Drain the worker-job queue (analytics aggregation, snapshots, embeddings).",
  },
  voice_test: {
    label: "Generate voice test samples",
    description: "Hindi + English, breaking + normal bulletin via Google TTS; audition them in the Voice panel.",
  },
};

export function isRunActionId(v: unknown): v is RunActionId {
  return typeof v === "string" && (RUN_ACTION_IDS as readonly string[]).includes(v);
}
