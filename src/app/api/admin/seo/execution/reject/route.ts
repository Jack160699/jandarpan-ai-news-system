/**
 * POST /api/admin/seo/execution/reject — reject suggestions
 */

import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { rejectSuggestions, recordFeedback } from "@/lib/seo-execution/repository";
import { logExecution } from "@/lib/seo-execution/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireEditorialAuth(request, "editorial:write");
  if (!auth.ok) return auth.response;

  let body: { suggestionIds?: string[] };
  try {
    body = (await request.json()) as { suggestionIds?: string[] };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const suggestionIds = body.suggestionIds ?? [];
  if (suggestionIds.length === 0) {
    return NextResponse.json(
      { ok: false, error: "no_suggestions_selected" },
      { status: 400 }
    );
  }

  await rejectSuggestions(suggestionIds);

  for (const id of suggestionIds) {
    await recordFeedback({
      suggestionId: id,
      action: "reject",
      userId: auth.session.userId,
      userEmail: auth.session.email,
    });
  }

  logExecution("suggestion_rejected", {
    count: suggestionIds.length,
    userId: auth.session.userId,
  });

  return NextResponse.json({
    ok: true,
    rejectedCount: suggestionIds.length,
  });
}
