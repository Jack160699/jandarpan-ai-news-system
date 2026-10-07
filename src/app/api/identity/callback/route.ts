import { NextResponse } from "next/server";
import { createProductionDeps } from "@/lib/user-news/supabase-adapters";
import { parseProviderResult, verifyProviderRequest, verificationAvailability } from "@/lib/user-news/verification";
import { recordVerification } from "@/lib/user-news/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 16 * 1024;
const json = (body: unknown, status: number) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * POST /api/identity/callback — result callback from an AUTHORISED identity-verification provider.
 *
 * Accepts only a signed RESULT (status + opaque reference + timestamps). The request must carry
 *   x-timestamp   epoch seconds (within 5 minutes: replay protection)
 *   x-signature   HMAC-SHA256 hex of `${timestamp}.${rawBody}` with IDENTITY_PROVIDER_WEBHOOK_SECRET
 * Any payload containing an Aadhaar number, OTP, biometric or identity document is refused outright and never stored or logged.
 * With no provider configured this endpoint answers 503: it cannot be used to mark anyone verified.
 */
export async function POST(request: Request) {
  const availability = verificationAvailability(process.env);
  const secret = process.env.IDENTITY_PROVIDER_WEBHOOK_SECRET?.trim();
  if (!availability.available || availability.mode !== "provider" || !secret) {
    return json({ ok: false, error: "not_configured" }, 503);
  }

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) return json({ ok: false, error: "payload_too_large" }, 413);
  const rawBody = await request.text();
  if (rawBody.length > MAX_BYTES) return json({ ok: false, error: "payload_too_large" }, 413);

  const sig = verifyProviderRequest({ rawBody, signature: request.headers.get("x-signature"), timestamp: request.headers.get("x-timestamp"), secret });
  if (!sig.ok) return json({ ok: false, error: sig.error }, 401);

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }
  const parsed = parseProviderResult(body);
  if (!parsed.ok) return json({ ok: false, error: parsed.error }, 400);

  const deps = await createProductionDeps();
  const r = await recordVerification(deps, {
    userId: parsed.result.userId,
    status: parsed.result.status,
    provider: availability.provider,
    reference: parsed.result.reference,
    verifiedAt: parsed.result.verifiedAt,
    expiresAt: parsed.result.expiresAt,
    consentVersion: parsed.result.consentVersion,
    actorKind: "provider",
  });
  return r.ok ? json({ ok: true }, 200) : json({ ok: false, error: r.code }, r.status);
}
