/**
 * POST /api/cron/translation-backfill — audit, enqueue, and drain translation jobs
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { JOB_HANDLERS } from "@/lib/infrastructure/jobs/handlers";
import { processJobBatch } from "@/lib/infrastructure/jobs/queue";
import {
  auditTranslationCoverage,
  enqueueMissingTranslationJobs,
  estimateTranslationPerformance,
  scheduleTranslationBatchJob,
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
  };

  const enqueueLimit = Number(body.enqueueLimit ?? process.env.TRANSLATION_ENQUEUE_BATCH ?? 40);
  const processLimit = Number(body.processLimit ?? process.env.TRANSLATION_PROCESS_BATCH ?? 8);
  const dryRun = body.dryRun === true;

  const coverageBefore = await auditTranslationCoverage();
  const backlogBefore =
    coverageBefore.hiMissingEn + coverageBefore.enMissingHi;

  if (dryRun) {
    const performance = await estimateTranslationPerformance(backlogBefore);
    return NextResponse.json(
      {
        ok: true,
        dryRun: true,
        coverageBefore,
        backlogBefore,
        performance,
      },
      { headers: noStoreHeaders() }
    );
  }

  const enqueue = await enqueueMissingTranslationJobs({ limit: enqueueLimit });
  await scheduleTranslationBatchJob(null);

  const processed = await processJobBatch(JOB_HANDLERS, {
    limit: processLimit,
    jobTypes: ["translate_article", "translation_batch"],
    workerId: "translation_backfill",
  });

  const coverageAfter = await auditTranslationCoverage();
  const backlogAfter = coverageAfter.hiMissingEn + coverageAfter.enMissingHi;
  const performance = await estimateTranslationPerformance(backlogAfter);

  return NextResponse.json(
    {
      ok: true,
      dryRun: false,
      coverageBefore,
      coverageAfter,
      backlogBefore,
      backlogAfter,
      enqueued: enqueue.enqueued,
      scanned: enqueue.scanned,
      processed,
      performance,
    },
    { headers: noStoreHeaders() }
  );
}
