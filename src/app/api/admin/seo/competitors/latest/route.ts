/**
 * GET /api/admin/seo/competitors/latest — latest collected competitor articles
 */

import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { listLatestCompetitorArticles } from "@/lib/competitor-intelligence/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireEditorialAuth(request, "analytics:read");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get("limit") ?? 50) || 50)
  );

  const articles = await listLatestCompetitorArticles(limit);

  return NextResponse.json({
    ok: true,
    articles,
    count: articles.length,
    timestamp: new Date().toISOString(),
  });
}
