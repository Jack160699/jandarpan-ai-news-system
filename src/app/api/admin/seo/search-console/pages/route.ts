/**
 * GET /api/admin/seo/search-console/pages — top GSC pages
 */

import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { listPages } from "@/lib/gsc-intelligence/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireEditorialAuth(request, "analytics:read");
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
  const pages = await listPages(limit);

  return NextResponse.json({
    ok: true,
    pages,
    count: pages.length,
    timestamp: new Date().toISOString(),
  });
}
