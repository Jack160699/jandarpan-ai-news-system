import { NextResponse } from "next/server";
import { requireDashboardSession } from "@/lib/saas-auth/guard";
import { disable2fa, verify2faForUser } from "@/lib/security/two-factor";
import { logLoginEvent } from "@/lib/security/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = await requireDashboardSession(request);
  if (!guard.ok) return guard.response;

  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const valid = await verify2faForUser(guard.session.userId, body.token ?? "");
  if (!valid) {
    return NextResponse.json({ ok: false, error: "invalid_token" }, { status: 400 });
  }

  await disable2fa(guard.session.userId);

  await logLoginEvent({
    userId: guard.session.userId,
    email: guard.session.email,
    tenantId: guard.session.membership.tenantId,
    eventType: "2fa_disabled",
  });

  return NextResponse.json({ ok: true, enabled: false });
}
