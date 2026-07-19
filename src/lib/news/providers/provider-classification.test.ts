import { describe, expect, it } from "vitest";
import {
  classifyProvider,
  isRequiredProvider,
  summarizeProviderOutcomes,
} from "./provider-classification";

describe("provider classification", () => {
  it("classifies known providers", () => {
    expect(classifyProvider("persistence")).toBe("required");
    expect(classifyProvider("newsdata")).toBe("preferred");
    expect(classifyProvider("gnews")).toBe("optional");
    expect(classifyProvider("rss")).toBe("preferred");
  });

  it("defaults unknown providers to optional", () => {
    expect(classifyProvider("some-random-feed")).toBe("optional");
  });

  it("only persistence is required", () => {
    expect(isRequiredProvider("persistence")).toBe(true);
    expect(isRequiredProvider("gnews")).toBe(false);
  });
});

describe("summarizeProviderOutcomes", () => {
  it("separates required from optional failures", () => {
    const s = summarizeProviderOutcomes([
      { id: "persistence", ok: false },
      { id: "gnews", ok: false },
      { id: "newsdata", ok: true },
    ]);
    expect(s.requiredProviderFailures).toEqual(["persistence"]);
    expect(s.optionalProviderFailures).toEqual(["gnews"]);
    expect(s.newsFamilyHealthy).toBe(true);
  });

  it("ignores disabled and retired provider failures", () => {
    const s = summarizeProviderOutcomes([
      { id: "dead-feed", ok: false, classification: "retired" },
      { id: "off-feed", ok: false, classification: "disabled" },
      { id: "rss", ok: true },
    ]);
    expect(s.requiredProviderFailures).toHaveLength(0);
    expect(s.optionalProviderFailures).toHaveLength(0);
    expect(s.newsFamilyHealthy).toBe(true);
  });

  it("flags newsFamilyHealthy false when no source produced", () => {
    const s = summarizeProviderOutcomes([
      { id: "persistence", ok: true },
      { id: "newsdata", ok: false },
      { id: "gnews", ok: false },
      { id: "rss", ok: false },
    ]);
    expect(s.newsFamilyHealthy).toBe(false);
    expect(s.optionalProviderFailures).toEqual(["newsdata", "gnews", "rss"]);
  });
});
