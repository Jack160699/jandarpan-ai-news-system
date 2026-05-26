import { NextResponse } from "next/server";
import { logEditorialAudit } from "@/lib/dashboard/audit";
import type { WorkflowStatus } from "@/lib/editorial-workflow/types";
import { WORKFLOW_STATUSES } from "@/lib/editorial-workflow/types";
import { transitionWorkflow } from "@/lib/editorial-workflow/store";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireEditorialAuth(request, "editorial:write");
  if (!auth.ok) return auth.response;

  let body: {
    articleId?: string;
    toStatus?: WorkflowStatus;
    comment?: string;
    rejectionReason?: string;
    assignToUserId?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body.articleId || !body.toStatus) {
    return NextResponse.json(
      { ok: false, error: "articleId_and_toStatus_required" },
      { status: 400 }
    );
  }

  if (!WORKFLOW_STATUSES.includes(body.toStatus)) {
    return NextResponse.json({ ok: false, error: "invalid_status" }, { status: 400 });
  }

  const result = await transitionWorkflow({
    session: auth.session,
    articleId: body.articleId,
    toStatus: body.toStatus,
    comment: body.comment,
    rejectionReason: body.rejectionReason,
    assignToUserId: body.assignToUserId,
  });

  if (result.ok) {
    await logEditorialAudit({
      session: auth.session,
      action: "workflow_transition",
      resourceType: "article",
      resourceId: body.articleId,
      payload: {
        toStatus: body.toStatus,
        rejectionReason: body.rejectionReason,
      },
    });
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
