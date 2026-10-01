import { describe, expect, it } from "vitest";
import {
  cosineSimilarity,
  decideDuplicate,
  dedupeMode,
  dedupeThresholds,
  embeddingTextFor,
} from "@/lib/news/dedupe/cross-language";

const T = { sameLanguage: 0.88, crossLanguage: 0.82 };

describe("cross-language duplicate decision", () => {
  it("flags a same-language near-duplicate", () => {
    expect(decideDuplicate({ similarity: 0.91, candidateLanguage: "hi", matchedLanguage: "hi", thresholds: T })).toBe("duplicate_same_language");
    expect(decideDuplicate({ similarity: 0.86, candidateLanguage: "hi", matchedLanguage: "hi", thresholds: T })).toBe("distinct");
  });

  it("recognises the same story in another language at the (lower) cross-language threshold", () => {
    expect(decideDuplicate({ similarity: 0.84, candidateLanguage: "en", matchedLanguage: "hi", thresholds: T })).toBe("cross_language_variant");
    expect(decideDuplicate({ similarity: 0.79, candidateLanguage: "en", matchedLanguage: "hi", thresholds: T })).toBe("distinct");
  });

  it("does not use exact string equality — only similarity", () => {
    expect(decideDuplicate({ similarity: 0.9, candidateLanguage: "en", matchedLanguage: "hi", thresholds: T })).toBe("cross_language_variant");
  });
});

describe("config", () => {
  it("defaults to shadow mode (measure, never block) and accepts off/enforce", () => {
    expect(dedupeMode({})).toBe("shadow");
    expect(dedupeMode({ CROSS_LANG_DEDUPE_MODE: "enforce" })).toBe("enforce");
    expect(dedupeMode({ CROSS_LANG_DEDUPE_MODE: "OFF" })).toBe("off");
    expect(dedupeMode({ CROSS_LANG_DEDUPE_MODE: "banana" })).toBe("shadow");
  });

  it("reads thresholds from env and ignores nonsense", () => {
    expect(dedupeThresholds({})).toEqual({ sameLanguage: 0.88, crossLanguage: 0.82 });
    expect(dedupeThresholds({ CROSS_LANG_SIM_THRESHOLD: "0.8", SAME_LANG_SIM_THRESHOLD: "0.9" })).toEqual({ sameLanguage: 0.9, crossLanguage: 0.8 });
    expect(dedupeThresholds({ CROSS_LANG_SIM_THRESHOLD: "0.1", SAME_LANG_SIM_THRESHOLD: "abc" })).toEqual({ sameLanguage: 0.88, crossLanguage: 0.82 });
  });
});

describe("helpers", () => {
  it("cosine similarity", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
    expect(cosineSimilarity([1, 1], [2, 2])).toBeCloseTo(1);
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([1], [1, 2])).toBe(0);
  });

  it("builds the embedded text from headline + summary", () => {
    expect(embeddingTextFor("Heavy rain in Raipur", "Roads flooded.")).toBe("Heavy rain in Raipur. Roads flooded.");
    expect(embeddingTextFor("Only headline")).toBe("Only headline.");
    expect(embeddingTextFor("H", "x".repeat(1000)).length).toBeLessThan(410);
  });
});

import { duplicateRejectionReason } from "./cross-language";

describe("duplicateRejectionReason (final drafted-text check)", () => {
  it("rejects only ENFORCED, non-distinct decisions", () => {
    expect(duplicateRejectionReason({ decision: "duplicate_same_language", enforced: true })).toBe("duplicate_published_story");
    expect(duplicateRejectionReason({ decision: "cross_language_variant", enforced: true })).toBe("duplicate_cross_language_variant");
  });
  it("shadow mode and distinct stories never block", () => {
    expect(duplicateRejectionReason({ decision: "duplicate_same_language", enforced: false })).toBeNull();
    expect(duplicateRejectionReason({ decision: "distinct", enforced: true })).toBeNull();
    expect(duplicateRejectionReason({ decision: "distinct", enforced: false })).toBeNull();
  });
});
