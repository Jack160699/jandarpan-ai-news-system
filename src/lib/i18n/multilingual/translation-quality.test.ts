import { describe, expect, it } from "vitest";
import { validateTranslationBundle } from "./translation-quality";
import { buildTranslationLink } from "./translation-links";

const EN_BODY = [
  "Chhattisgarh Police Headquarters has issued an order transferring several inspectors at the same time.",
  "The order, signed on Wednesday, moves inspectors between Raipur, Durg and Bilaspur ranges.",
  "Officials said the transfers are part of a routine reshuffle and will take effect immediately.",
].join("\n\n");

const source = { headline: "Chhattisgarh Police Headquarters Issues Transfer Orders for Inspectors", summary: "Orders for the simultaneous transfer of inspectors have been issued.", article_body: EN_BODY, language: "en" };

const GOOD_HI = {
  headline: "छत्तीसगढ़ पुलिस मुख्यालय ने निरीक्षकों के तबादले के आदेश जारी किए",
  summary: "छत्तीसगढ़ पुलिस मुख्यालय ने कई निरीक्षकों के एक साथ तबादले का आदेश जारी किया है।",
  article_body: [
    "छत्तीसगढ़ पुलिस मुख्यालय ने एक साथ कई निरीक्षकों के तबादले का आदेश जारी किया है।",
    "बुधवार को हस्ताक्षरित आदेश के तहत निरीक्षकों को रायपुर, दुर्ग और बिलासपुर रेंज के बीच स्थानांतरित किया गया है।",
    "अधिकारियों ने बताया कि यह तबादले नियमित फेरबदल का हिस्सा हैं और तत्काल प्रभाव से लागू होंगे।",
  ].join("\n\n"),
};

const run = (bundle: Partial<typeof GOOD_HI>, over: Record<string, unknown> = {}) =>
  validateTranslationBundle({ targetLanguage: "hi", source, bundle: { ...GOOD_HI, ...bundle }, ...over } as never);
const codes = (r: ReturnType<typeof run>) => (r.ok ? [] : r.codes);

describe("translation quality gate (Hindi)", () => {
  it("accepts a complete, Devanagari, structure-preserving translation", () => {
    expect(run({})).toEqual({ ok: true });
  });

  it("REJECTS the old silent fallback: an English body under a Hindi headline", () => {
    const r = run({ article_body: EN_BODY });
    expect(r.ok).toBe(false);
    expect(codes(r).some((c) => c.startsWith("language:script_mismatch:latin_in_hi_body"))).toBe(true);
    expect(codes(r)).toContain("body_untranslated");
  });

  it("rejects a missing body (never falls back to the source body)", () => {
    expect(codes(run({ article_body: "" }))).toContain("body_missing");
  });

  it("rejects a Hindi headline/summary that is actually English", () => {
    const r = run({ headline: "Chhattisgarh Police Headquarters Issues Transfer Orders for Inspectors", summary: "Orders have been issued." });
    expect(codes(r)).toContain("headline_untranslated");
    expect(codes(r).some((c) => c.includes("latin_in_hi_headline"))).toBe(true);
    expect(codes(r).some((c) => c.includes("latin_in_hi_summary"))).toBe(true);
  });

  it("rejects a summarised-away body and lost paragraphs", () => {
    const r = run({ article_body: "छोटा सार।" });
    expect(codes(r).some((c) => c.startsWith("body_too_short"))).toBe(true);
    const lost = run({ article_body: GOOD_HI.article_body.split("\n\n")[0]!.repeat(3) });
    expect(codes(lost).some((c) => c.startsWith("paragraphs_lost"))).toBe(true);
  });

  it("rejects leaked JSON / refusal artefacts", () => {
    expect(codes(run({ article_body: GOOD_HI.article_body + '\n\n```json {"headline": "x"}```' }))).toContain("model_artefact");
    expect(codes(run({ summary: "I cannot translate this article." }))).toContain("model_artefact");
  });

  it("an English translation of a Hindi article must not contain Devanagari", () => {
    const hiSource = { headline: GOOD_HI.headline, summary: GOOD_HI.summary, article_body: GOOD_HI.article_body, language: "hi" };
    const ok = validateTranslationBundle({ targetLanguage: "en", source: hiSource, bundle: { headline: source.headline, summary: source.summary, article_body: EN_BODY } });
    expect(ok).toEqual({ ok: true });
    const bad = validateTranslationBundle({ targetLanguage: "en", source: hiSource, bundle: { headline: "छत्तीसगढ़ Police transfers", summary: source.summary, article_body: EN_BODY } });
    expect(bad.ok).toBe(false);
  });

  it("other languages still get the structural checks (no script gate)", () => {
    const r = validateTranslationBundle({ targetLanguage: "bn", source, bundle: { headline: "শিরোনাম", summary: "সারাংশ", article_body: "" } });
    expect(r.ok).toBe(false);
    expect(r.ok ? [] : r.codes).toContain("body_missing");
  });
});

describe("translation links", () => {
  it("links a validated translation to its source article under the story's event", () => {
    expect(buildTranslationLink({ articleId: "a1", eventId: "e1", sourceLanguage: "en", targetLanguage: "hi" })).toEqual({
      event_id: "e1",
      candidate_language: "hi",
      matched_article_id: "a1",
      matched_language: "en",
      similarity: 1,
      decision: "translation_of",
      mode: "enforce",
      enforced: true,
    });
  });
  it("does not link without an event or for the same language", () => {
    expect(buildTranslationLink({ articleId: "a1", eventId: null, sourceLanguage: "en", targetLanguage: "hi" })).toBeNull();
    expect(buildTranslationLink({ articleId: "a1", eventId: "e1", sourceLanguage: "en", targetLanguage: "en" })).toBeNull();
  });
});
