import { describe, expect, it } from "vitest";
import {
  createGenerationQualityMetrics,
  recordValidationOutcome,
  shouldRaiseGenerationQualityIncident,
  validationPassRate,
} from "@/lib/news/ai/generation-quality-metrics";
import {
  fingerprintBody,
  isPlaceholderTitle,
  shouldQuarantineGenerationFailure,
  shouldRetryGenerationFailure,
  validateGeneratedArticle,
} from "@/lib/news/ai/generated-article-validation";

const hiBody = `
## मुख्य समाचार
रायपुर। छत्तीसगढ़ प्रशासन ने आज एक महत्वपूर्ण घोषणा की जिसमें स्थानीय विकास परियोजनाओं को प्राथमिकता दी गई। अधिकारियों ने कहा कि योजना का क्रियान्वयन जिला स्तर पर होगा और नागरिकों को नियमित अपडेट मिलेंगे। विभाग ने स्पष्ट किया कि बजट मंजूरी के बाद ही निर्माण एजेंसियाँ मैदान में उतरेंगी।

## विस्तार
विभाग के अनुसार बजट आवंटन के बाद काम शुरू होगा। स्थानीय प्रतिनिधि भी मौजूद रहे। परियोजना में शिक्षा, स्वास्थ्य और सड़क सुधार शामिल हैं। निगरानी समिति समय-समय पर प्रगति की समीक्षा करेगी। जिला प्रशासन ने कहा कि प्रगति की जानकारी सार्वजनिक रूप से साझा की जाएगी और शिकायत निवारण हेतु हेल्पलाइन भी उपलब्ध रहेगी। अधिकारियों के मुताबिक पहले चरण में प्राथमिक स्वास्थ्य केंद्रों का उन्नयन और ग्रामीण सड़कों की मरम्मत पर ध्यान केंद्रित रहेगा।

## आगे क्या
अगले सप्ताह जिलाधिकारियों के साथ समीक्षा बैठक प्रस्तावित है। नागरिकों से अनुरोध है कि वे आधिकारिक सूचनाओं पर ही भरोसा करें और अफवाहों से बचें। योजना की समय-सीमा और आवंटन विवरण प्रशासन की वेबसाइट पर प्रकाशित किए जाएँगे।
`.trim();

const enBody = `
## Lead
Raipur authorities announced a regional development package covering roads, clinics, and schools across multiple districts in Chhattisgarh. Officials said the programme prioritises district-level delivery with monthly public updates for citizens.

## Details
Officials said implementation will begin after budget clearance, with monthly public updates for citizens. Local representatives attended the briefing and sought timelines for each district. The administration confirmed that grievance redressal channels will remain open throughout the rollout period and that progress reports will be published regularly for transparency. The first phase focuses on primary health centres and rural road repairs, with contractors mobilised only after formal fund release.

## Next
A review meeting with district collectors is scheduled for next week. Residents were asked to rely on official notices and avoid unverified claims circulating on messaging apps.
`.trim();

function validBase(
  overrides: Partial<Parameters<typeof validateGeneratedArticle>[0]> = {}
) {
  return validateGeneratedArticle({
    headline: "छत्तीसगढ़ में नई विकास योजना की घोषणा",
    summary: "प्रशासन ने जिला स्तर की परियोजनाओं की घोषणा की है।",
    articleBody: hiBody,
    language: "hi",
    category: "politics",
    region: "Raipur",
    sourceAttributions: [
      {
        source: "Local Desk",
        article_url: "https://example.com/story-1",
        signal_id: "sig-1",
      },
    ],
    generationMetadata: { generated_at: new Date().toISOString() },
    eventId: "evt-1",
    stage: "persist",
    ...overrides,
  });
}

describe("placeholder titles", () => {
  it("rejects empty and placeholder titles", () => {
    expect(isPlaceholderTitle("")).toBe(true);
    expect(isPlaceholderTitle("Untitled story")).toBe(true);
    expect(isPlaceholderTitle("Untitled")).toBe(true);
    expect(isPlaceholderTitle("No title")).toBe(true);
    expect(isPlaceholderTitle("Draft")).toBe(true);
    expect(isPlaceholderTitle("Test")).toBe(true);
    expect(isPlaceholderTitle("null")).toBe(true);
    expect(isPlaceholderTitle("undefined")).toBe(true);
    expect(isPlaceholderTitle("placeholder")).toBe(true);
    expect(isPlaceholderTitle("   ")).toBe(true);
  });
});

describe("validateGeneratedArticle", () => {
  it("fails empty title", () => {
    const r = validBase({ headline: "" });
    expect(r.ok).toBe(false);
    expect(r.codes).toContain("empty_title");
  });

  it("fails placeholder title", () => {
    const r = validBase({ headline: "Untitled story" });
    expect(r.ok).toBe(false);
    expect(r.codes).toContain("placeholder_title");
  });

  it("fails empty body", () => {
    const r = validBase({ articleBody: "" });
    expect(r.ok).toBe(false);
    expect(r.codes).toContain("empty_body");
  });

  it("fails too-short body", () => {
    const r = validBase({ articleBody: "छोटा पाठ।" });
    expect(r.ok).toBe(false);
    expect(r.codes).toContain("body_too_short");
  });

  it("fails body equal to summary", () => {
    const same = hiBody.replace(/^##[^\n]*\n+/gm, "").trim();
    const r = validBase({ summary: same, articleBody: same });
    expect(r.codes).toContain("body_equals_excerpt");
  });

  it("fails model apology", () => {
    const r = validBase({
      articleBody: `${hiBody}\n\nI'm sorry, as an AI I cannot verify this.`,
    });
    expect(r.ok).toBe(false);
    expect(r.codes).toContain("model_apology");
  });

  it("accepts valid Hindi article", () => {
    const r = validBase();
    expect(r.ok).toBe(true);
    expect(r.codes).toEqual([]);
  });

  it("accepts valid English article", () => {
    const r = validBase({
      headline: "Chhattisgarh announces new development package",
      summary: "Officials outlined district-level projects for roads and clinics.",
      articleBody: enBody,
      language: "en",
    });
    expect(r.ok).toBe(true);
  });

  it("rejects duplicate cluster/event", () => {
    const r = validBase({ existingEventIds: ["evt-1"] });
    expect(r.ok).toBe(false);
    expect(r.codes).toContain("duplicate_cluster");
    expect(r.retryable).toBe(false);
  });

  it("rejects duplicate title/body fingerprints", () => {
    const titleDup = validBase({
      existingHeadlines: ["छत्तीसगढ़ में नई विकास योजना की घोषणा"],
    });
    expect(titleDup.codes).toContain("duplicate_title");

    const fp = fingerprintBody(hiBody);
    const bodyDup = validBase({ existingBodyFingerprints: [fp] });
    expect(bodyDup.codes).toContain("duplicate_body");
  });

  it("rejects malformed/unsafe HTML", () => {
    const r = validBase({
      articleBody: `${hiBody}\n<script>alert(1)</script>`,
    });
    expect(r.ok).toBe(false);
    expect(r.codes).toContain("unsafe_markup");
  });

  it("supports retry then quarantine when exhausted", () => {
    const r = validBase({ headline: "Untitled story", stage: "draft" });
    expect(shouldRetryGenerationFailure(r, 1)).toBe(true);
    expect(shouldRetryGenerationFailure(r, 3)).toBe(false);
    expect(shouldQuarantineGenerationFailure(r, 3)).toBe(true);
  });

  it("batch metrics continue after invalid article", () => {
    const metrics = createGenerationQualityMetrics();
    const bad = validBase({ headline: "Untitled story", stage: "draft" });
    const good = validBase({
      headline: "दूसरी मान्य खबर राज्य में जारी",
      eventId: "evt-2",
      stage: "draft",
    });
    recordValidationOutcome(metrics, bad, { manualReview: true });
    recordValidationOutcome(metrics, good);
    expect(metrics.attempted).toBe(2);
    expect(metrics.validationPassed).toBe(1);
    expect(metrics.validationFailed).toBe(1);
    expect(validationPassRate(metrics)).toBe(50);
    expect(shouldRaiseGenerationQualityIncident(metrics)).toBe(false);
  });
});
