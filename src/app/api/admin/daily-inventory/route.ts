/**
 * GET /api/admin/daily-inventory
 *
 * Returns the current day's published story count and whether the 50+ target is met.
 * Used by the editorial pipeline to assess whether top-up sourcing is required.
 *
 * Public (read-only, no auth required — no PII exposed).
 * Cache: no-store (always real-time).
 */

import { NextResponse } from "next/server";
import { createAdminServerClient } from "@/lib/supabase";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";

export const runtime = "nodejs";
export const maxDuration = 15;

export const DAILY_INVENTORY_TARGET = 50;

export async function GET() {
  const supabase = createAdminServerClient();

  // IST is UTC+5:30; get start of today in IST = UTC-330min
  const nowUtc = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(nowUtc.getTime() + istOffsetMs);
  const startOfIstDay = new Date(
    Date.UTC(
      istNow.getUTCFullYear(),
      istNow.getUTCMonth(),
      istNow.getUTCDate()
    ) - istOffsetMs
  );

  const { count, error } = await supabase
    .from("generated_articles")
    .select("id", { count: "exact", head: true })
    .eq("workflow_status", "published")
    .gte("published_at", startOfIstDay.toISOString());

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  const todayCount = count ?? 0;
  const target = DAILY_INVENTORY_TARGET;
  const gap = Math.max(0, target - todayCount);

  return NextResponse.json(
    {
      ok: true,
      todayCount,
      target,
      gap,
      met: todayCount >= target,
      istDate: istNow.toISOString().slice(0, 10),
      windowStart: startOfIstDay.toISOString(),
    },
    { headers: noStoreHeaders() }
  );
}
