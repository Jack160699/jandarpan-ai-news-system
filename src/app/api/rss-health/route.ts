/**
 * GET /api/rss-health — per-source RSS feed health dashboard
 */

import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { getRssHealthDashboard } from "@/lib/news/rss-health";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = verifyCronRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const sources = await getRssHealthDashboard();

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    totalSources: sources.length,
    healthyCount: sources.filter((s) => s.healthy).length,
    sources,
  });
}
