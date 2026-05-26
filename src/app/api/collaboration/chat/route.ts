import { NextResponse } from "next/server";
import { postChatMessage } from "@/lib/collaboration/store";
import { requireDashboardSession } from "@/lib/saas-auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = await requireDashboardSession(request, "editorial:write");
  if (!guard.ok) return guard.response;

  let body: { body?: string; channel?: string; mentions?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body.body?.trim()) {
    return NextResponse.json(
      { ok: false, error: "body required" },
      { status: 400 }
    );
  }

  const message = await postChatMessage({
    tenantId: guard.session.membership.tenantId,
    body: body.body.trim(),
    authorUserId: guard.session.userId,
    authorEmail: guard.session.email,
    channel: body.channel,
    mentions: body.mentions,
  });

  return NextResponse.json({ ok: Boolean(message), message });
}
