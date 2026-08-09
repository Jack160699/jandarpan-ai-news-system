import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isLocalEnrichEnabled,
  isLocalEnrichMisconfiguredForProduction,
} from "@/lib/ai/providers/local-enrich-flag";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Phase 8 AI_LOCAL_ENRICH_ENABLED", () => {
  it("is enabled by default in production free-capacity mode", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NODE_ENV", "production");
    // Unset local override; free-capacity mode provides the safe default.
    vi.stubEnv("AI_LOCAL_ENRICH_ENABLED", "");
    vi.stubEnv("AI_FREE_CAPACITY_MODE", "true");
    expect(isLocalEnrichEnabled()).toBe(true);
    expect(isLocalEnrichMisconfiguredForProduction()).toBe(false);
  });

  it("respects explicit false in production", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("AI_LOCAL_ENRICH_ENABLED", "false");
    vi.stubEnv("AI_FREE_CAPACITY_MODE", "false");
    expect(isLocalEnrichEnabled()).toBe(false);
    expect(isLocalEnrichMisconfiguredForProduction()).toBe(false);
  });
});
