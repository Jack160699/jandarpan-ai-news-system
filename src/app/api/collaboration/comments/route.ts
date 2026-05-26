import { NextResponse } from "next/server";
import { addInlineComment, listInlineComments } from "@/lib/collaboration/store";
import { requireDashboardSession } from "@/lib/saas-auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireDashboardSession(request, "editorial:write");
  if (!guard.ok) return guard.response;

  const articleId = new URL(request.url).searchParams.get("articleId");
  if (!articleId) {
    return NextResponse.json(
      { ok: false, error: "articleId required" },
      { status: 400 }
    );
  }

  const comments = await listInlineComments(articleId);
  return NextResponse.json({ ok: true, comments });
}

export async function POST(request: Request) {
  const guard = await requireDashboardSession(request, "editorial:write");
  if (!guard.ok) return guard.response;

  let body: {
    articleId?: string;
    anchorId?: string;
    body?: string;
    mentions?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body.articleId || !body.body?.trim()) {
    return NextResponse.json(
      { ok: false, error: "articleId and body required" },
      { status: 400 }
    );
  }

  const comment = await addInlineComment({
    tenantId: guard.session.membership.tenantId,
    articleId: body.articleId,
    anchorId: body.anchorId ?? "general",
    body: body.body.trim(),
    authorUserId: guard.session.userId,
    authorEmail: guard.session.email,
    mentions: body.mentions,
  });

  return NextResponse.json({ ok: Boolean(comment), comment });
}
