/**
 * GET /api/rss-health — per-source RSS feed health dashboard
 */

import { NextResponse } from "next/server";
import { getRssHealthDashboard } from "@/lib/news/rss-health";

export const runtime = "nodejs";

function parseBearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim() || null;
  const bearer = parseBearerToken(request.headers.get("authorization"));
  const header = request.headers.get("x-cron-secret")?.trim() ?? null;

  if (cronSecret && (bearer === cronSecret || header === cronSecret)) {
    return true;
  }

  if (process.env.NODE_ENV === "development") {
    return true;
  }

  return false;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
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
