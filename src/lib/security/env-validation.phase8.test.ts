import { afterEach, describe, expect, it } from "vitest";
import {
  listExpectedProductionEnvNames,
  validateProductionEnv,
} from "@/lib/security/env-validation";

const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("Phase 8 environment validation", () => {
  it("lists expected variable names without values", () => {
    const names = listExpectedProductionEnvNames();
    expect(names.required).toContain("CRON_SECRET");
    expect(names.recommendedScopedCron).toEqual(
      expect.arrayContaining([
        "CRON_INGEST_SECRET",
        "CRON_PIPELINE_SECRET",
        "CRON_OPS_SECRET",
        "CRON_ADMIN_SECRET",
      ])
    );
    expect(names.optionalIntegrations).toContain("GOOGLE_CSE_API_KEY");
  });

  it("treats Google CSE and Redis as optional warns, not errors", () => {
    process.env.VERCEL_ENV = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-not-jwt-like";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
    process.env.CRON_SECRET = "cron";
    process.env.NEWSROOM_SUPER_ADMIN_EMAILS = "a@b.com";
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.jandarpan.news";
    process.env.AI_LOCAL_ENRICH_ENABLED = "false";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.GOOGLE_CSE_API_KEY;
    delete process.env.ENABLE_E2E_AUTH;
    delete process.env.ADMIN_EMERGENCY_MODE;

    const issues = validateProductionEnv();
    const errors = issues.filter((i) => i.severity === "error");
    expect(errors).toHaveLength(0);
    expect(issues.some((i) => i.key === "GOOGLE_CSE_API_KEY" && i.class === "optional")).toBe(
      true
    );
    expect(issues.some((i) => i.key === "UPSTASH_REDIS_REST_URL" && i.class === "optional")).toBe(
      true
    );
  });
});
