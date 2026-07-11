/**
 * GET /api/admin/seo/search-console/queries — top GSC queries
 */

import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { listQueries } from "@/lib/gsc-intelligence/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireEditorialAuth(request, "analytics:read");
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
  const queries = await listQueries(limit);

  return NextResponse.json({
    ok: true,
    queries,
    count: queries.length,
    timestamp: new Date().toISOString(),
  });
}
