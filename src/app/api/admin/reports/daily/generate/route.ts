/**
 * POST /api/admin/reports/daily/generate
 * Body: { date?: "YYYY-MM-DD" } (optional; defaults to yesterday's IST day,
 * same default as the cron job — see generateDailyReport's doc comment).
 *
 * Manual trigger for the Daily Newsroom Audit Report. Runs the exact same
 * generateDailyReport() pipeline the newsroom-daily-report cron uses (see
 * src/lib/newsroom-audit/generate.ts) — no duplicated report-building logic.
 *
 * Permission: monitoring:read, matching this page's own view permission.
 * No existing "run this now" admin route in this repo (schema health
 * re-check, PostgREST reload) requires anything past its own view-level
 * permission, so this stays consistent with that precedent. This action
 * does consume AI provider spend/compute (analyzeDailyReport calls the
 * free-first provider chain), so if abuse becomes a concern, tighten this
 * to a stricter permission first.
 */

import { NextResponse } from "next/server";
import { requireDashboardSession } from "@/lib/saas-auth/guard";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import {
  generateDailyReport,
  isValidReportDateParam,
  yesterdayIstDay,
} from "@/lib/newsroom-audit/generate";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = await requireDashboardSession(request, "monitoring:read");
  if (!guard.ok) return guard.response;

  let body: { date?: string } = {};
  try {
    body = (await request.json()) as { date?: string };
  } catch {
    body = {};
  }

  const reportDate = isValidReportDateParam(body.date) ? body.date : yesterdayIstDay();
  const result = await generateDailyReport(reportDate);

  return NextResponse.json(result, {
    status: result.ok ? 200 : 500,
    headers: noStoreHeaders(),
  });
}
