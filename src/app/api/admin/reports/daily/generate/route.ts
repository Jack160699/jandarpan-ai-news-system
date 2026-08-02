/**
 * POST /api/admin/reports/daily/generate
 * Body: { date?: "YYYY-MM-DD" } (optional; defaults to yesterday's IST day,
 * same default as the cron job — see generateDailyReport's doc comment).
 *
 * Emergency/manual fallback for the Daily Newsroom Audit Report — normal
 * generation is the 02:00 IST cron plus the dashboard catch-up trigger (see
 * GET /api/admin/reports/daily), neither of which needs a human. Runs the
 * exact same generateDailyReport() pipeline (see
 * src/lib/newsroom-audit/generate.ts) with force:true so it always produces
 * a fresh run — no duplicated report-building logic.
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
  // Manual trigger is the emergency/on-demand fallback (normal generation is
  // the 02:00 IST cron + the dashboard catch-up trigger) — always force a
  // fresh run so operators can regenerate a report they believe is wrong,
  // rather than silently no-op'ing against an existing final report.
  const result = await generateDailyReport(reportDate, { force: true });

  return NextResponse.json(result, {
    status: result.ok ? 200 : 500,
    headers: noStoreHeaders(),
  });
}
