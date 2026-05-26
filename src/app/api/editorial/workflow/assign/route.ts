import { NextResponse } from "next/server";
import { notifyAssignment } from "@/lib/collaboration/store";
import { logEditorialAudit } from "@/lib/dashboard/audit";
import { assignWorkflowArticle } from "@/lib/editorial-workflow/store";
import { createAdminServerClient } from "@/lib/supabase";
import { canApproveWorkflow } from "@/lib/editorial-workflow/engine";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireEditorialAuth(request, "editorial:write");
  if (!auth.ok) return auth.response;

  if (!canApproveWorkflow(auth.session.membership.role)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  let body: { articleId?: string; assignToUserId?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body.articleId) {
    return NextResponse.json({ ok: false, error: "articleId_required" }, { status: 400 });
  }

  const result = await assignWorkflowArticle({
    session: auth.session,
    articleId: body.articleId,
    assignToUserId: body.assignToUserId ?? null,
  });

  if (result.ok) {
    await logEditorialAudit({
      session: auth.session,
      action: "workflow_assign",
      resourceType: "article",
      resourceId: body.articleId,
      payload: { assignToUserId: body.assignToUserId },
    });

    if (body.assignToUserId) {
      const supabase = createAdminServerClient();
      const { data: row } = await supabase
        .from("generated_articles")
        .select("headline")
        .eq("id", body.articleId)
        .maybeSingle();
      await notifyAssignment({
        tenantId: auth.session.membership.tenantId,
        assigneeUserId: body.assignToUserId,
        articleId: body.articleId,
        headline: row?.headline ?? "Story",
        assignerEmail: auth.session.email,
      });
    }
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
