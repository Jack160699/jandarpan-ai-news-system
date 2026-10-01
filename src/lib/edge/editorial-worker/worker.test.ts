import { afterEach, describe, expect, it, vi } from "vitest";
import { authorizeWorkerRequest, timingSafeEqualStrings } from "./auth";
import { classifyCandidateReason, classifyProviderErrorCode, classifyRunFailure } from "./classify";
import { handleEditorialWorkerRequest, WORKER_LEASE_KEY, type WorkerDeps, type WorkerResponseBody } from "./handler";
import { createWorkerLogger, redact, scrubString } from "./logging";
import { noteProviderCall } from "@/lib/ai/providers/run-telemetry";
import type { BatchEditorialResult } from "@/lib/news/ai/editorial-types";

const SECRET = "unit-test-worker-secret";
const EVENT = "0d8a5c0e-1b1f-4e0a-9c55-0123456789ab";

function batch(over: Partial<BatchEditorialResult> = {}): BatchEditorialResult {
  return {
    generated: 0, rejected: 0, published: 0, repaired: 0, skipped: 0, avgConfidence: 0,
    topStory: null, errors: [], results: [], ...over,
  };
}

function makeDeps(over: Partial<WorkerDeps> = {}) {
  const lines: string[] = [];
  const release = vi.fn(async () => {});
  const deps: WorkerDeps = {
    generate: vi.fn(async () => batch()),
    acquireLease: vi.fn(async () => ({ acquired: true, release })),
    isSchedulerEnabled: vi.fn(async () => true),
    isAnyProviderConfigured: () => true,
    isDurableQuotaConfigured: () => true,
    recordRun: vi.fn(async () => {}),
    drainBackground: vi.fn(async () => {}),
    env: { EDGE_WORKER_SECRET: SECRET, NEWSROOM_GENERATE_ARTICLES: "true" },
    newId: () => "run-id-1",
    logSink: (l) => lines.push(l),
    ...over,
  };
  return { deps, lines, release };
}

function req(body: unknown = {}, headers: Record<string, string> = {}, method = "POST") {
  return new Request("http://worker.local/", {
    method,
    headers: { authorization: `Bearer ${SECRET}`, "content-type": "application/json", ...headers },
    body: method === "GET" ? undefined : JSON.stringify(body),
  });
}

async function run(r: Request, deps: WorkerDeps) {
  const res = await handleEditorialWorkerRequest(r, deps);
  return { status: res.status, body: (await res.json()) as WorkerResponseBody };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("auth", () => {
  it("fails closed with no configured secret, rejects missing/wrong bearer, accepts either secret", () => {
    const r = (h?: string) => new Request("http://x", { headers: h ? { authorization: h } : {} });
    expect(authorizeWorkerRequest(r(`Bearer ${SECRET}`), {})).toMatchObject({ ok: false, status: 503 });
    expect(authorizeWorkerRequest(r(), { EDGE_WORKER_SECRET: SECRET })).toMatchObject({ ok: false, status: 401 });
    expect(authorizeWorkerRequest(r("Bearer nope"), { EDGE_WORKER_SECRET: SECRET })).toMatchObject({ ok: false, status: 401 });
    expect(authorizeWorkerRequest(r(`Bearer ${SECRET}`), { EDGE_WORKER_SECRET: SECRET })).toEqual({ ok: true, via: "EDGE_WORKER_SECRET" });
    expect(authorizeWorkerRequest(r("Bearer sched"), { CRON_SCHEDULER_SECRET: "sched" })).toEqual({ ok: true, via: "CRON_SCHEDULER_SECRET" });
  });

  it("compares in constant time semantics (equal/unequal/length-differing)", () => {
    expect(timingSafeEqualStrings("abc", "abc")).toBe(true);
    expect(timingSafeEqualStrings("abc", "abd")).toBe(false);
    expect(timingSafeEqualStrings("abc", "abcd")).toBe(false);
  });
});

describe("logging redaction", () => {
  it("redacts sensitive keys and credential-shaped strings, and truncates", () => {
    const out = redact({
      api_key: "sk-abcdefghijklmnopqrstuvwxyz",
      nested: { Authorization: "Bearer abcdefghijklmnop", note: "token=abc123 used Bearer abcdefghijklmnop and AIzaSyA1234567890123456789012345" },
      SUPABASE_SERVICE_ROLE_KEY: "x",
      long: "y".repeat(2000),
    }) as Record<string, any>;
    expect(out.api_key).toBe("[redacted]");
    expect(out.nested.Authorization).toBe("[redacted]");
    expect(out.SUPABASE_SERVICE_ROLE_KEY).toBe("[redacted]");
    expect(out.nested.note).not.toMatch(/abcdefghijklmnop|AIzaSy/);
    expect(out.long.length).toBeLessThan(600);
    expect(scrubString("https://x/y?key=SECRETVALUE&a=1")).toBe("https://x/y?key=[redacted]&a=1");
  });

  it("stamps every line with run_id and correlation_id", () => {
    const lines: string[] = [];
    createWorkerLogger({ run_id: "r1", correlation_id: "c1" }, (l) => lines.push(l)).info("evt", { a: 1 });
    expect(JSON.parse(lines[0]!)).toMatchObject({ run_id: "r1", correlation_id: "c1", event: "evt", service: "editorial-worker", level: "info", a: 1 });
  });
});

describe("classification", () => {
  it("maps provider codes; 401/403/invalid are never provider-retryable, 429/5xx/timeouts are", () => {
    expect(classifyProviderErrorCode("ai_unauthorized")).toEqual({ errorClass: "provider_auth", providerRetryable: false });
    expect(classifyProviderErrorCode("ai_forbidden")).toEqual({ errorClass: "provider_auth", providerRetryable: false });
    expect(classifyProviderErrorCode("ai_invalid_request")).toEqual({ errorClass: "provider_invalid_request", providerRetryable: false });
    expect(classifyProviderErrorCode("ai_rate_limit")).toEqual({ errorClass: "provider_rate_limited", providerRetryable: true });
    expect(classifyProviderErrorCode("ai_upstream_error")?.providerRetryable).toBe(true);
    expect(classifyProviderErrorCode("nope")).toBeNull();
  });

  it("classifies candidate reasons", () => {
    expect(classifyCandidateReason("llm_generation_failed")).toBe("invalid_output");
    expect(classifyCandidateReason("validation_failed:x")).toBe("validation_failed");
    expect(classifyCandidateReason("quarantine:foo")).toBe("quality_rejected");
    expect(classifyCandidateReason("RUN_BUDGET_EXHAUSTED")).toBe("llm_budget_exhausted");
    expect(classifyCandidateReason(undefined)).toBe("unclassified");
  });

  it("root cause: last failed provider call wins only when no draft succeeded", () => {
    const fail = (code: string) => ({ provider: "codecraft", model: "m", operation: "editorial_generate", endpoint: "chat.completions", success: false, latencyMs: 5, inputTokens: 0, outputTokens: 0, errorCode: code });
    const ok = { ...fail("x"), success: true, errorCode: null };
    expect(classifyRunFailure({ reason: "llm_generation_failed", calls: [fail("ai_unauthorized")] }).errorClass).toBe("provider_auth");
    expect(classifyRunFailure({ reason: "quality_checks_failed", calls: [ok] }).errorClass).toBe("quality_rejected");
  });
});

describe("handler: request gating", () => {
  it("405 on non-POST; 401/503 on bad auth; nothing runs", async () => {
    const { deps } = makeDeps();
    expect((await run(req({}, {}, "GET"), deps)).body.status).toBe("method_not_allowed");
    expect((await run(req({}, { authorization: "Bearer bad" }), deps)).status).toBe(401);
    const noSecret = makeDeps({ env: {} });
    const r = await run(req(), noSecret.deps);
    expect(r.status).toBe(503);
    expect(r.body.status).toBe("worker_secret_not_configured");
    expect(deps.generate).not.toHaveBeenCalled();
    expect(deps.acquireLease).not.toHaveBeenCalled();
  });

  it("rejects event_id in run mode; test mode is off unless explicitly enabled and needs a specific uuid", async () => {
    const { deps } = makeDeps();
    expect((await run(req({ event_id: EVENT }), deps)).body.status).toBe("bad_request");
    expect((await run(req({ mode: "test", event_id: EVENT }), deps)).body.status).toBe("test_mode_disabled");
    const t = makeDeps({ env: { EDGE_WORKER_SECRET: SECRET, NEWSROOM_GENERATE_ARTICLES: "true", EDGE_WORKER_TEST_MODE: "true" } });
    expect((await run(req({ mode: "test" }), t.deps)).body.status).toBe("bad_request");
    expect((await run(req({ mode: "test", event_id: "not-a-uuid" }), t.deps)).body.status).toBe("bad_request");
    expect(deps.generate).not.toHaveBeenCalled();
  });

  it("kill switch: a scheduler-triggered run does nothing unless scheduler_control.enabled is true (unknown counts as off)", async () => {
    for (const enabled of [false, null]) {
      const { deps } = makeDeps({ isSchedulerEnabled: vi.fn(async () => enabled) });
      const r = await run(req({}, { "x-jd-trigger": "scheduler" }), deps);
      expect(r.body.status).toBe("kill_switch_off");
      expect(deps.acquireLease).not.toHaveBeenCalled();
      expect(deps.generate).not.toHaveBeenCalled();
    }
    const on = makeDeps();
    expect((await run(req({}, { "x-jd-trigger": "scheduler" }), on.deps)).body.status).toBe("no_eligible_item");
  });

  it("skips when generation is not enabled or no provider is configured", async () => {
    const a = makeDeps({ env: { EDGE_WORKER_SECRET: SECRET } });
    expect((await run(req(), a.deps)).body.status).toBe("not_enabled");
    const b = makeDeps({ isAnyProviderConfigured: () => false });
    expect((await run(req(), b.deps)).body.status).toBe("no_ai_provider");
    expect(a.deps.generate).not.toHaveBeenCalled();
    expect(b.deps.generate).not.toHaveBeenCalled();
  });
});

describe("handler: durable quota (limits must be enforceable across isolates)", () => {
  it("run mode refuses to spend AI budget without shared quota storage", async () => {
    const { deps } = makeDeps({ isDurableQuotaConfigured: () => false });
    const r = await run(req(), deps);
    expect(r.body).toMatchObject({ ok: false, status: "durable_quota_unavailable" });
    expect(deps.acquireLease).not.toHaveBeenCalled();
    expect(deps.generate).not.toHaveBeenCalled();
  });

  it("run mode refuses when Redis is configured but the atomic EVAL round-trip fails (no silent per-isolate fallback)", async () => {
    const { deps } = makeDeps({ verifyDurableQuota: vi.fn(async () => false) });
    const r = await run(req(), deps);
    expect(r.body).toMatchObject({ ok: false, status: "durable_quota_unavailable", error_reason: "durable_quota_unverified" });
    expect(deps.acquireLease).not.toHaveBeenCalled();
    expect(deps.generate).not.toHaveBeenCalled();
  });

  it("run mode proceeds when the durable-quota round-trip succeeds", async () => {
    const { deps } = makeDeps({ verifyDurableQuota: vi.fn(async () => true) });
    await run(req(), deps);
    expect(deps.generate).toHaveBeenCalledTimes(1);
  });

  it("test mode may proceed with ephemeral quota (one dry-run story) and says so in the log", async () => {
    const { deps, lines } = makeDeps({
      isDurableQuotaConfigured: () => false,
      env: { EDGE_WORKER_SECRET: SECRET, NEWSROOM_GENERATE_ARTICLES: "true", EDGE_WORKER_TEST_MODE: "true" },
    });
    await run(req({ mode: "test", event_id: EVENT }), deps);
    expect(deps.generate).toHaveBeenCalledTimes(1);
    expect(lines.some((l) => JSON.parse(l).event === "ephemeral_quota")).toBe(true);
  });
});

describe("handler: quota_probe (read-only Redis diagnostic)", () => {
  it("is authenticated, never touches the lease, the kill switch or the AI, and reports atomicity", async () => {
    const { deps } = makeDeps({
      verifyDurableQuota: vi.fn(async () => true),
      probeQuotaAtomicity: vi.fn(async () => ({ winners: 3, limit: 3, parallel: 20 })),
    });
    const r = await run(req({ mode: "quota_probe" }), deps);
    expect(r.body).toMatchObject({ ok: true, status: "quota_probe_ok", quota_probe: { configured: true, verified: true, atomic: true, winners: 3 } });
    expect(deps.acquireLease).not.toHaveBeenCalled();
    expect(deps.isSchedulerEnabled).not.toHaveBeenCalled();
    expect(deps.generate).not.toHaveBeenCalled();
  });

  it("fails when the counters are not atomic or Redis is missing", async () => {
    const bad = makeDeps({ verifyDurableQuota: async () => true, probeQuotaAtomicity: async () => ({ winners: 9, limit: 3, parallel: 20 }) });
    expect((await run(req({ mode: "quota_probe" }), bad.deps)).body).toMatchObject({ ok: false, status: "quota_probe_failed" });
    const none = makeDeps({ isDurableQuotaConfigured: () => false });
    expect((await run(req({ mode: "quota_probe" }), none.deps)).body).toMatchObject({ ok: false, status: "quota_probe_failed", quota_probe: { configured: false } });
  });
});

describe("handler: lease (shared with the Vercel lane)", () => {
  it("uses the existing editorial-generate lease key and skips cleanly when it is held", async () => {
    const { deps } = makeDeps({ acquireLease: vi.fn(async () => ({ acquired: false, release: async () => {} })) });
    const r = await run(req(), deps);
    expect(r.body.status).toBe("overlap_lock");
    expect(r.body.ok).toBe(true);
    expect(deps.acquireLease).toHaveBeenCalledWith(WORKER_LEASE_KEY, 240);
    expect(WORKER_LEASE_KEY).toBe("editorial-generate");
    expect(deps.generate).not.toHaveBeenCalled();
  });

  it("fails closed when the lease cannot be verified (no generation, 500 internal_error)", async () => {
    const { deps } = makeDeps({ acquireLease: vi.fn(async () => { throw new Error("lease_unavailable: db down"); }) });
    const r = await run(req(), deps);
    expect(r.status).toBe(500);
    expect(r.body.status).toBe("internal_error");
    expect(deps.generate).not.toHaveBeenCalled();
  });

  it("test mode may use a separate lease key so it never blocks a real run", async () => {
    const t = makeDeps({ env: { EDGE_WORKER_SECRET: SECRET, NEWSROOM_GENERATE_ARTICLES: "true", EDGE_WORKER_TEST_MODE: "true" } });
    await run(req({ mode: "test", event_id: EVENT, lease_key: "editorial-generate-edge-test" }), t.deps);
    expect(t.deps.acquireLease).toHaveBeenCalledWith("editorial-generate-edge-test", 240);
    // run mode ignores a supplied lease_key entirely
    const r = makeDeps();
    await run(req({ lease_key: "other" }), r.deps);
    expect(r.deps.acquireLease).toHaveBeenCalledWith("editorial-generate", 240);
  });
});

describe("handler: exactly one item per invocation", () => {
  it("calls the generator once with limit 1, no update pass, stop after first LLM call; publishes and records the run", async () => {
    const { deps, release, lines } = makeDeps({
      generate: vi.fn(async () => {
        noteProviderCall({ provider: "gemini", model: "gemini-x", operation: "editorial_generate", endpoint: "chat.completions", success: true, latencyMs: 1200, inputTokens: 900, outputTokens: 700, errorCode: null });
        return batch({ generated: 1, published: 1, results: [{ eventId: EVENT, articleId: "art-1", ok: true, published: true }] });
      }),
    });
    const r = await run(req({}, { "x-correlation-id": "corr-9", "x-jd-trigger": "scheduler" }), deps);
    expect(r.body).toMatchObject({ ok: true, status: "published", event_id: EVENT, article_id: "art-1", published: true, provider: "gemini", model: "gemini-x", correlation_id: "corr-9", run_id: "run-id-1", dry_run: false });
    expect(r.body.llm).toMatchObject({ used: 0, max: 2 });
    expect(r.body.llm.totals).toMatchObject({ calls: 1, inputTokens: 900, outputTokens: 700 });
    expect(deps.generate).toHaveBeenCalledTimes(1);
    expect(deps.generate).toHaveBeenCalledWith(expect.objectContaining({ limit: 1, skipUpdates: true, stopAfterLlmCall: true, dryRun: false, maxAttempts: 3 }));
    expect(release).toHaveBeenCalledTimes(1);
    expect(deps.recordRun).toHaveBeenCalledWith(expect.objectContaining({ ok: true, processed: 1, runId: "run-id-1" }));
    expect(lines.map((l) => JSON.parse(l).event)).toEqual(expect.arrayContaining(["run_start", "lease_acquired", "run_complete"]));
    expect(lines.join("\n")).not.toContain(SECRET);
  });

  it("no eligible item -> ok, degraded run recorded, lease released", async () => {
    const { deps, release } = makeDeps();
    const r = await run(req(), deps);
    expect(r.body.status).toBe("no_eligible_item");
    expect(r.body.event_id).toBeNull();
    expect(release).toHaveBeenCalledTimes(1);
    expect(deps.recordRun).toHaveBeenCalledWith(expect.objectContaining({ degraded: true, skipped: 1 }));
  });

  it("provider auth failure: classified non-retryable, generator called ONCE (no immediate retry), lease released", async () => {
    const { deps, release } = makeDeps({
      generate: vi.fn(async () => {
        noteProviderCall({ provider: "codecraft", model: "m", operation: "editorial_generate", endpoint: "chat.completions", success: false, latencyMs: 90, inputTokens: 0, outputTokens: 0, errorCode: "ai_unauthorized" });
        return batch({ rejected: 0, skipped: 1, results: [{ eventId: EVENT, ok: false, reason: "llm_generation_failed" }] });
      }),
    });
    const r = await run(req(), deps);
    expect(r.body).toMatchObject({ ok: false, status: "failed", error_class: "provider_auth", provider_retryable: false, event_id: EVENT });
    expect(deps.generate).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(1);
    expect(deps.recordRun).toHaveBeenCalledWith(expect.objectContaining({ ok: false, failed: 1 }));
  });

  it("rate limited (429): classified retryable at provider level, still not retried in-run", async () => {
    const { deps } = makeDeps({
      generate: vi.fn(async () => {
        noteProviderCall({ provider: "groq", model: "m", operation: "editorial_generate", endpoint: "chat.completions", success: false, latencyMs: 40, inputTokens: 0, outputTokens: 0, errorCode: "ai_rate_limit" });
        return batch({ skipped: 1, results: [{ eventId: EVENT, ok: false, reason: "llm_generation_failed" }] });
      }),
    });
    const r = await run(req(), deps);
    expect(r.body).toMatchObject({ status: "failed", error_class: "provider_rate_limited", provider_retryable: true });
    expect(deps.generate).toHaveBeenCalledTimes(1);
  });

  it("generator exception -> 500 internal_error, secrets not logged, lease released", async () => {
    const { deps, release, lines } = makeDeps({ generate: vi.fn(async () => { throw new Error(`boom Bearer ${SECRET}xxxxxxxx`); }) });
    const r = await run(req(), deps);
    expect(r.status).toBe(500);
    expect(r.body.status).toBe("internal_error");
    expect(release).toHaveBeenCalledTimes(1);
    expect(lines.join("\n")).not.toContain(SECRET);
  });
});

describe("handler: safe test mode", () => {
  const testEnv = { EDGE_WORKER_SECRET: SECRET, NEWSROOM_GENERATE_ARTICLES: "true", EDGE_WORKER_TEST_MODE: "true" };

  it("processes exactly the selected event, dry by default: nothing persisted, no run record", async () => {
    const { deps } = makeDeps({
      env: testEnv,
      generate: vi.fn(async () =>
        batch({ results: [{ eventId: EVENT, ok: true, published: false, dryRun: true, reason: "dry_run_publish_allowed", draftPreview: { headline: "H", summary: "S", language: "hi", bodyChars: 1200, publishAllowed: true, hardReject: false } }] })
      ),
    });
    const r = await run(req({ mode: "test", event_id: EVENT }), deps);
    expect(r.body).toMatchObject({ status: "dry_run_ok", dry_run: true, mode: "test", event_id: EVENT, headline_preview: "H", published: false });
    expect(deps.generate).toHaveBeenCalledWith(expect.objectContaining({ eventId: EVENT, dryRun: true, limit: 1 }));
    expect(deps.recordRun).not.toHaveBeenCalled();
  });

  it("persisting requires dry_run:false explicitly", async () => {
    const { deps } = makeDeps({ env: testEnv });
    await run(req({ mode: "test", event_id: EVENT, dry_run: false }), deps);
    expect(deps.generate).toHaveBeenCalledWith(expect.objectContaining({ dryRun: false, eventId: EVENT }));
    expect(deps.recordRun).toHaveBeenCalled();
  });

  it("a gated dry run reports the failure class", async () => {
    const { deps } = makeDeps({
      env: testEnv,
      generate: vi.fn(async () => batch({ results: [{ eventId: EVENT, ok: false, dryRun: true, reason: "dry_run_gated" }] })),
    });
    const r = await run(req({ mode: "test", event_id: EVENT }), deps);
    expect(r.body).toMatchObject({ status: "dry_run_gated", error_class: "quality_rejected" });
  });
});

describe("handler: log capture for secret scanning (test mode only, opt-in)", () => {
  const testEnv = { EDGE_WORKER_SECRET: SECRET, NEWSROOM_GENERATE_ARTICLES: "true", EDGE_WORKER_TEST_MODE: "true" };

  it("returns every console line the run emitted (including library output) and restores console", async () => {
    const before = console.warn;
    const { deps } = makeDeps({
      env: testEnv,
      logSink: undefined, // production default: console.log, which is what the capture sees
      generate: vi.fn(async () => {
        console.warn("[lib] something from a dependency");
        return batch();
      }),
    });
    const r = await run(req({ mode: "test", event_id: EVENT, include_logs: true }), deps);
    expect(r.body.debug_logs?.some((l) => l.includes("[lib] something from a dependency"))).toBe(true);
    expect(r.body.debug_logs?.some((l) => l.includes('"event":"run_start"'))).toBe(true);
    expect(r.body.runtime_probe).toBeTruthy();
    expect(console.warn).toBe(before); // restored
  });

  it("is never returned in run mode, or when not requested", async () => {
    const a = makeDeps();
    expect((await run(req({ include_logs: true }), a.deps)).body.debug_logs).toBeUndefined();
    const b = makeDeps({ env: testEnv });
    expect((await run(req({ mode: "test", event_id: EVENT }), b.deps)).body.debug_logs).toBeUndefined();
  });
});

describe("handler: wall-clock deadline", () => {
  it("returns deadline_exceeded and does NOT release the lease (TTL expires it; never risk an overlap)", async () => {
    vi.useFakeTimers();
    const { deps, release } = makeDeps({ generate: vi.fn(() => new Promise<BatchEditorialResult>(() => {})) });
    const p = handleEditorialWorkerRequest(req(), deps);
    await vi.advanceTimersByTimeAsync(136_000);
    const res = await p;
    const body = (await res.json()) as WorkerResponseBody;
    expect(body.status).toBe("deadline_exceeded");
    expect(body.ok).toBe(false);
    expect(release).not.toHaveBeenCalled();
  });
});
