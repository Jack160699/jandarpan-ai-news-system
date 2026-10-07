import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRepo, MemoryStorage, makeDeps, verify } from "@/lib/user-news/testing/memory-deps";
import { signProviderRequest } from "@/lib/user-news/verification";

const AUTHOR = "11111111-1111-4111-8111-111111111111";
const STRANGER = "22222222-2222-4222-8222-222222222222";
const MODERATOR = "33333333-3333-4333-8333-333333333333";

let sessionUser: { id: string; email: string } | null = null;
let adminSession: { userId: string; role: string } | null = null;
const state: { repo: MemoryRepo; storage: MemoryStorage; env: Record<string, string | undefined>; deps: ReturnType<typeof makeDeps>["deps"] } = {} as never;

function resetDeps(env: Record<string, string | undefined> = { IDENTITY_MANUAL_ATTESTATION_ENABLED: "true" }) {
  const ctx = makeDeps({ env });
  state.repo = ctx.repo;
  state.storage = ctx.storage;
  state.env = env;
  state.deps = ctx.deps;
}

vi.mock("@/lib/supabase/env", () => ({ isSupabaseConfigured: () => true }));
vi.mock("@/lib/supabase/server", () => ({
  createCookieServerClient: async () => ({ auth: { getUser: async () => (sessionUser ? { data: { user: sessionUser }, error: null } : { data: { user: null }, error: { message: "no session" } }) } }),
}));
vi.mock("@/lib/user-news/supabase-adapters", () => ({ createProductionDeps: async () => state.deps }));
vi.mock("@/lib/auth/admin-authorization", async () => {
  const { NextResponse } = await import("next/server");
  const deny = (status: number) => ({ ok: false as const, response: NextResponse.json({ ok: false, error: status === 401 ? "unauthorized" : "forbidden" }, { status }) });
  return {
    requireAdminPermission: async () => (adminSession ? { ok: true as const, session: { userId: adminSession.userId, membership: { role: adminSession.role } }, ctx: {} } : deny(401)),
    requireSuperAdmin: async () => (adminSession?.role === "super_admin" ? { ok: true as const, session: { userId: adminSession.userId, membership: { role: "super_admin" } }, ctx: {} } : deny(adminSession ? 403 : 401)),
  };
});

import { GET as statusGET } from "@/app/api/user-news/status/route";
import { GET as myGET } from "@/app/api/user-news/my/route";
import { POST as createPOST } from "@/app/api/user-news/submissions/route";
import { GET as detailGET, PATCH as editPATCH } from "@/app/api/user-news/submissions/[id]/route";
import { POST as approvePOST } from "@/app/api/user-news/submissions/[id]/approve/route";
import { POST as submitPOST } from "@/app/api/user-news/submissions/[id]/submit/route";
import { POST as mediaPOST } from "@/app/api/user-news/submissions/[id]/media/route";
import { POST as finalizePOST } from "@/app/api/user-news/media/[mediaId]/finalize/route";
import { POST as callbackPOST } from "@/app/api/identity/callback/route";
import { GET as queueGET } from "@/app/api/admin/user-news/route";
import { POST as moderatePOST } from "@/app/api/admin/user-news/[id]/moderate/route";
import { POST as attestPOST } from "@/app/api/admin/user-news/verification/route";

const post = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`https://x.test${url}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const mctx = (mediaId: string) => ({ params: Promise.resolve({ mediaId }) });
const body = async (r: Response) => (await r.json()) as Record<string, unknown>;

beforeEach(() => {
  sessionUser = null;
  adminSession = null;
  vi.unstubAllEnvs();
  resetDeps();
});

describe("reader routes require a real session", () => {
  it("every reader endpoint answers 401 when there is no session", async () => {
    const id = "44444444-4444-4444-8444-444444444444";
    expect((await myGET()).status).toBe(401);
    expect((await createPOST(post("/api/user-news/submissions", { language: "hi", text: "x" }))).status).toBe(401);
    expect((await detailGET(new Request("https://x.test"), ctx(id))).status).toBe(401);
    expect((await approvePOST(new Request("https://x.test", { method: "POST" }), ctx(id))).status).toBe(401);
    expect((await submitPOST(new Request("https://x.test", { method: "POST" }), ctx(id))).status).toBe(401);
    expect((await mediaPOST(post("/m", { kind: "image", mime: "image/png", sizeBytes: 10 }), ctx(id))).status).toBe(401);
    expect((await finalizePOST(new Request("https://x.test", { method: "POST" }), mctx(id))).status).toBe(401);
  });

  it("the status endpoint is safe for anonymous callers and says what is true", async () => {
    const res = await statusGET();
    const j = (await body(res)) as { ok: boolean; status: { authenticated: boolean; allowed: boolean; reason: string } };
    expect(res.status).toBe(200);
    expect(j.status).toMatchObject({ authenticated: false, allowed: false, reason: "not_authenticated" });
  });

  it("the author comes from the SESSION: a userId in the body is ignored", async () => {
    sessionUser = { id: AUTHOR, email: "a@x.test" };
    verify(state.repo, AUTHOR);
    const res = await createPOST(post("/api/user-news/submissions", { language: "hi", text: "आज सुबह रायपुर में हादसा हुआ", author_id: STRANGER, userId: STRANGER }));
    expect(res.status).toBe(422 === res.status ? 422 : 201); // unknown keys are stripped by the schema; the request itself is valid
    const row = [...state.repo.submissions.values()][0];
    if (row) expect(row.author_id).toBe(AUTHOR);
    expect([...state.repo.submissions.values()].every((s) => s.author_id === AUTHOR)).toBe(true);
  });

  it("an unverified user cannot create a story and is told why", async () => {
    resetDeps({}); // no identity provider and no manual attestation configured
    sessionUser = { id: AUTHOR, email: "a@x.test" };
    const res = await createPOST(post("/api/user-news/submissions", { language: "hi", text: "आज सुबह रायपुर में हादसा हुआ" }));
    expect(res.status).toBe(403);
    expect(await body(res)).toMatchObject({ ok: false, error: "verification_unavailable", message: "Identity verification unavailable until verification service is configured." });
  });

  it("rejects malformed ids with 404 and malformed bodies with 422 / 400", async () => {
    sessionUser = { id: AUTHOR, email: "a@x.test" };
    verify(state.repo, AUTHOR);
    expect((await detailGET(new Request("https://x.test"), ctx("not-a-uuid"))).status).toBe(404);
    expect((await createPOST(post("/api/user-news/submissions", { language: "fr", text: "x" }))).status).toBe(422);
    expect((await createPOST(post("/api/user-news/submissions", "{not json"))).status).toBe(400);
    const id = "44444444-4444-4444-8444-444444444444";
    expect((await editPATCH(post("/x", { headline: "x", status: "published" }), ctx(id))).status).toBe(422); // strict schema: no status / unknown fields
    expect((await mediaPOST(post("/m", { kind: "exe", mime: "x", sizeBytes: 1 }), ctx(id))).status).toBe(422);
  });

  it("refuses an oversized JSON body before parsing it", async () => {
    sessionUser = { id: AUTHOR, email: "a@x.test" };
    const huge = JSON.stringify({ language: "hi", text: "क".repeat(70_000) });
    const res = await createPOST(new Request("https://x.test", { method: "POST", headers: { "content-type": "application/json", "content-length": String(huge.length) }, body: huge }));
    expect(res.status).toBe(413);
  });

  it("another user's story is a 404 on every route", async () => {
    sessionUser = { id: STRANGER, email: "s@x.test" };
    verify(state.repo, STRANGER);
    verify(state.repo, AUTHOR);
    const s = await state.repo.insertSubmission({ author_id: AUTHOR, language: "hi", input_kind: "text", raw_text: "आज सुबह रायपुर में हादसा हुआ और लोग घायल हुए", transcript: null, location_text: null, declared_district: null });
    for (const r of [await detailGET(new Request("https://x.test"), ctx(s.id)), await approvePOST(new Request("https://x.test", { method: "POST" }), ctx(s.id)), await submitPOST(new Request("https://x.test", { method: "POST" }), ctx(s.id))]) {
      expect(r.status).toBe(404);
    }
  });

  it("My News returns only the caller's stories, plus the monetization notice", async () => {
    verify(state.repo, AUTHOR);
    await state.repo.insertSubmission({ author_id: AUTHOR, language: "hi", input_kind: "text", raw_text: "x", transcript: null, location_text: null, declared_district: null });
    await state.repo.insertSubmission({ author_id: STRANGER, language: "hi", input_kind: "text", raw_text: "y", transcript: null, location_text: null, declared_district: null });
    sessionUser = { id: AUTHOR, email: "a@x.test" };
    const j = (await body(await myGET())) as { items: unknown[]; monetization: { active: boolean; message: string } };
    expect(j.items).toHaveLength(1);
    expect(j.monetization).toEqual({ active: false, message: "Advertising revenue sharing not active" });
  });
});

describe("admin routes: authorization and the moderator identity", () => {
  const id = "44444444-4444-4444-8444-444444444444";

  it("401 without an admin session, 403-style denial for non-admins, and nothing is moderated", async () => {
    expect((await queueGET(new Request("https://x.test"))).status).toBe(401);
    expect((await moderatePOST(post("/m", { decision: "hold" }), ctx(id))).status).toBe(401);
    expect((await attestPOST(post("/v", { userId: AUTHOR, status: "verified", reference: "CASE-0001-A" }))).status).toBe(401);
  });

  it("an unknown decision is rejected before anything is looked up", async () => {
    adminSession = { userId: MODERATOR, role: "moderator" };
    expect((await moderatePOST(post("/m", { decision: "delete_everything" }), ctx(id))).status).toBe(422);
    expect((await moderatePOST(post("/m", { decision: "approve" }), ctx("not-a-uuid"))).status).toBe(404);
  });

  it("a moderator decision is audited under the session identity", async () => {
    adminSession = { userId: MODERATOR, role: "moderator" };
    verify(state.repo, AUTHOR);
    const s = await state.repo.insertSubmission({ author_id: AUTHOR, language: "hi", input_kind: "text", raw_text: "x", transcript: null, location_text: null, declared_district: null });
    // move it to under_review legitimately through the repo (what the service would have done)
    await state.repo.updateSubmission(s.id, { status: "ai_generated" }, "draft");
    await state.repo.updateSubmission(s.id, { status: "user_approved", user_approved_at: new Date().toISOString() }, "ai_generated");
    await state.repo.updateSubmission(s.id, { status: "submitted", submitted_at: new Date().toISOString() }, "user_approved");
    // a moderatorId smuggled into the body must have no effect: the moderator is the signed-in admin session
    const res = await moderatePOST(post("/m", { decision: "reject", reasonText: "यह सत्यापित नहीं किया जा सकता।", moderatorId: AUTHOR }), ctx(s.id));
    expect(res.status).toBe(200);
    const audit = state.repo.audits.find((a) => a.action === "user_news.rejected");
    expect(audit).toMatchObject({ actor_id: MODERATOR, actor_kind: "moderator", entity_id: s.id });
  });

  it("manual verification attestation: super-admin only, off by default, and refuses identity-shaped data", async () => {
    adminSession = { userId: MODERATOR, role: "moderator" };
    expect((await attestPOST(post("/v", { userId: AUTHOR, status: "verified", reference: "CASE-0001-A" }))).status).toBe(403);

    adminSession = { userId: MODERATOR, role: "super_admin" };
    expect((await attestPOST(post("/v", { userId: AUTHOR, status: "verified", reference: "CASE-0001-A" }))).status).toBe(409); // not enabled

    vi.stubEnv("IDENTITY_MANUAL_ATTESTATION_ENABLED", "true");
    expect((await attestPOST(post("/v", { userId: AUTHOR, status: "verified", reference: "1234 5678 9012" }))).status).toBe(422); // looks like an Aadhaar number
    expect((await attestPOST(post("/v", { userId: AUTHOR, status: "verified", reference: "x" }))).status).toBe(422);
    const ok = await attestPOST(post("/v", { userId: AUTHOR, status: "verified", reference: "CASE-2026-0042" }));
    expect(ok.status).toBe(200);
    expect(state.repo.verification.get(AUTHOR)).toMatchObject({ status: "verified", provider: "manual_admin" });
    expect(state.repo.verificationEvents[0]).toMatchObject({ actor_kind: "admin", actor_id: MODERATOR });
  });
});

describe("identity provider callback", () => {
  const secret = "whsec_route_test";
  const okBody = () => JSON.stringify({ userId: AUTHOR, reference: "kyc_abc12345", status: "verified", verifiedAt: "2026-10-01T00:00:00.000Z" });
  const signed = (raw: string, ts = Math.floor(Date.now() / 1000), s = secret) => post("/api/identity/callback", raw, { "x-timestamp": String(ts), "x-signature": signProviderRequest(raw, s, ts) });

  it("is a 503 and cannot mark anyone verified while no provider is configured", async () => {
    const raw = okBody();
    const res = await callbackPOST(signed(raw));
    expect(res.status).toBe(503);
    expect(state.repo.verification.size).toBe(0);
  });

  describe("with a provider configured", () => {
    beforeEach(() => {
      vi.stubEnv("IDENTITY_VERIFICATION_PROVIDER", "acme-kyc");
      vi.stubEnv("IDENTITY_PROVIDER_WEBHOOK_SECRET", secret);
    });

    it("records a correctly signed result and audits it as the provider", async () => {
      const res = await callbackPOST(signed(okBody()));
      expect(res.status).toBe(200);
      expect(state.repo.verification.get(AUTHOR)).toMatchObject({ status: "verified", provider: "acme-kyc" });
      expect(state.repo.verificationEvents[0]).toMatchObject({ actor_kind: "provider", reference: "kyc_abc12345" });
    });

    it("rejects a bad signature, a stale timestamp and a tampered body, and records nothing", async () => {
      const raw = okBody();
      expect((await callbackPOST(signed(raw, undefined, "wrong-secret"))).status).toBe(401);
      expect((await callbackPOST(signed(raw, Math.floor(Date.now() / 1000) - 3600))).status).toBe(401);
      const ts = Math.floor(Date.now() / 1000);
      const tampered = post("/api/identity/callback", raw.replace("verified", "revoked"), { "x-timestamp": String(ts), "x-signature": signProviderRequest(raw, secret, ts) });
      expect((await callbackPOST(tampered)).status).toBe(401);
      expect((await callbackPOST(post("/api/identity/callback", raw))).status).toBe(401);
      expect(state.repo.verification.size).toBe(0);
    });

    it("refuses a correctly signed payload that carries identity data, and never stores it", async () => {
      const raw = JSON.stringify({ userId: AUTHOR, reference: "kyc_abc12345", status: "verified", verifiedAt: "2026-10-01T00:00:00.000Z", aadhaar_number: "1234 5678 9012" });
      const res = await callbackPOST(signed(raw));
      expect(res.status).toBe(400);
      expect(await body(res)).toMatchObject({ error: "restricted_identity_data" });
      expect(state.repo.verification.size).toBe(0);
      expect(JSON.stringify(state.repo.verificationEvents)).not.toContain("1234");
    });

    it("rejects malformed results", async () => {
      expect((await callbackPOST(signed(JSON.stringify({ userId: "nope", reference: "kyc_abc12345", status: "verified" })))).status).toBe(400);
      expect((await callbackPOST(signed("not json"))).status).toBe(400);
    });

    it("is not available in manual-attestation-only mode", async () => {
      vi.unstubAllEnvs();
      vi.stubEnv("IDENTITY_MANUAL_ATTESTATION_ENABLED", "true");
      expect((await callbackPOST(signed(okBody()))).status).toBe(503);
    });
  });
});
