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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireEditorialAuth(request, "analytics:read");
  if (!auth.ok) return auth.response;

  const tenantId = auth.session.membership.tenantId;
  const snapshot = await buildNewsroomIntelligenceSnapshot(tenantId);

  if (!snapshot) {
    return NextResponse.json(
      { ok: false, error: "Database not configured" },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true, ...snapshot });
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
