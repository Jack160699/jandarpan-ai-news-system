import { NextResponse } from "next/server";
import { requireDashboardSession } from "@/lib/saas-auth/guard";
import {
  generateBackupCodes,
  generateTotpSecret,
  save2faEnrollment,
} from "@/lib/security/two-factor";
import { logLoginEvent } from "@/lib/security/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = await requireDashboardSession(request);
  if (!guard.ok) return guard.response;

  const { secret, otpauthUrl } = generateTotpSecret(guard.session.email);
  const backupCodes = generateBackupCodes();

  await save2faEnrollment(guard.session.userId, secret, backupCodes);

  return NextResponse.json({
    ok: true,
    otpauthUrl,
    backupCodes,
    message: "Scan QR in authenticator app, then POST /api/security/2fa/verify with a token to enable.",
  });
}

export async function PUT(request: Request) {
  const guard = await requireDashboardSession(request);
  if (!guard.ok) return guard.response;

  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { verify2faForUser, confirm2faEnrollment } = await import(
    "@/lib/security/two-factor"
  );

  const valid = await verify2faForUser(guard.session.userId, body.token ?? "");
  if (!valid) {
    return NextResponse.json({ ok: false, error: "invalid_token" }, { status: 400 });
  }

  await confirm2faEnrollment(guard.session.userId);

  await logLoginEvent({
    userId: guard.session.userId,
    email: guard.session.email,
    tenantId: guard.session.membership.tenantId,
    eventType: "2fa_enabled",
  });

  return NextResponse.json({ ok: true, enabled: true });
}
