/**
 * GET /api/admin/daily-inventory
 *
 * Returns the current IST day's published story count and whether the 50+ target is met.
 * Also returns pipeline-pending count and pool total for end-to-end visibility.
 *
 * IST = Asia/Kolkata = UTC+05:30
 * Start of IST day X at 00:00 IST = previous UTC day at 18:30:00 UTC.
 * Example: 2026-09-28 00:00 IST = 2026-09-27 18:30:00 UTC.
 *
 * Public (read-only, no PII exposed). Cache: no-store (always real-time).
 */

import { NextResponse } from "next/server";
import { createAdminServerClient } from "@/lib/supabase";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";

export const runtime = "nodejs";
export const maxDuration = 15;

export const DAILY_INVENTORY_TARGET = 50;

/** Asia/Kolkata offset: UTC+05:30 = 19800 seconds = 5.5 × 3600 × 1000 ms */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Returns the UTC timestamp corresponding to midnight (00:00:00.000) on the
 * current day in Asia/Kolkata (IST = UTC+05:30).
 *
 * Steps:
 *  1. Shift nowUtc forward by IST_OFFSET_MS → get "IST wall clock" as a UTC Date object.
 *  2. Zero that object to midnight in the shifted frame.
 *  3. Shift back by IST_OFFSET_MS → UTC timestamp of 00:00 IST.
 */
function startOfIstDayUtc(nowUtc: Date): Date {
  const istNow = new Date(nowUtc.getTime() + IST_OFFSET_MS);
  const istMidnightMs = Date.UTC(
    istNow.getUTCFullYear(),
    istNow.getUTCMonth(),
    istNow.getUTCDate(),
    0, 0, 0, 0
  );
  return new Date(istMidnightMs - IST_OFFSET_MS);
}

export async function GET() {
  const supabase = createAdminServerClient();

  const nowUtc = new Date();
  const windowStart = startOfIstDayUtc(nowUtc);
  const istNow = new Date(nowUtc.getTime() + IST_OFFSET_MS);
  const istDateLabel = istNow.toISOString().slice(0, 10); // e.g. "2026-09-28"

  // Count articles in the public editorial pool published today (IST window).
  // Uses editorial_status IN ('approved','published','live') — matches fetchGeneratedArticlePool.
  const { count: todayCount, error: todayErr } = await supabase
    .from("generated_articles")
    .select("id", { count: "exact", head: true })
    .in("editorial_status", ["approved", "published", "live"])
    .not("published_at", "is", null)
    .gte("published_at", windowStart.toISOString());

  // Total pool size (all dates, last 30 days is enforced by retention job)
  const { count: poolTotal, error: poolErr } = await supabase
    .from("generated_articles")
    .select("id", { count: "exact", head: true })
    .in("editorial_status", ["approved", "published", "live"])
    .not("published_at", "is", null);

  // Pending AI generation queue depth
  const { count: pendingAi, error: pendingErr } = await supabase
    .from("news_ai_queue")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (todayErr) {
    return NextResponse.json(
      { ok: false, error: todayErr.message },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  const count = todayCount ?? 0;
  const target = DAILY_INVENTORY_TARGET;
  const gap = Math.max(0, target - count);

  return NextResponse.json(
    {
      ok: true,
      todayCount: count,
      target,
      gap,
      met: count >= target,
      // IST context (Asia/Kolkata = UTC+05:30)
      istDate: istDateLabel,
      istNow: istNow.toISOString(),
      windowStart: windowStart.toISOString(),
      windowStartIst: new Date(windowStart.getTime() + IST_OFFSET_MS).toISOString(),
      // Pipeline context
      poolTotal: poolTotal ?? null,
      pendingAiQueue: pendingAi ?? null,
      poolQueryError: poolErr?.message ?? null,
      pendingQueryError: pendingErr?.message ?? null,
    },
    { headers: noStoreHeaders() }
  );
}
