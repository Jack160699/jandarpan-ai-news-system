import { NextResponse } from "next/server";
import {
  acquireEditorLock,
  heartbeatLock,
  releaseEditorLock,
} from "@/lib/collaboration/store";
import { requireDashboardSession } from "@/lib/saas-auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = await requireDashboardSession(request, "editorial:write");
  if (!guard.ok) return guard.response;

  let body: { articleId?: string; action?: "acquire" | "release" | "heartbeat" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body.articleId) {
    return NextResponse.json(
      { ok: false, error: "articleId required" },
      { status: 400 }
    );
  }

  const { tenantId } = guard.session.membership;
  const { userId } = guard.session;
  const email = guard.session.email;

  if (body.action === "release") {
    await releaseEditorLock(body.articleId, userId);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "heartbeat") {
    await heartbeatLock(body.articleId, userId);
    return NextResponse.json({ ok: true });
  }

  const lock = await acquireEditorLock({
    tenantId,
    articleId: body.articleId,
    userId,
    email,
  });

  if (!lock) {
    return NextResponse.json(
      { ok: false, error: "lock_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, lock });
}
