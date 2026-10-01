/**
 * translation-worker spec: translation gap enqueue + a small bounded translate batch.
 * Wraps EXISTING pipeline code only (no logic is reimplemented).
 */

import { processJobBatch } from "@/lib/infrastructure/jobs/queue";
import { TRANSLATION_HANDLERS } from "@/lib/infrastructure/jobs/translation-handlers";
import { enqueueMissingTranslationJobs, requeueDeadTranslationJobs } from "@/lib/i18n/multilingual/translation-queue";
import { createExecutionDeadline } from "@/lib/serverless/deadline";
import type { WorkerSpec } from "@/lib/edge/worker-kit/kit";

const asInt = (v: unknown, fallback: number, min: number, max: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.floor(n))) : fallback;
};

export type TranslationParams = { enqueueLimit: number; processLimit: number };

export const TRANSLATION_SPEC: WorkerSpec<TranslationParams> = {
  job: "translation-backfill",
  parse(body, env) {
    return {
      ok: true,
      params: {
        enqueueLimit: asInt(body.enqueue_limit, asInt(env.TRANSLATION_ENQUEUE_BATCH, 40, 1, 200), 1, 200),
        processLimit: asInt(body.process_limit, asInt(env.TRANSLATION_PROCESS_BATCH, 5, 1, 12), 1, 12),
      },
      leaseKey: "edge-translation",
      label: {},
    };
  },
  async run({ params }) {
    const deadline = createExecutionDeadline(100_000);
    const requeued = await requeueDeadTranslationJobs(25);
    const enqueue = await enqueueMissingTranslationJobs({ limit: params.enqueueLimit });
    const processed = await processJobBatch(TRANSLATION_HANDLERS, {
      limit: params.processLimit,
      jobTypes: ["translate_article", "translation_batch"],
      workerId: "edge_translation",
      oldestFirst: true,
      deadline,
    });
    const failed = processed.failed + processed.dead;
    return {
      ok: failed === 0 || processed.completed > 0,
      degraded: failed > 0,
      processed: processed.completed,
      failed,
      details: { requeued, enqueued: enqueue.enqueued, scanned: enqueue.scanned, ...processed },
    };
  },
};
