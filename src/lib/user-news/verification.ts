/**
 * Identity verification gate for Post News.
 *
 * COMPLIANCE POSITION (read before changing anything):
 *  - Jandarpan is NOT an authorized Aadhaar / UIDAI entity and never claims to be. Aadhaar authentication / e-KYC / offline
 *    verification must go through an authorized provider that returns only a RESULT.
 *  - This module therefore stores only: status, provider id, an opaque provider reference, verified/expiry timestamps and the
 *    consent that was given. It never accepts, stores or logs an Aadhaar number, an OTP, a biometric, or an identity document.
 *    assertNoRestrictedIdentityData() enforces that on every inbound payload and is covered by tests.
 *  - With no provider configured the honest answer is "unavailable": nothing is faked, and Post News stays locked.
 *  - A user can never set their own verification state: it is written only by the server after a provider callback (verified
 *    signature) or by an authorised administrator (manual attestation, off by default, always audit-logged).
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export const VERIFICATION_STATUSES = ["unverified", "pending", "verified", "rejected", "expired", "revoked"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export type VerificationRecord = {
  status: VerificationStatus;
  provider: string | null;
  verifiedAt: string | null;
  expiresAt: string | null;
};

export const NO_VERIFICATION: VerificationRecord = { status: "unverified", provider: null, verifiedAt: null, expiresAt: null };

/** True only for a verified record that has not expired. Expiry is evaluated at read time, not trusted from the stored status. */
export function isVerifiedNow(rec: VerificationRecord | null | undefined, now: Date = new Date()): boolean {
  if (!rec || rec.status !== "verified") return false;
  if (rec.expiresAt) {
    const exp = new Date(rec.expiresAt).getTime();
    if (!Number.isFinite(exp) || exp <= now.getTime()) return false;
  }
  return true;
}

/** The status to show a user: a verified record past its expiry reads as "expired". */
export function effectiveStatus(rec: VerificationRecord | null | undefined, now: Date = new Date()): VerificationStatus {
  if (!rec) return "unverified";
  if (rec.status === "verified" && !isVerifiedNow(rec, now)) return "expired";
  return rec.status;
}

// ---------------------------------------------------------------------------------------------------------------------
// Provider configuration (the hard compliance gate)
// ---------------------------------------------------------------------------------------------------------------------

type Env = Record<string, string | undefined>;

export type VerificationAvailability =
  | { available: true; mode: "provider"; provider: string }
  | { available: true; mode: "manual_attestation"; provider: "manual_admin" }
  | { available: false; reason: "no_provider_configured"; message: string };

export const VERIFICATION_UNAVAILABLE_MESSAGE = "Identity verification unavailable until verification service is configured.";

/**
 * Which verification path exists right now.
 *  - IDENTITY_VERIFICATION_PROVIDER + IDENTITY_PROVIDER_WEBHOOK_SECRET: an authorized provider that POSTs signed results.
 *  - IDENTITY_MANUAL_ATTESTATION_ENABLED=true: a super-admin attests an identity they verified through a compliant process
 *    outside the app (no identity data enters the app). Off by default.
 */
export function verificationAvailability(env: Env = process.env): VerificationAvailability {
  const provider = env.IDENTITY_VERIFICATION_PROVIDER?.trim();
  const secret = env.IDENTITY_PROVIDER_WEBHOOK_SECRET?.trim();
  if (provider && secret) return { available: true, mode: "provider", provider };
  if (env.IDENTITY_MANUAL_ATTESTATION_ENABLED === "true") return { available: true, mode: "manual_attestation", provider: "manual_admin" };
  return { available: false, reason: "no_provider_configured", message: VERIFICATION_UNAVAILABLE_MESSAGE };
}

export function isPostNewsOpen(env: Env = process.env): boolean {
  // The whole feature can also be switched off independently of verification.
  return env.USER_NEWS_ENABLED !== "false";
}

// ---------------------------------------------------------------------------------------------------------------------
// Restricted identity data guard
// ---------------------------------------------------------------------------------------------------------------------

const RESTRICTED_KEY = /(aadhaar|aadhar|adhaar|uidai|^uid$|^otp$|_otp|otp_|biometric|fingerprint|iris|face_?(image|template)|pan_?(number|card)|passport|voter_?id|driving_?licen[cs]e|dl_?number|document_?(image|number|scan))/i;
// 12 digits (optionally grouped 4-4-4) is the shape of an Aadhaar number; also catch it inside free text.
const AADHAAR_SHAPE = /(?<!\d)\d{4}[\s-]?\d{4}[\s-]?\d{4}(?!\d)/;
// A UUID is an opaque id, not identity data; but three all-digit groups inside one ("...5678-1234-4123...") look exactly like a 4-4-4
// number. About 0.4% of random UUIDs would be refused at random, so they are removed before the shape test.
const UUID_ANYWHERE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

export class RestrictedIdentityDataError extends Error {
  readonly code = "restricted_identity_data";
  constructor(readonly path: string) {
    super(`restricted identity data refused at "${path}"`);
  }
}

/** Throws if a payload carries anything this platform must never store. Walks nested objects and arrays. */
export function assertNoRestrictedIdentityData(payload: unknown, path = "$", depth = 0): void {
  if (depth > 8 || payload === null || payload === undefined) return;
  if (typeof payload === "string") {
    if (AADHAAR_SHAPE.test(payload.replace(UUID_ANYWHERE, " "))) throw new RestrictedIdentityDataError(path);
    return;
  }
  if (typeof payload === "number") {
    if (/^\d{12}$/.test(String(Math.trunc(Math.abs(payload))))) throw new RestrictedIdentityDataError(path);
    return;
  }
  if (Array.isArray(payload)) {
    payload.forEach((v, i) => assertNoRestrictedIdentityData(v, `${path}[${i}]`, depth + 1));
    return;
  }
  if (typeof payload === "object") {
    for (const [k, v] of Object.entries(payload as Record<string, unknown>)) {
      if (RESTRICTED_KEY.test(k)) throw new RestrictedIdentityDataError(`${path}.${k}`);
      assertNoRestrictedIdentityData(v, `${path}.${k}`, depth + 1);
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Provider callback: signed result only
// ---------------------------------------------------------------------------------------------------------------------

export type ProviderResult = {
  userId: string;
  /** Opaque reference issued by the provider. Never an identity number. */
  reference: string;
  status: Extract<VerificationStatus, "verified" | "rejected" | "pending" | "revoked">;
  verifiedAt?: string;
  expiresAt?: string;
  consentVersion?: string;
};

export function signProviderPayload(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function verifyProviderSignature(rawBody: string, signature: string | null | undefined, secret: string | null | undefined): boolean {
  if (!secret || !signature) return false;
  const expected = Buffer.from(signProviderPayload(rawBody, secret), "utf8");
  const given = Buffer.from(String(signature).trim().replace(/^sha256=/i, ""), "utf8");
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REF = /^[A-Za-z0-9._:\-]{6,128}$/;

export type ParsedProviderResult = { ok: true; result: ProviderResult } | { ok: false; error: string };

/** Validate an already-signature-checked callback body. Refuses restricted identity data outright. */
export function parseProviderResult(body: unknown): ParsedProviderResult {
  try {
    assertNoRestrictedIdentityData(body);
  } catch (e) {
    return { ok: false, error: e instanceof RestrictedIdentityDataError ? e.code : "invalid_payload" };
  }
  if (!body || typeof body !== "object") return { ok: false, error: "invalid_payload" };
  const b = body as Record<string, unknown>;
  if (typeof b.userId !== "string" || !UUID.test(b.userId)) return { ok: false, error: "invalid_user_id" };
  if (typeof b.reference !== "string" || !REF.test(b.reference)) return { ok: false, error: "invalid_reference" };
  if (!["verified", "rejected", "pending", "revoked"].includes(String(b.status))) return { ok: false, error: "invalid_status" };
  const iso = (v: unknown) => (typeof v === "string" && Number.isFinite(Date.parse(v)) ? new Date(v).toISOString() : undefined);
  const verifiedAt = iso(b.verifiedAt);
  const expiresAt = iso(b.expiresAt);
  if (b.status === "verified" && !verifiedAt) return { ok: false, error: "verified_requires_verifiedAt" };
  if (expiresAt && verifiedAt && Date.parse(expiresAt) <= Date.parse(verifiedAt)) return { ok: false, error: "invalid_expiry" };
  return {
    ok: true,
    result: {
      userId: b.userId,
      reference: b.reference,
      status: b.status as ProviderResult["status"],
      verifiedAt,
      expiresAt,
      consentVersion: typeof b.consentVersion === "string" ? b.consentVersion.slice(0, 40) : undefined,
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// The gate every Post News write goes through
// ---------------------------------------------------------------------------------------------------------------------

export type PostGate =
  | { allowed: true }
  | {
      allowed: false;
      reason: "feature_disabled" | "not_authenticated" | "verification_unavailable" | "not_verified";
      status: VerificationStatus;
      message: string;
    };

export function evaluatePostGate(input: {
  userId: string | null | undefined;
  record: VerificationRecord | null | undefined;
  env?: Env;
  now?: Date;
}): PostGate {
  const env = input.env ?? process.env;
  const now = input.now ?? new Date();
  const status = effectiveStatus(input.record, now);
  if (!isPostNewsOpen(env)) return { allowed: false, reason: "feature_disabled", status, message: "Posting news is currently switched off." };
  if (!input.userId) return { allowed: false, reason: "not_authenticated", status, message: "Sign in to post news." };
  if (isVerifiedNow(input.record, now)) return { allowed: true };
  const availability = verificationAvailability(env);
  if (!availability.available) return { allowed: false, reason: "verification_unavailable", status, message: availability.message };
  return { allowed: false, reason: "not_verified", status, message: "Verify your identity to publish news." };
}

// ---------------------------------------------------------------------------------------------------------------------
// Timestamped request signature (replay protection)
// ---------------------------------------------------------------------------------------------------------------------

export const PROVIDER_SIGNATURE_TOLERANCE_SEC = 300;

/** Signs `${timestamp}.${rawBody}`: a captured callback cannot be replayed later, because the timestamp is part of what is signed. */
export function signProviderRequest(rawBody: string, secret: string, timestampSec: number): string {
  return createHmac("sha256", secret).update(`${timestampSec}.${rawBody}`).digest("hex");
}

export type ProviderRequestCheck = { ok: true } | { ok: false; error: "missing_signature" | "missing_timestamp" | "stale_timestamp" | "bad_signature" };

export function verifyProviderRequest(input: {
  rawBody: string;
  signature: string | null | undefined;
  timestamp: string | null | undefined;
  secret: string | null | undefined;
  nowMs?: number;
}): ProviderRequestCheck {
  if (!input.signature || !input.secret) return { ok: false, error: "missing_signature" };
  const ts = Number(input.timestamp);
  if (!input.timestamp || !Number.isFinite(ts)) return { ok: false, error: "missing_timestamp" };
  const now = (input.nowMs ?? Date.now()) / 1000;
  if (Math.abs(now - ts) > PROVIDER_SIGNATURE_TOLERANCE_SEC) return { ok: false, error: "stale_timestamp" };
  const expected = Buffer.from(signProviderRequest(input.rawBody, input.secret, ts), "utf8");
  const given = Buffer.from(String(input.signature).trim().replace(/^sha256=/i, ""), "utf8");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, error: "bad_signature" };
  return { ok: true };
}
