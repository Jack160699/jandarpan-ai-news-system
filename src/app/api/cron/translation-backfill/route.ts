/**
 * POST /api/cron/translation-backfill — audit, enqueue gaps, optional job drain
 *
 * Normal operation: enqueue-only (job_processor via orchestrate executes translations).
 * Processing runs on Vercel daily backup, forceProcess body, or TRANSLATION_BACKFILL_PROCESS=true.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import {
  shouldProcessTranslationBackfill,
  type TranslationBackfillTrigger,
} from "@/lib/infrastructure/cron/translation-policy";
import { JOB_HANDLERS } from "@/lib/infrastructure/jobs/handlers";
import { processJobBatch } from "@/lib/infrastructure/jobs/queue";
import {
  auditTranslationCoverage,
  enqueueMissingTranslationJobs,
  estimateTranslationPerformance,
  requeueDeadTranslationJobs,
} from "@/lib/i18n/multilingual/translation-queue";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  return handleBackfill(request);
}

export async function POST(request: NextRequest) {
  return handleBackfill(request);
}

async function handleBackfill(request: NextRequest) {
  const auth = await verifyCronRequest(request);
  if (!auth.authorized) {
    return cronAuthFailureResponse(auth);
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Supabase not configured" },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    enqueueLimit?: number;
    processLimit?: number;
    dryRun?: boolean;
    forceProcess?: boolean;
  };

  const enqueueLimit = Number(body.enqueueLimit ?? process.env.TRANSLATION_ENQUEUE_BATCH ?? 40);
  const processLimit = Number(body.processLimit ?? process.env.TRANSLATION_PROCESS_BATCH ?? 8);
  const dryRun = body.dryRun === true;

  const trigger: TranslationBackfillTrigger = body.forceProcess
    ? "manual_override"
    : auth.vercelCron
      ? "vercel_backup"
      : "scheduled_cron";

  const processGate = shouldProcessTranslationBackfill(trigger);

  const coverageBefore = await auditTranslationCoverage();
  const backlogBefore =
    coverageBefore.hiMissingEn + coverageBefore.hiMissingCg + coverageBefore.enMissingHi;

  if (dryRun) {
    const performance = await estimateTranslationPerformance(backlogBefore);
    return NextResponse.json(
      {
        ok: true,
        dryRun: true,
        trigger,
        processGate,
        coverageBefore,
        backlogBefore,
        performance,
      },
      { headers: noStoreHeaders() }
    );
  }

  const requeued = await requeueDeadTranslationJobs(25);
  const enqueue = await enqueueMissingTranslationJobs({ limit: enqueueLimit });

  let processed: Awaited<ReturnType<typeof processJobBatch>> | null = null;
  if (processGate.allowed) {
    processed = await processJobBatch(JOB_HANDLERS, {
      limit: processLimit,
      jobTypes: ["translate_article", "translation_batch"],
      workerId: "translation_backfill",
    });
  }

  const coverageAfter = await auditTranslationCoverage();
  const backlogAfter = coverageAfter.backlogTotal;
  const performance = await estimateTranslationPerformance(backlogAfter);

  return NextResponse.json(
    {
      ok: true,
      dryRun: false,
      trigger,
      processGate,
      coverageBefore,
      coverageAfter,
      backlogBefore,
      backlogAfter,
      pairs: {
        hiToEn: coverageAfter.hiMissingEn,
        hiToCg: coverageAfter.hiMissingCg,
        enToHi: coverageAfter.enMissingHi,
      },
      requeued,
      enqueued: enqueue.enqueued,
      scanned: enqueue.scanned,
      processed,
    },
    { headers: noStoreHeaders() }
  );
}
