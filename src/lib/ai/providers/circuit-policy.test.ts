import { describe, expect, it } from "vitest";
import {
  circuitCooldownMs,
  classifyCircuitFailure,
  effectiveTimeoutMs,
  looksLikeModelUnavailable,
} from "@/lib/ai/providers/circuit-policy";

const base = {
  code: "x",
  message: "",
  authFailure: false,
  rateLimited: false,
  invalidRequest: false,
};

describe("circuit-policy", () => {
  it("treats a nonexistent model as a long-lived config failure", () => {
    const err = {
      ...base,
      httpStatus: 404,
      invalidRequest: true,
      message: "The model `deepseek-v4-pro-max` does not exist",
    };
    expect(looksLikeModelUnavailable(err)).toBe(true);
    expect(classifyCircuitFailure({ ...err, consecutiveFailures: 1 })).toBe("model_unavailable");
    expect(circuitCooldownMs({ ...err, consecutiveFailures: 1 })).toBe(6 * 3_600_000);
  });

  it("does not treat a generic 400 (bad prompt) as a dead model", () => {
    const err = { ...base, httpStatus: 400, invalidRequest: true, message: "prompt too long" };
    expect(looksLikeModelUnavailable(err)).toBe(false);
    expect(classifyCircuitFailure({ ...err, consecutiveFailures: 1 })).toBe("transient");
  });

  it("escalates transient cooldowns and caps them", () => {
    const t = (n: number) => circuitCooldownMs({ ...base, code: "ai_timeout", consecutiveFailures: n });
    expect(t(1)).toBe(120_000);
    expect(t(2)).toBe(240_000);
    expect(t(10)).toBe(30 * 60_000);
  });

  it("escalates rate-limit cooldowns from 60s to a 15m cap", () => {
    const r = (n: number) => circuitCooldownMs({ ...base, rateLimited: true, consecutiveFailures: n });
    expect(r(1)).toBe(60_000);
    expect(r(3)).toBe(240_000);
    expect(r(20)).toBe(15 * 60_000);
  });

  it("uses a 30m cooldown for auth failures", () => {
    expect(circuitCooldownMs({ ...base, authFailure: true, consecutiveFailures: 1 })).toBe(30 * 60_000);
  });

  it("caps per-attempt timeouts per provider and honours env overrides", () => {
    expect(effectiveTimeoutMs("codecraft", 90_000, {})).toBe(60_000);
    expect(effectiveTimeoutMs("gemini", 90_000, {})).toBe(40_000);
    expect(effectiveTimeoutMs("gemini", 10_000, {})).toBe(10_000);
    expect(effectiveTimeoutMs("gemini", 90_000, { AI_PROVIDER_TIMEOUT_CAP_MS_GEMINI: "20000" })).toBe(20_000);
    expect(effectiveTimeoutMs("groq", undefined, {})).toBe(30_000);
  });
});
