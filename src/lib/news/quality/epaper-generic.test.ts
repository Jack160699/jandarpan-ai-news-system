import { describe, expect, it } from "vitest";
import { isEpaperPageListingTitle } from "./source-title-quality";
import { evaluateHeadlineQuality, isRoundupHeadline } from "./headline-quality";

describe("e-paper page listings are not stories (rejected before any LLM call)", () => {
  it("flags the production listings", () => {
    for (const t of [
      "30092026 Raipur Main - 30 Sep 2026 - Page 10 - epaper.haribhoomi.com",
      "29092026 Rohtak Main Edition - 29 Sep 2026 - Page 5 - epaper.haribhoomi.com",
      "28092026 Bilaspur Bhoomi - 28 Sep 2026 - Page 1 - epaper.haribhoomi.com",
      "Dainik Bhaskar e-paper Page 3",
      "ई-पेपर पृष्ठ 4 रायपुर",
    ]) {
      expect(isEpaperPageListingTitle(t), t).toBe(true);
    }
  });

  it("does not flag real news that merely mentions a page, paper or edition", () => {
    for (const t of [
      "Raipur: Collector orders probe into hospital fire",
      "Newspaper hawkers strike enters second day in Bilaspur",
      "रायपुर में पेपर लीक मामले की जांच शुरू",
      "Page 1 of the ruling states the tax must be refunded",
      "",
      null,
    ]) {
      expect(isEpaperPageListingTitle(t as string | null), String(t)).toBe(false);
    }
  });
});

describe("generic 'coverage' headlines are blocked (they slipped through on 2026-09-30)", () => {
  const generic = [
    "Raipur News Updates: Comprehensive Coverage for September 30, 2026",
    "ताज़ातरीन व्यापक समाचार कवरेज: रायपुर ई-पेपर अपडेट",
    "Complete coverage of Chhattisgarh news",
    "Top headlines for September 30",
  ];
  for (const h of generic) {
    it(`rejects: ${h}`, () => {
      expect(isRoundupHeadline(h) || !evaluateHeadlineQuality({ headline: h, language: /[\u0900-\u097F]/.test(h) ? "hi" : "en" }).ok).toBe(true);
    });
  }

  it("still accepts specific headlines", () => {
    for (const [h, language] of [
      ["Raipur collector orders probe into Ambedkar hospital fire, 3 injured", "en"],
      ["रायपुर के अंबेडकर अस्पताल में आग, तीन घायल; कलेक्टर ने दिए जांच के आदेश", "hi"],
    ] as const) {
      expect(isRoundupHeadline(h), h).toBe(false);
      expect(evaluateHeadlineQuality({ headline: h, language }).ok, h).toBe(true);
    }
  });
});
