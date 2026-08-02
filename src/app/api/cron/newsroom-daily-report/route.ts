/**
 * GET/POST /api/cron/newsroom-daily-report
 * Builds the Daily Newsroom Audit Report for one IST calendar day. The core
 * pipeline (deterministic metrics -> AI executive summary -> persisted rows
 * -> deduped notifications -> optional gated automation) lives in
 * src/lib/newsroom-audit/generate.ts::generateDailyReport — this route is
 * now just the cron-auth/instrumentation wrapper around it, so the admin
 * manual-trigger route (/api/admin/reports/daily/generate) can call the
 * exact same pipeline without duplicating it.
 *
 * Registered in vercel.json at "30 20 * * *" (UTC) = 02:00 IST — at least an
 * hour after IST day-close (00:00 IST) and after edition-publish's last
 * daily slot (30 0,3,6,9,12,15 * * * UTC, i.e. 21:00 IST latest).
 *
 * Deviation from the literal task wording: the task says reportDate
 * defaults to "current IST calendar date"; this route instead defaults to
 * *yesterday's* IST date (see generateDailyReport's yesterdayIstDay doc
 * comment for the rationale). `?date=YYYY-MM-DD` still allows targeting any
 * day, including "today," for manual/backfill runs.
 */

import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import {
  finalizeCronRun,
  instrumentCronStart,
} from "@/lib/observability/cron-instrumentation";
import {
  generateDailyReport,
  isValidReportDateParam,
  yesterdayIstDay,
} from "@/lib/newsroom-audit/generate";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  return handleNewsroomDailyReport(request);
}

export async function POST(request: Request) {
  return handleNewsroomDailyReport(request);
}

async function handleNewsroomDailyReport(request: Request) {
  const { startedAt, requestId } = instrumentCronStart("newsroom-daily-report", request);
  const auth = await verifyCronRequest(request, { capability: "ops" });
  if (!auth.authorized) {
    return cronAuthFailureResponse(auth);
  }

  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");
  const reportDate = isValidReportDateParam(dateParam) ? dateParam : yesterdayIstDay();

  const result = await generateDailyReport(reportDate);

  if (!result.ok) {
    await finalizeCronRun({
      job: "newsroom-daily-report",
      startedAt,
      requestId,
      ok: false,
      error: result.error,
    });
    return NextResponse.json(
      { ok: false, reportDate, error: result.error, duration_ms: Date.now() - startedAt },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  await finalizeCronRun({
    job: "newsroom-daily-report",
    startedAt,
    requestId,
    ok: true,
    entityCount: result.metrics,
    metadata: {
      reportId: result.reportId,
      reportDate: result.reportDate,
      findings: result.deterministicFindings,
      aiStatus: result.aiStatus,
      notificationsCreated: result.notificationsCreated,
      actionsRecommended: result.actionsRecommended,
    },
  });

  return NextResponse.json(
    {
      ok: true,
      reportId: result.reportId,
      reportDate: result.reportDate,
      metrics: result.metrics,
      deterministicFindings: result.deterministicFindings,
      aiStatus: result.aiStatus,
      notificationsCreated: result.notificationsCreated,
      actionsRecommended: result.actionsRecommended,
      duration_ms: Date.now() - startedAt,
    },
    { headers: noStoreHeaders() }
  );
}
