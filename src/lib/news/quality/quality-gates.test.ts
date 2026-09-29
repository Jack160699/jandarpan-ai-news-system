import { describe, expect, it } from "vitest";
import {
  evaluateHeadlineQuality,
  isGenericHeadline,
} from "@/lib/news/quality/headline-quality";
import {
  detectLanguageByScript,
  dominantScript,
  scriptStats,
  validateArticleLanguage,
  validateLanguageScript,
} from "@/lib/news/quality/script-detect";

describe("script detection", () => {
  it("counts every Devanagari letter (the old detector counted at most one)", () => {
    const st = scriptStats("रायपुर में भारी बारिश");
    expect(st.devanagari).toBeGreaterThan(10);
    expect(st.devanagariRatio).toBe(1);
  });

  it("classifies dominant script", () => {
    expect(dominantScript("Heavy rain in Raipur")).toBe("latin");
    expect(dominantScript("रायपुर में भारी बारिश")).toBe("devanagari");
    expect(dominantScript("123 !!!")).toBe("none");
  });

  it("rejects a Hindi headline in an English slot (production defect)", () => {
    const r = validateLanguageScript("रायपुर के पंडरी इलाके में युवक का शव मिला", "en", "headline");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("script_mismatch:devanagari_in_en_headline");
  });

  it("rejects a Latin headline in a Hindi slot", () => {
    const r = validateLanguageScript("Desk draft 2026-09-26", "hi", "headline");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("script_mismatch:latin_in_hi_headline");
  });

  it("allows Latin acronyms inside a Hindi headline", () => {
    expect(validateLanguageScript("सीएम साय ने IPL टिकट पर GST घटाने की मांग की", "hi", "headline").ok).toBe(true);
    expect(validateLanguageScript("भाजपा नेता का बयान, CM ने दिया जवाब", "hi", "headline").ok).toBe(true);
  });

  it("accepts clean English and clean Hindi", () => {
    expect(validateLanguageScript("Heavy rain alert for South Chhattisgarh", "en", "headline").ok).toBe(true);
    expect(validateLanguageScript("दक्षिण छत्तीसगढ़ के लिए भारी बारिश का अलर्ट", "hi", "headline").ok).toBe(true);
  });

  it("validateArticleLanguage reports each failing field", () => {
    const f = validateArticleLanguage({
      language: "en",
      headline: "छत्तीसगढ़ में बारिश",
      summary: "छत्तीसगढ़ में भारी बारिश हुई",
      body: "Body is fine English text about rain across the state.",
    });
    expect(f.map((x) => x.code)).toEqual([
      "script_mismatch:devanagari_in_en_headline",
      "script_mismatch:devanagari_in_en_summary",
    ]);
  });

  it("detectLanguageByScript flips a wrong hint (old detector could not)", () => {
    expect(detectLanguageByScript("रायपुर में भारी बारिश का अलर्ट जारी", "en")).toBe("hi");
    expect(detectLanguageByScript("Heavy rain alert issued in Raipur", "hi")).toBe("en");
  });
});

describe("headline quality", () => {
  it.each([
    "Regional News Update",
    "Latest News Update",
    "Regional News",
    "Breaking News Update",
    "Breaking News",
    "Top Headlines Today",
    "Chhattisgarh News Update",
    "क्षेत्रीय समाचार",
    "ताज़ा खबर",
    "आज की खबरें",
    "छत्तीसगढ़ समाचार अपडेट",
    "ब्रेकिंग न्यूज़ अपडेट",
  ])("blocks generic boilerplate: %s", (h) => {
    expect(isGenericHeadline(h)).toBe(true);
    const r = evaluateHeadlineQuality({ headline: h, language: /[ऀ-ॿ]/.test(h) ? "hi" : "en" });
    expect(r.ok).toBe(false);
    expect(r.failures).toContain("generic_boilerplate");
  });

  it("blocks placeholders", () => {
    expect(evaluateHeadlineQuality({ headline: "Desk draft 2026-09-26", language: "en" }).failures).toContain("placeholder");
    expect(evaluateHeadlineQuality({ headline: "[Headline here] for the story", language: "en" }).failures).toContain("placeholder");
  });

  it("blocks too-short and empty headlines", () => {
    expect(evaluateHeadlineQuality({ headline: "", language: "en" }).failures).toContain("empty");
    expect(evaluateHeadlineQuality({ headline: "Rain hits", language: "en" }).failures).toContain("too_short");
  });

  it("does not block a real headline that merely contains the word 'news'", () => {
    const r = evaluateHeadlineQuality({
      headline: "Raipur Municipal Corporation issues news notice on Pandri market demolition",
      language: "en",
    });
    expect(r.ok).toBe(true);
  });

  it("accepts specific English and Hindi headlines", () => {
    expect(
      evaluateHeadlineQuality({ headline: "Heavy rain alert for South Chhattisgarh as cyclone approaches", language: "en" }).ok
    ).toBe(true);
    expect(
      evaluateHeadlineQuality({ headline: "छत्तीसगढ़ में बड़ा प्रशासनिक फेरबदल, 125 अधिकारियों के तबादले", language: "hi" }).ok
    ).toBe(true);
  });

  it("rejects a duplicate of a recent headline (normalised)", () => {
    const r = evaluateHeadlineQuality({
      headline: "Heavy Rain Alert for South Chhattisgarh!",
      language: "en",
      recentHeadlines: ["heavy rain alert for south chhattisgarh"],
    });
    expect(r.failures).toContain("duplicate_of_recent");
  });
});
