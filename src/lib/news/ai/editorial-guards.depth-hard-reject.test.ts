import { describe, expect, it } from "vitest";
import { runEditorialQualityChecks } from "@/lib/news/ai/editorial-guards";

/**
 * Regression test for the 2026-07-25/26 zero-generation incident.
 *
 * Production evidence: editorial-generate produced zero articles for 11+ hours
 * (worker_jobs.result: generated=0 on every 15-minute cycle). Every prepared
 * candidate hard-rejected with "body_too_short_for_type" on every attempt,
 * including after depth_retry regeneration — a universal, mechanical failure,
 * not "bad content." Meanwhile the last 10 known-healthy, successfully
 * published generated_articles rows (all with hero_image_url populated)
 * ranged 59-248 words, well under the thresholds that were live at the time
 * of the incident.
 *
 * Root cause: three same-day commits (dd60573, df9e318, PR #46, PR #48)
 * progressively raised depth/evidence thresholds for a brand-new gate system,
 * and editorial-guards.ts wired body_too_short_for_type as an unconditional
 * hard reject — contradicting its own retryable:true flag and making the
 * should_repair path for it unreachable. This fixture is real, already-published
 * Chhattisgarh news content (154 words) pulled from generated_articles,
 * representative of the thin single-source wire content this pipeline
 * actually ingests.
 */
const REAL_PUBLISHED_BODY_154_WORDS = `छत्तीसगढ़ सरकार ने अग्निवीरों के लिए पुलिस और वन विभाग में 10% आरक्षण की घोषणा की है। यह निर्णय आज हुई कैबिनेट बैठक में लिया गया।

छत्तीसगढ़ कैबिनेट ने अग्निवीरों के लिए ग्रुप सी सरकारी नौकरियों में 10% आरक्षण को मंजूरी दी है। यह निर्णय विशेष रूप से पुलिस और वन विभाग में लागू होगा। अधिकारियों के अनुसार, इस आरक्षण से अग्निवीरों को सरकारी नौकरी पाने में मदद मिलेगी।

इस आरक्षण का उद्देश्य अग्निवीरों को रोजगार के अवसर प्रदान करना है, ताकि वे अपने अनुभव का लाभ उठा सकें। यह कदम युवा अग्निवीरों के लिए एक महत्वपूर्ण अवसर है, जो देश की सेवा के बाद अब नौकरी की तलाश में हैं।

इस आरक्षण की घोषणा से छत्तीसगढ़ में अग्निवीरों की संख्या में वृद्धि हो सकती है, जो पहले से ही विभिन्न क्षेत्रों में अपनी सेवाएं दे रहे हैं। अग्निवीरों को इस निर्णय से काफी राहत मिलेगी, और यह उनके लिए एक सकारात्मक कदम है।`;

describe("editorial-guards depth hard-reject regression (2026-07-25/26 incident)", () => {
  it("does not hard-reject a realistic 154-word breaking_alert body", () => {
    const report = runEditorialQualityChecks({
      headline: "छत्तीसगढ़ में अग्निवीरों के लिए 10% आरक्षण की घोषणा",
      summary: "छत्तीसगढ़ कैबिनेट ने अग्निवीरों के लिए 10% आरक्षण को मंजूरी दी।",
      articleBody: REAL_PUBLISHED_BODY_154_WORDS,
      seoTitle: "छत्तीसगढ़ में अग्निवीरों के लिए आरक्षण",
      seoDescription: "छत्तीसगढ़ कैबिनेट ने अग्निवीरों के लिए आरक्षण को मंजूरी दी।",
      sourceTexts: [
        "छत्तीसगढ़ कैबिनेट ने अग्निवीरों के लिए पुलिस और वन विभाग में 10% आरक्षण को मंजूरी दी है।",
      ],
      factPackText:
        "छत्तीसगढ़ कैबिनेट बैठक; अग्निवीरों के लिए 10% आरक्षण; पुलिस और वन विभाग में लागू।",
      sourceCount: 1,
      category: "breaking",
      region: "chhattisgarh",
      language: "hi",
      articleType: "breaking_alert",
      evidenceSufficient: true,
    });

    expect(report.hard_reject_reasons).not.toContain("body_too_short_for_type");
    expect(report.hard_reject).toBe(false);
  });

  it("still leaves body_too_short_for_type in rejectionReasons when a real body is thin for its assigned type (soft-reject signal, not silently dropped)", () => {
    // Same real 154-word body as above, but classified as "explainer" (700 minWords) —
    // genuinely too thin for that type, so this should surface as a soft rejection
    // reason without going through the OTHER (unrelated) structural too-short checks
    // that a synthetic one-line fixture would trip.
    const report = runEditorialQualityChecks({
      headline: "छत्तीसगढ़ में अग्निवीरों के लिए 10% आरक्षण की घोषणा",
      summary: "छत्तीसगढ़ कैबिनेट ने अग्निवीरों के लिए 10% आरक्षण को मंजूरी दी।",
      articleBody: REAL_PUBLISHED_BODY_154_WORDS,
      seoTitle: "छत्तीसगढ़ में अग्निवीरों के लिए आरक्षण",
      seoDescription: "छत्तीसगढ़ कैबिनेट ने अग्निवीरों के लिए आरक्षण को मंजूरी दी।",
      sourceTexts: [
        "छत्तीसगढ़ कैबिनेट ने अग्निवीरों के लिए पुलिस और वन विभाग में 10% आरक्षण को मंजूरी दी है।",
      ],
      factPackText:
        "छत्तीसगढ़ कैबिनेट बैठक; अग्निवीरों के लिए 10% आरक्षण; पुलिस और वन विभाग में लागू।",
      sourceCount: 1,
      category: "explainer",
      region: "chhattisgarh",
      language: "hi",
      articleType: "explainer",
      evidenceSufficient: true,
    });

    expect(report.hard_reject_reasons).not.toContain("body_too_short_for_type");
    expect(report.rejectionReasons).toContain("body_too_short_for_type");
    // Not hard-rejected purely for being short — should remain eligible for the
    // should_repair path (still won't publish, since depth_quality.ok gates that).
    expect(report.publish_allowed).toBe(false);
  });
});
