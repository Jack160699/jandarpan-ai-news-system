import { describe, expect, it } from "vitest";
import { depthRejectThreshold } from "@/lib/news/ai/article-type";
import {
  assessEvidenceViability,
  factPackCharsPerFloorWord,
  minFactPackCharsForType,
} from "@/lib/news/ai/evidence-viability";

describe("evidence viability", () => {
  it("keeps the type when the fact pack supports its own floor", () => {
    const r = assessEvidenceViability({ articleType: "short_update", factPackChars: 920, env: {} });
    expect(r).toMatchObject({ viable: true, articleType: "short_update", demotedFrom: null, reason: null });
  });

  it("demotes standard_report to short_update instead of padding", () => {
    // standard_report floor 382 words -> 1146 chars at the default ratio; 957 chars (a real published pack) is below it.
    const r = assessEvidenceViability({ articleType: "standard_report", factPackChars: 957, env: {} });
    expect(r.viable).toBe(true);
    expect(r.articleType).toBe("short_update");
    expect(r.demotedFrom).toBe("standard_report");
  });

  it("never demotes an ordinary story into breaking_alert; it reports not viable", () => {
    const need = minFactPackCharsForType("short_update", {});
    const r = assessEvidenceViability({ articleType: "short_update", factPackChars: need - 1, env: {} });
    expect(r.viable).toBe(false);
    expect(r.articleType).toBe("short_update");
    expect(r.reason).toBe(`evidence_below_floor:short_update:${need - 1}<${need}`);
  });

  it("walks the whole ladder for an explainer with a tiny pack and stops at short_update", () => {
    const r = assessEvidenceViability({ articleType: "explainer", factPackChars: 100, env: {} });
    expect(r.viable).toBe(false);
    expect(r.articleType).toBe("short_update");
    expect(r.demotedFrom).toBe("explainer");
  });

  it("does not lower any floor: the required chars scale with the type's own reject threshold", () => {
    for (const t of ["short_update", "standard_report", "developing_story", "explainer"] as const) {
      expect(minFactPackCharsForType(t, {})).toBe(Math.ceil(depthRejectThreshold(t) * 3));
    }
  });

  it("is not triggered by anything that has actually published (smallest published packs ~800-916 chars)", () => {
    expect(assessEvidenceViability({ articleType: "breaking_alert", factPackChars: 802, env: {} }).viable).toBe(true);
    expect(assessEvidenceViability({ articleType: "short_update", factPackChars: 916, env: {} }).viable).toBe(true);
    expect(assessEvidenceViability({ articleType: "service_information", factPackChars: 814, env: {} }).viable).toBe(true);
  });

  it("ratio is tunable by env and ignores invalid values", () => {
    expect(factPackCharsPerFloorWord({})).toBe(3);
    expect(factPackCharsPerFloorWord({ EDITORIAL_FACTPACK_CHARS_PER_FLOOR_WORD: "5" })).toBe(5);
    expect(factPackCharsPerFloorWord({ EDITORIAL_FACTPACK_CHARS_PER_FLOOR_WORD: "nope" })).toBe(3);
    expect(factPackCharsPerFloorWord({ EDITORIAL_FACTPACK_CHARS_PER_FLOOR_WORD: "-1" })).toBe(3);
    // 0 disables the filter entirely (everything viable)
    expect(assessEvidenceViability({ articleType: "explainer", factPackChars: 0, env: { EDITORIAL_FACTPACK_CHARS_PER_FLOOR_WORD: "0" } }).viable).toBe(true);
  });
});
