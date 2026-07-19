import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isLocalEnrichEnabled,
  isLocalEnrichMisconfiguredForProduction,
} from "@/lib/ai/providers/local-enrich-flag";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Phase 8 AI_LOCAL_ENRICH_ENABLED", () => {
  it("is disabled by default in production", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NODE_ENV", "production");
    // Unset → not "true"/"false"; production must stay disabled.
    vi.stubEnv("AI_LOCAL_ENRICH_ENABLED", "");
    expect(isLocalEnrichEnabled()).toBe(false);
    expect(isLocalEnrichMisconfiguredForProduction()).toBe(true);
  });

  it("respects explicit false in production", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("AI_LOCAL_ENRICH_ENABLED", "false");
    expect(isLocalEnrichEnabled()).toBe(false);
    expect(isLocalEnrichMisconfiguredForProduction()).toBe(false);
  });
});
