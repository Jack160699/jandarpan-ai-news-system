import { describe, expect, it } from "vitest";
import {
  clusterKeyFromKeywords,
  jaccardSimilarity,
  tokenize,
} from "@/lib/seo-intelligence/text-utils";

describe("seo text utils", () => {
  it("tokenizes hindi and english text", () => {
    const tokens = tokenize("रायपुर में heavy rain alert");
    expect(tokens.length).toBeGreaterThan(2);
  });

  it("computes jaccard similarity", () => {
    const score = jaccardSimilarity(
      "रायपुर में बारिश की चेतावनी",
      "रायपुर बारिश अलर्ट मौसम"
    );
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("builds stable cluster keys", () => {
    expect(clusterKeyFromKeywords(["बारिश", "रायपुर", "मौसम"])).toBe(
      clusterKeyFromKeywords(["मौसम", "रायपुर", "बारिश"])
    );
  });
});
