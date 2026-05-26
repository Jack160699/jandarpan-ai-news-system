import { NextResponse } from "next/server";
import { requireDashboardSession } from "@/lib/saas-auth/guard";
import {
  listUserSessions,
  revokeAllUserSessions,
  revokeSession,
} from "@/lib/security/session-store";
import { hashSessionToken } from "@/lib/security/request-context";
import { logLoginEvent } from "@/lib/security/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireDashboardSession(request);
  if (!guard.ok) return guard.response;

  const sessions = await listUserSessions(guard.session.userId);
  return NextResponse.json({ ok: true, sessions });
}

export async function DELETE(request: Request) {
  const guard = await requireDashboardSession(request);
  if (!guard.ok) return guard.response;

  let body: { all?: boolean; sessionId?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (body.all) {
    const currentHash = hashSessionToken(guard.session.accessToken);
    await revokeAllUserSessions(guard.session.userId, currentHash);
    await logLoginEvent({
      userId: guard.session.userId,
      email: guard.session.email,
      eventType: "session_revoked",
      metadata: { scope: "all_except_current" },
    });
    return NextResponse.json({ ok: true, revoked: "all_other" });
  }

  await revokeSession(guard.session.accessToken, "user_revoke");
  return NextResponse.json({ ok: true, revoked: "current" });
}
