/**
 * GET /api/editorial/intelligence — full AI newsroom intelligence snapshot
 * POST — enrich single article intelligence metadata
 */

import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import {
  buildNewsroomIntelligenceSnapshot,
  enrichArticleIntelligence,
} from "@/lib/intelligence";
import { checkRateLimit, rateLimitHeaders } from "@/lib/infrastructure/cache/rate-limit";
import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import {
  getCachedIntelligenceSnapshot,
  isSnapshotStale,
  requestSnapshotRefresh,
} from "@/lib/intelligence/snapshot-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireEditorialAuth(request, "analytics:read");
  if (!auth.ok) return auth.response;

  const tenantId = auth.session.membership.tenantId;

  const rate = await checkRateLimit({
    key: `intel:${tenantId}:${auth.session.userId}`,
    limit: INFRA_CONFIG.apiRateLimitPerMinute,
    windowSec: 60,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limit_exceeded" },
      {
        status: 429,
        headers: rateLimitHeaders(rate, INFRA_CONFIG.apiRateLimitPerMinute),
      }
    );
  }

  const { snapshot: cached, meta } =
    await getCachedIntelligenceSnapshot(tenantId);

  if (cached && meta && !isSnapshotStale(meta)) {
    return NextResponse.json({
      ok: true,
      ...cached,
      _cache: { source: meta.source, builtAt: meta.builtAt, ageMs: meta.ageMs },
    });
  }

  if (cached && meta) {
    void requestSnapshotRefresh(tenantId);
    return NextResponse.json({
      ok: true,
      ...cached,
      _cache: {
        source: "stale",
        builtAt: meta.builtAt,
        ageMs: meta.ageMs,
        refreshEnqueued: true,
      },
    });
  }

  void requestSnapshotRefresh(tenantId);

  const snapshot = await buildNewsroomIntelligenceSnapshot(tenantId, {
    mode: "read",
  });

  if (!snapshot) {
    return NextResponse.json(
      { ok: false, error: "Database not configured" },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ok: true,
    ...snapshot,
    _cache: { source: "live_fast", builtAt: snapshot.fetchedAt },
  });
}

export async function POST(request: Request) {
  const auth = await requireEditorialAuth(request, "editorial:write");
  if (!auth.ok) return auth.response;

  let body: { articleId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body.articleId) {
    return NextResponse.json(
      { ok: false, error: "articleId required" },
      { status: 400 }
    );
  }

  const result = await enrichArticleIntelligence(body.articleId);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
