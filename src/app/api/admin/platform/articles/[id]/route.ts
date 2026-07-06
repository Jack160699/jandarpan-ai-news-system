import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { patchAdminArticle } from "@/lib/platform-admin/articles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireEditorialAuth(request, "editorial:write");
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const source = payload.source === "platform" ? "platform" : "generated";

  const ok = await patchAdminArticle(id, source, {
    workflowStatus: payload.workflowStatus as string | undefined,
    editorialStatus: payload.editorialStatus as string | undefined,
    publishedAt: payload.publishedAt as string | null | undefined,
    homepagePin: payload.homepagePin as boolean | undefined,
    seoTitle: payload.seoTitle as string | undefined,
    seoDescription: payload.seoDescription as string | undefined,
    isBreaking: payload.isBreaking as boolean | undefined,
  }, auth.session.membership.tenantId);

  if (!ok) {
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
