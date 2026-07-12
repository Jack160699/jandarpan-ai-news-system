/**
 * POST /api/admin/seo/execution/apply — apply editor-approved suggestions
 */

import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { isSeoExecutionEngineEnabled } from "@/lib/seo-execution/config";
import { applyApprovedSuggestions } from "@/lib/seo-execution/apply-engine";
import {
  approveSuggestions,
  getPendingSuggestionsForJob,
  getSuggestionsByIds,
  recordFeedback,
} from "@/lib/seo-execution/repository";
import { logExecution } from "@/lib/seo-execution/logger";
import { createAdminServerClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireEditorialAuth(request, "editorial:write");
  if (!auth.ok) return auth.response;

  if (!isSeoExecutionEngineEnabled()) {
    return NextResponse.json(
      { ok: false, error: "engine_disabled" },
      { status: 403 }
    );
  }

  let body: {
    suggestionIds?: string[];
    jobId?: string;
    approveAll?: boolean;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  let suggestionIds = body.suggestionIds ?? [];

  if (body.approveAll && body.jobId) {
    const pending = await getPendingSuggestionsForJob(body.jobId);
    suggestionIds = pending.map((s) => s.id);
    await approveSuggestions(suggestionIds);
  } else if (suggestionIds.length > 0) {
    await approveSuggestions(suggestionIds);
  }

  if (suggestionIds.length === 0) {
    return NextResponse.json(
      { ok: false, error: "no_suggestions_selected" },
      { status: 400 }
    );
  }

  const suggestions = await getSuggestionsByIds(suggestionIds);
  const approved = suggestions.map((s) => ({ ...s, status: "approved" as const }));

  const articleId = suggestions[0]?.generated_article_id;
  const jobId = suggestions[0]?.job_id;
  if (!articleId || !jobId) {
    return NextResponse.json({ ok: false, error: "invalid_suggestions" }, { status: 400 });
  }

  const { data: jobRow } = await createAdminServerClient()
    .from("seo_execution_jobs" as never)
    .select("article_slug")
    .eq("id", jobId)
    .maybeSingle();
  const articleSlug = (jobRow as { article_slug?: string } | null)?.article_slug ?? articleId;

  const result = await applyApprovedSuggestions({
    articleId,
    articleSlug,
    jobId,
    suggestions: approved,
    appliedBy: auth.session.userId,
    appliedByEmail: auth.session.email,
  });

  for (const id of suggestionIds) {
    await recordFeedback({
      suggestionId: id,
      jobId,
      articleId,
      action: "apply",
      userId: auth.session.userId,
      userEmail: auth.session.email,
    });
  }

  logExecution("suggestion_applied", {
    count: result.appliedCount,
    userId: auth.session.userId,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.errors[0] ?? "apply_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    appliedCount: result.appliedCount,
    historyId: result.historyId,
  });
}
