/**
 * GET /api/admin/seo/keywords — SERP keyword groups
 */

import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { groupKeywordsByCategory } from "@/lib/serp-intelligence/keywords";
import { listKeywords } from "@/lib/serp-intelligence/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireEditorialAuth(request, "analytics:read");
  if (!auth.ok) return auth.response;

  const keywords = await listKeywords();
  const groups = groupKeywordsByCategory(
    keywords.map((k) => ({ keyword: k.keyword, group_name: k.group_name }))
  );

  return NextResponse.json({
    ok: true,
    keywords,
    groups,
    count: keywords.length,
    timestamp: new Date().toISOString(),
  });
}
