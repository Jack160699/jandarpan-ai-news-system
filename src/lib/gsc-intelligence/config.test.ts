import { describe, expect, it } from "vitest";
import {
  hasGscCredentialsConfigured,
  isGscEngineEnabled,
} from "@/lib/gsc-intelligence/config";
import { formatGscDate, daysAgo } from "@/lib/gsc-intelligence/client";

describe("config", () => {
  it("reads GSC feature flag", () => {
    const prev = process.env.SEO_GSC_ENGINE;
    process.env.SEO_GSC_ENGINE = "true";
    expect(isGscEngineEnabled()).toBe(true);
    process.env.SEO_GSC_ENGINE = prev;
  });

  it("detects credentials", () => {
    const prevJson = process.env.GSC_SERVICE_ACCOUNT_JSON;
    process.env.GSC_SERVICE_ACCOUNT_JSON = '{"client_email":"x","private_key":"y"}';
    expect(hasGscCredentialsConfigured()).toBe(true);
    process.env.GSC_SERVICE_ACCOUNT_JSON = prevJson;
  });
});

describe("client dates", () => {
  it("formats GSC dates", () => {
    const d = new Date("2026-07-11T12:00:00.000Z");
    expect(formatGscDate(d)).toBe("2026-07-11");
    expect(daysAgo(7, d)).toBe("2026-07-04");
  });
});
