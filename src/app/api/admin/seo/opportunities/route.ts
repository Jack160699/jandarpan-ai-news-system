/**
 * GET /api/admin/seo/opportunities — SERP opportunity feed
 * POST — add custom keyword to tracker
 */

import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { isValidKeyword, normalizeKeyword } from "@/lib/serp-intelligence/keywords";
import { listOpportunities, addCustomKeyword } from "@/lib/serp-intelligence/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireEditorialAuth(request, "analytics:read");
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);
  const opportunities = await listOpportunities(limit);

  return NextResponse.json({
    ok: true,
    opportunities,
    count: opportunities.length,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  const auth = await requireEditorialAuth(request, "analytics:read");
  if (!auth.ok) return auth.response;

  let body: { keyword?: string; group_name?: string };
  try {
    body = (await request.json()) as { keyword?: string; group_name?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const keyword = normalizeKeyword(body.keyword ?? "");
  const groupName = (body.group_name ?? "Custom").trim() || "Custom";

  if (!isValidKeyword(keyword)) {
    return NextResponse.json({ ok: false, error: "invalid_keyword" }, { status: 400 });
  }

  const record = await addCustomKeyword(keyword, groupName);
  if (!record) {
    return NextResponse.json({ ok: false, error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, keyword: record });
}
