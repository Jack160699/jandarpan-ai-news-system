import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/infrastructure/cache/redis", () => ({
  isRedisConfigured: () => false, // reserveQuota uses its in-memory path; the arithmetic under test is identical
  redisEval: vi.fn(async () => null),
  redisGet: vi.fn(async () => null),
  redisIncrBy: vi.fn(async () => null),
  redisDel: vi.fn(async () => {}),
}));

import { PROBE_MODEL_RE, governorProbe, sanitizeProviderMessage } from "./governor-probe";
import { __resetQuotaCountersForTests } from "@/lib/ai/providers/quota";

beforeEach(() => __resetQuotaCountersForTests());

describe("governor probe (internal codecraft limits)", () => {
  it("allows exactly the internal RPM (6) of 10 parallel reservations and reports the conservative limits", async () => {
    const r = await governorProbe({ phase: "reserve", model: "edge-probe-abcd1234" });
    expect(r.limits).toEqual({ rpm: 6, tpm: 30_000, rpd: 300, tpd: 400_000, max_concurrent: 1 });
    expect(r.allowed).toBe(6);
    expect(r.denied).toBe(4);
    expect(r.denied_scopes).toEqual(["rpm"]);
    expect(r.cleaned_up).toBe(false);
  });

  it("a later observe phase on the same model is denied outright (shared window) and cleans up", async () => {
    await governorProbe({ phase: "reserve", model: "edge-probe-abcd1234" });
    const r = await governorProbe({ phase: "observe", model: "edge-probe-abcd1234" });
    expect(r.allowed).toBe(0);
    expect(r.denied_scopes).toEqual(["rpm"]);
    expect(r.cleaned_up).toBe(true);
  });

  it("caps concurrency at 1 and frees the slot on release", async () => {
    const r = await governorProbe({ phase: "reserve", model: "edge-probe-conc0001" });
    expect(r.concurrency).toEqual({ max: 1, first_acquired: true, second_acquired: false, after_release_acquired: true });
  });

  it("sanitises provider error text before it is returned", () => {
    expect(sanitizeProviderMessage("bad Bearer abc.def-123 token")).toBe("bad Bearer [redacted] token");
    expect(sanitizeProviderMessage("x".repeat(500))).toHaveLength(240);
    expect(sanitizeProviderMessage(undefined)).toBe("");
  });

  it("only throwaway probe model names are accepted", () => {
    expect(PROBE_MODEL_RE.test("edge-probe-abcd1234")).toBe(true);
    for (const bad of ["deepseek-v4-pro-0813", "edge-probe-", "edge-probe-AB", "x edge-probe-abcd", "edge-probe-../etc"]) expect(PROBE_MODEL_RE.test(bad)).toBe(false);
  });
});
