import { describe, expect, it } from "vitest";
import {
  NO_VERIFICATION,
  RestrictedIdentityDataError,
  VERIFICATION_UNAVAILABLE_MESSAGE,
  assertNoRestrictedIdentityData,
  effectiveStatus,
  evaluatePostGate,
  isVerifiedNow,
  parseProviderResult,
  signProviderPayload,
  verificationAvailability,
  verifyProviderSignature,
  type VerificationRecord,
} from "@/lib/user-news/verification";

const NOW = new Date("2026-10-07T12:00:00.000Z");
const UID = "8f6f1f5e-0a0b-4c3d-8e1f-0123456789ab";
const verified = (extra: Partial<VerificationRecord> = {}): VerificationRecord => ({
  status: "verified",
  provider: "acme-kyc",
  verifiedAt: "2026-09-01T00:00:00.000Z",
  expiresAt: null,
  ...extra,
});

describe("isVerifiedNow / effectiveStatus", () => {
  it("only a verified, unexpired record counts", () => {
    expect(isVerifiedNow(verified(), NOW)).toBe(true);
    expect(isVerifiedNow(verified({ expiresAt: "2026-12-01T00:00:00.000Z" }), NOW)).toBe(true);
    expect(isVerifiedNow(verified({ expiresAt: "2026-10-01T00:00:00.000Z" }), NOW)).toBe(false);
    expect(isVerifiedNow(verified({ expiresAt: "not-a-date" }), NOW)).toBe(false);
    for (const status of ["unverified", "pending", "rejected", "expired", "revoked"] as const) {
      expect(isVerifiedNow(verified({ status }), NOW)).toBe(false);
    }
    expect(isVerifiedNow(null, NOW)).toBe(false);
    expect(isVerifiedNow(NO_VERIFICATION, NOW)).toBe(false);
  });

  it("a stored 'verified' past its expiry reads as 'expired' (expiry is evaluated, not trusted)", () => {
    expect(effectiveStatus(verified({ expiresAt: "2026-10-01T00:00:00.000Z" }), NOW)).toBe("expired");
    expect(effectiveStatus(null, NOW)).toBe("unverified");
  });
});

describe("the hard compliance gate", () => {
  it("with no provider and no manual attestation, verification is UNAVAILABLE and says so honestly", () => {
    const a = verificationAvailability({});
    expect(a).toEqual({ available: false, reason: "no_provider_configured", message: VERIFICATION_UNAVAILABLE_MESSAGE });
    expect(VERIFICATION_UNAVAILABLE_MESSAGE).toBe("Identity verification unavailable until verification service is configured.");
  });

  it("a provider needs BOTH a provider id and a webhook secret", () => {
    expect(verificationAvailability({ IDENTITY_VERIFICATION_PROVIDER: "acme" }).available).toBe(false);
    expect(verificationAvailability({ IDENTITY_PROVIDER_WEBHOOK_SECRET: "s" }).available).toBe(false);
    expect(verificationAvailability({ IDENTITY_VERIFICATION_PROVIDER: "acme", IDENTITY_PROVIDER_WEBHOOK_SECRET: "s" })).toEqual({ available: true, mode: "provider", provider: "acme" });
  });

  it("manual attestation is OFF unless it is exactly 'true'", () => {
    expect(verificationAvailability({ IDENTITY_MANUAL_ATTESTATION_ENABLED: "1" }).available).toBe(false);
    expect(verificationAvailability({ IDENTITY_MANUAL_ATTESTATION_ENABLED: "true" })).toMatchObject({ available: true, mode: "manual_attestation" });
  });

  it("an unverified user is blocked, and the reason distinguishes 'unavailable' from 'not yet verified'", () => {
    const none = evaluatePostGate({ userId: UID, record: NO_VERIFICATION, env: {}, now: NOW });
    expect(none).toMatchObject({ allowed: false, reason: "verification_unavailable", message: VERIFICATION_UNAVAILABLE_MESSAGE });
    const configured = evaluatePostGate({
      userId: UID,
      record: NO_VERIFICATION,
      env: { IDENTITY_VERIFICATION_PROVIDER: "acme", IDENTITY_PROVIDER_WEBHOOK_SECRET: "s" },
      now: NOW,
    });
    expect(configured).toMatchObject({ allowed: false, reason: "not_verified", message: "Verify your identity to publish news." });
  });

  it("only a verified user is allowed; an anonymous visitor and a disabled feature are not", () => {
    expect(evaluatePostGate({ userId: UID, record: verified(), env: {}, now: NOW })).toEqual({ allowed: true });
    expect(evaluatePostGate({ userId: null, record: verified(), env: {}, now: NOW })).toMatchObject({ allowed: false, reason: "not_authenticated" });
    expect(evaluatePostGate({ userId: UID, record: verified(), env: { USER_NEWS_ENABLED: "false" }, now: NOW })).toMatchObject({ allowed: false, reason: "feature_disabled" });
  });

  it("a pending, rejected, revoked or expired verification does not open the gate", () => {
    for (const status of ["pending", "rejected", "revoked", "expired"] as const) {
      expect(evaluatePostGate({ userId: UID, record: verified({ status }), env: {}, now: NOW }).allowed).toBe(false);
    }
    expect(evaluatePostGate({ userId: UID, record: verified({ expiresAt: "2026-10-01T00:00:00.000Z" }), env: {}, now: NOW }).allowed).toBe(false);
  });
});

describe("restricted identity data is refused everywhere", () => {
  it.each([
    { aadhaar_number: "x" },
    { user: { aadhaarNumber: "x" } },
    { otp: "123456" },
    { data: { items: [{ biometric: "x" }] } },
    { fingerprint_template: "x" },
    { passport: "x" },
    { note: "my aadhaar is 1234 5678 9012" },
    { note: "123456789012" },
    { n: 123456789012 },
  ])("refuses %j", (payload) => {
    expect(() => assertNoRestrictedIdentityData(payload)).toThrow(RestrictedIdentityDataError);
  });

  it("accepts an ordinary provider result", () => {
    expect(() => assertNoRestrictedIdentityData({ userId: UID, reference: "kyc_abc123", status: "verified", amount: 12345 })).not.toThrow();
  });
});

describe("provider callback signature", () => {
  const secret = "whsec_test_secret";
  const body = JSON.stringify({ userId: UID, reference: "kyc_abc123", status: "verified", verifiedAt: "2026-10-01T00:00:00.000Z" });

  it("accepts a correct signature, with or without the sha256= prefix", () => {
    const sig = signProviderPayload(body, secret);
    expect(verifyProviderSignature(body, sig, secret)).toBe(true);
    expect(verifyProviderSignature(body, `sha256=${sig}`, secret)).toBe(true);
  });

  it("rejects a wrong secret, a tampered body, a missing signature and a missing secret", () => {
    const sig = signProviderPayload(body, secret);
    expect(verifyProviderSignature(body, sig, "other")).toBe(false);
    expect(verifyProviderSignature(body.replace("verified", "rejected"), sig, secret)).toBe(false);
    expect(verifyProviderSignature(body, null, secret)).toBe(false);
    expect(verifyProviderSignature(body, sig, null)).toBe(false);
    expect(verifyProviderSignature(body, "short", secret)).toBe(false);
  });
});

describe("parseProviderResult", () => {
  const good = { userId: UID, reference: "kyc_abc123", status: "verified", verifiedAt: "2026-10-01T00:00:00.000Z", expiresAt: "2027-10-01T00:00:00.000Z" };

  it("accepts a well-formed result", () => {
    const r = parseProviderResult(good);
    expect(r).toMatchObject({ ok: true, result: { userId: UID, status: "verified", reference: "kyc_abc123" } });
  });

  it("refuses restricted identity data before anything else", () => {
    expect(parseProviderResult({ ...good, aadhaar: "1234 5678 9012" })).toEqual({ ok: false, error: "restricted_identity_data" });
  });

  it.each([
    [{ ...good, userId: "nope" }, "invalid_user_id"],
    [{ ...good, reference: "x" }, "invalid_reference"],
    [{ ...good, status: "approved" }, "invalid_status"],
    [{ ...good, verifiedAt: undefined }, "verified_requires_verifiedAt"],
    [{ ...good, expiresAt: "2026-09-01T00:00:00.000Z" }, "invalid_expiry"],
    ["not an object", "invalid_payload"],
  ])("rejects %j -> %s", (body, error) => {
    expect(parseProviderResult(body)).toEqual({ ok: false, error });
  });
});

import { PROVIDER_SIGNATURE_TOLERANCE_SEC, signProviderRequest, verifyProviderRequest } from "@/lib/user-news/verification";

describe("timestamped provider request signature (replay protection)", () => {
  const secret = "whsec_test_secret";
  const body = JSON.stringify({ userId: UID, reference: "kyc_abc123", status: "verified", verifiedAt: "2026-10-01T00:00:00.000Z" });
  const nowMs = Date.parse("2026-10-07T12:00:00.000Z");
  const ts = Math.floor(nowMs / 1000);
  const sig = signProviderRequest(body, secret, ts);

  it("accepts a fresh, correctly signed request", () => {
    expect(verifyProviderRequest({ rawBody: body, signature: sig, timestamp: String(ts), secret, nowMs })).toEqual({ ok: true });
    expect(verifyProviderRequest({ rawBody: body, signature: `sha256=${sig}`, timestamp: String(ts), secret, nowMs })).toEqual({ ok: true });
  });

  it("refuses a replay of a captured request once it is older than the tolerance", () => {
    const later = nowMs + (PROVIDER_SIGNATURE_TOLERANCE_SEC + 5) * 1000;
    expect(verifyProviderRequest({ rawBody: body, signature: sig, timestamp: String(ts), secret, nowMs: later })).toEqual({ ok: false, error: "stale_timestamp" });
  });

  it("refuses a request from the future beyond the tolerance", () => {
    const earlier = nowMs - (PROVIDER_SIGNATURE_TOLERANCE_SEC + 5) * 1000;
    expect(verifyProviderRequest({ rawBody: body, signature: sig, timestamp: String(ts), secret, nowMs: earlier })).toEqual({ ok: false, error: "stale_timestamp" });
  });

  it("the timestamp is covered by the signature: changing it invalidates the request", () => {
    expect(verifyProviderRequest({ rawBody: body, signature: sig, timestamp: String(ts + 10), secret, nowMs })).toEqual({ ok: false, error: "bad_signature" });
  });

  it("refuses a tampered body, a wrong secret, and missing parts", () => {
    expect(verifyProviderRequest({ rawBody: body.replace("verified", "rejected"), signature: sig, timestamp: String(ts), secret, nowMs })).toEqual({ ok: false, error: "bad_signature" });
    expect(verifyProviderRequest({ rawBody: body, signature: sig, timestamp: String(ts), secret: "other", nowMs })).toEqual({ ok: false, error: "bad_signature" });
    expect(verifyProviderRequest({ rawBody: body, signature: null, timestamp: String(ts), secret, nowMs })).toEqual({ ok: false, error: "missing_signature" });
    expect(verifyProviderRequest({ rawBody: body, signature: sig, timestamp: null, secret, nowMs })).toEqual({ ok: false, error: "missing_timestamp" });
    expect(verifyProviderRequest({ rawBody: body, signature: sig, timestamp: String(ts), secret: null, nowMs })).toEqual({ ok: false, error: "missing_signature" });
  });
});

describe("the identity-data guard does not misfire on ordinary ids", () => {
  it("never refuses a UUID, however many digits it happens to contain", () => {
    const digitHeavy = [
      "12345678-1234-4123-8123-123456789012", // 12 digits in the last group, plus 4-4-4 runs
      "00000000-0000-4000-8000-000000000000",
      "11111111-1111-4111-8111-111111111111",
      "98765432-1098-4765-8432-109876543210",
    ];
    for (const id of digitHeavy) {
      expect(() => assertNoRestrictedIdentityData({ userId: id })).not.toThrow();
      expect(parseProviderResult({ userId: id, reference: "kyc_abc12345", status: "verified", verifiedAt: "2026-10-01T00:00:00.000Z" })).toMatchObject({ ok: true });
    }
  });

  it("still refuses an Aadhaar-shaped number sitting right next to a UUID", () => {
    expect(() => assertNoRestrictedIdentityData({ note: "12345678-1234-4123-8123-123456789012 and 1234 5678 9012" })).toThrow(RestrictedIdentityDataError);
  });

  it("holds across many random UUIDs (the false-positive rate is zero)", () => {
    const { randomUUID } = require("node:crypto") as typeof import("node:crypto");
    for (let i = 0; i < 5000; i++) expect(() => assertNoRestrictedIdentityData({ userId: randomUUID() })).not.toThrow();
  });
});
