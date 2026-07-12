import { describe, expect, it, vi, afterEach } from "vitest";
import { isMonetizationV3Enabled } from "./config";

describe("isMonetizationV3Enabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is disabled by default", () => {
    vi.stubEnv("NEXT_PUBLIC_MONETIZATION_V3", undefined);
    expect(isMonetizationV3Enabled()).toBe(false);
  });

  it("is enabled when NEXT_PUBLIC_MONETIZATION_V3=1", () => {
    vi.stubEnv("NEXT_PUBLIC_MONETIZATION_V3", "1");
    expect(isMonetizationV3Enabled()).toBe(true);
  });

  it("is disabled for other values", () => {
    vi.stubEnv("NEXT_PUBLIC_MONETIZATION_V3", "0");
    expect(isMonetizationV3Enabled()).toBe(false);
  });
});
