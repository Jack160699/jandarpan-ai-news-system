import { NextResponse } from "next/server";
import {
  createApprovalRequest,
  resolveApproval,
} from "@/lib/collaboration/store";
import { requireDashboardSession } from "@/lib/saas-auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = await requireDashboardSession(request, "editorial:write");
  if (!guard.ok) return guard.response;

  let body: {
    action?: "request" | "resolve";
    articleId?: string;
    requestId?: string;
    status?: "approved" | "rejected";
    message?: string;
    responseNote?: string;
    approverUserId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const tenantId = guard.session.membership.tenantId;

  if (body.action === "resolve" && body.requestId && body.status) {
    const ok = await resolveApproval({
      tenantId,
      requestId: body.requestId,
      status: body.status,
      responseNote: body.responseNote,
      resolverUserId: guard.session.userId,
      resolverEmail: guard.session.email,
    });
    return NextResponse.json({ ok });
  }

  if (!body.articleId) {
    return NextResponse.json(
      { ok: false, error: "articleId required" },
      { status: 400 }
    );
  }

  const req = await createApprovalRequest({
    tenantId,
    articleId: body.articleId,
    requestedBy: guard.session.userId,
    requestedByEmail: guard.session.email,
    approverUserId: body.approverUserId,
    message: body.message,
  });

  return NextResponse.json({ ok: Boolean(req), request: req });
}
