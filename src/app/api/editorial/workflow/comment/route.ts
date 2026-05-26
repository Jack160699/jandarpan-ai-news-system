import { NextResponse } from "next/server";
import {
  addWorkflowComment,
  fetchArticleWorkflowDetail,
} from "@/lib/editorial-workflow/store";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireEditorialAuth(request, "editorial:write");
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const articleId = url.searchParams.get("articleId");
  if (!articleId) {
    return NextResponse.json({ ok: false, error: "articleId_required" }, { status: 400 });
  }

  const detail = await fetchArticleWorkflowDetail(
    auth.session.membership.tenantId,
    articleId
  );

  if (!detail) {
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, ...detail });
}

export async function POST(request: Request) {
  const auth = await requireEditorialAuth(request, "editorial:write");
  if (!auth.ok) return auth.response;

  let body: { articleId?: string; body?: string; workflowStatus?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body.articleId || !body.body) {
    return NextResponse.json(
      { ok: false, error: "articleId_and_body_required" },
      { status: 400 }
    );
  }

  const result = await addWorkflowComment({
    session: auth.session,
    articleId: body.articleId,
    body: body.body,
    workflowStatus: body.workflowStatus,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
