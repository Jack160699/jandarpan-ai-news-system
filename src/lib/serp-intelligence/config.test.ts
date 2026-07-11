import { describe, expect, it } from "vitest";
import { isSerpTrackerEnabled, hasSerpProviderConfigured } from "@/lib/serp-intelligence/config";
import { isValidKeyword, normalizeKeyword } from "@/lib/serp-intelligence/keywords";

describe("config", () => {
  it("reads feature flag from env", () => {
    const prev = process.env.SEO_SERP_TRACKER;
    process.env.SEO_SERP_TRACKER = "true";
    expect(isSerpTrackerEnabled()).toBe(true);
    process.env.SEO_SERP_TRACKER = prev;
  });

  it("detects provider configuration", () => {
    const prevSerp = process.env.SERPAPI_KEY;
    const prevCse = process.env.GOOGLE_CSE_API_KEY;
    const prevCx = process.env.GOOGLE_CSE_CX;

    delete process.env.SERPAPI_KEY;
    delete process.env.GOOGLE_CSE_API_KEY;
    delete process.env.GOOGLE_CSE_CX;
    expect(hasSerpProviderConfigured()).toBe(false);

    process.env.SERPAPI_KEY = "test";
    expect(hasSerpProviderConfigured()).toBe(true);

    process.env.SERPAPI_KEY = prevSerp;
    process.env.GOOGLE_CSE_API_KEY = prevCse;
    process.env.GOOGLE_CSE_CX = prevCx;
  });
});

describe("keywords", () => {
  it("normalizes and validates keywords", () => {
    expect(normalizeKeyword("  Raipur   news  ")).toBe("Raipur news");
    expect(isValidKeyword("ab")).toBe(true);
    expect(isValidKeyword("")).toBe(false);
    expect(isValidKeyword("x".repeat(201))).toBe(false);
  });
});
