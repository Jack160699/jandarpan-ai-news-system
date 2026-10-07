import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/admin-authorization";
import { createProductionDeps } from "@/lib/user-news/supabase-adapters";
import { readJson } from "@/lib/user-news/http";
import { AttestVerificationSchema } from "@/lib/user-news/schemas";
import { recordVerification } from "@/lib/user-news/service";
import { assertNoRestrictedIdentityData } from "@/lib/user-news/verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/user-news/verification — manual attestation, for a human identity check done OUTSIDE the app.
 *
 * Off unless IDENTITY_MANUAL_ATTESTATION_ENABLED=true, super-admin only, and always audit-logged with the admin's identity. The app never
 * receives or stores any identity data: `reference` is an internal case/ticket id, and anything shaped like an Aadhaar number, an OTP or a
 * biometric is refused. This does NOT make Jandarpan an Aadhaar-authorised entity and must not be described as Aadhaar verification.
 */
export async function POST(request: Request) {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.response;
  if (process.env.IDENTITY_MANUAL_ATTESTATION_ENABLED !== "true") {
    return NextResponse.json({ ok: false, error: "manual_attestation_disabled" }, { status: 409 });
  }
  const body = await readJson(request, AttestVerificationSchema);
  if (!body.ok) return body.response;
  try {
    assertNoRestrictedIdentityData(body.data);
  } catch {
    return NextResponse.json({ ok: false, error: "restricted_identity_data" }, { status: 400 });
  }

  const r = await recordVerification(await createProductionDeps(), {
    userId: body.data.userId,
    status: body.data.status,
    provider: "manual_admin",
    reference: body.data.reference,
    expiresAt: body.data.expiresAt ?? null,
    actorKind: "admin",
    actorId: auth.session.userId,
  });
  return r.ok ? NextResponse.json({ ok: true, status: r.status }) : NextResponse.json({ ok: false, error: r.code }, { status: r.status });
}
