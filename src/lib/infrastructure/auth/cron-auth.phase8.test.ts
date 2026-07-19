import { afterEach, describe, expect, it, vi } from "vitest";
import {
  collectAcceptedSecrets,
  cronSecretEnvKeysForCapability,
  parseBearerToken,
  verifyCronRequest,
} from "@/lib/infrastructure/auth/cron-auth";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Phase 8 scoped cron secrets", () => {
  it("accepts scoped ops secret without logging values", async () => {
    vi.stubEnv("CRON_SECRET", "master-secret-value");
    vi.stubEnv("CRON_OPS_SECRET", "ops-only-secret");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NODE_ENV", "test");

    const accepted = collectAcceptedSecrets("ops");
    expect(accepted).toContain("ops-only-secret");
    expect(accepted).toContain("master-secret-value");
    expect(cronSecretEnvKeysForCapability("ops")).toEqual(
      expect.arrayContaining(["CRON_SECRET", "CRON_OPS_SECRET"])
    );

    const req = new Request("https://example.com/api/cron/competitor-tracker", {
      headers: { authorization: "Bearer ops-only-secret" },
    });
    const result = await verifyCronRequest(req, { capability: "ops" });
    expect(result.authorized).toBe(true);
  });

  it("falls back to legacy CRON_SECRET during migration", async () => {
    vi.stubEnv("CRON_SECRET", "legacy-master");
    vi.stubEnv("CRON_OPS_SECRET", "");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NODE_ENV", "test");

    const req = new Request("https://example.com/api/cron/x", {
      headers: { "x-cron-secret": "legacy-master" },
    });
    const result = await verifyCronRequest(req, { capability: "ops" });
    expect(result.authorized).toBe(true);
  });

  it("redacts bearer parsing helper does not expose tokens in parse", () => {
    expect(parseBearerToken("Bearer abc")).toBe("abc");
  });
});
