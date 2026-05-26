import { NextResponse } from "next/server";
import { appendDocOperation } from "@/lib/collaboration/store";
import { requireDashboardSession } from "@/lib/saas-auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = await requireDashboardSession(request, "editorial:write");
  if (!guard.ok) return guard.response;

  let body: { articleId?: string; version?: number; html?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body.articleId || body.version == null || !body.html) {
    return NextResponse.json(
      { ok: false, error: "articleId, version, html required" },
      { status: 400 }
    );
  }

  const result = await appendDocOperation({
    tenantId: guard.session.membership.tenantId,
    articleId: body.articleId,
    userId: guard.session.userId,
    email: guard.session.email,
    version: body.version,
    html: body.html,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
