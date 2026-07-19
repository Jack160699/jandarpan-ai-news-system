import { afterEach, describe, expect, it } from "vitest";
import {
  buildTranslateArticlePayload,
  buildTranslationDedupeKey,
  bundleMatchesSourceVersion,
  computeSourceContentVersion,
  isActiveReaderTarget,
  isCgTranslationEnabled,
  normalizeTranslateArticlePayload,
  resolveTranslationUrgencyScore,
  TRANSLATION_URGENCY_DEFAULT,
} from "@/lib/i18n/multilingual/translation-contract";
import { adaptiveTranslationBodySlice } from "@/lib/observability/openai-cost/adaptive-tokens";

describe("resolveTranslationUrgencyScore", () => {
  it("prefers payload then event then default 50 (not a fake zero)", () => {
    expect(
      resolveTranslationUrgencyScore({
        payloadUrgency: 88,
        eventUrgency: 40,
      })
    ).toBe(88);
    expect(
      resolveTranslationUrgencyScore({
        eventUrgency: 40,
      })
    ).toBe(40);
    expect(resolveTranslationUrgencyScore({})).toBe(TRANSLATION_URGENCY_DEFAULT);
    expect(TRANSLATION_URGENCY_DEFAULT).toBe(50);
  });

  it("reads urgency from editorial_metadata when event missing", () => {
    expect(
      resolveTranslationUrgencyScore({
        editorialMetadata: { urgency_score: 77 },
      })
    ).toBe(77);
  });
});

describe("urgencyScore regression", () => {
  it("never throws when urgency is resolved before adaptive slice", () => {
    // Mirrors the production bug pattern: calling adaptive helpers with a
    // properly bound urgencyScore (not a bare undeclared identifier).
    const urgencyScore = resolveTranslationUrgencyScore({
      eventUrgency: undefined,
      payloadUrgency: undefined,
    });
    expect(() =>
      adaptiveTranslationBodySlice("body ".repeat(2000), urgencyScore)
    ).not.toThrow();
    expect(urgencyScore).toBe(50);
  });

  it("supports legacy job payload without urgency fields", () => {
    const normalized = normalizeTranslateArticlePayload({
      articleId: "a1",
      targetLanguage: "en",
    });
    expect(normalized).not.toBeNull();
    expect(normalized?.urgencyScore).toBeUndefined();
    const urgencyScore = resolveTranslationUrgencyScore({
      payloadUrgency: normalized?.urgencyScore,
      eventUrgency: 62,
    });
    expect(urgencyScore).toBe(62);
  });
});

describe("language policy", () => {
  afterEach(() => {
    delete process.env.NEWSROOM_CG_TRANSLATION;
  });

  it("keeps CG disabled by default", () => {
    delete process.env.NEWSROOM_CG_TRANSLATION;
    expect(isCgTranslationEnabled()).toBe(false);
    expect(isActiveReaderTarget("cg")).toBe(false);
    expect(isActiveReaderTarget("en")).toBe(true);
    expect(isActiveReaderTarget("hi")).toBe(true);
  });

  it("enables CG only when NEWSROOM_CG_TRANSLATION=true", () => {
    process.env.NEWSROOM_CG_TRANSLATION = "true";
    expect(isCgTranslationEnabled()).toBe(true);
    expect(isActiveReaderTarget("cg")).toBe(true);
  });
});

describe("job contract + versioning", () => {
  it("normalizes legacy {articleId,targetLanguage} payloads", () => {
    const n = normalizeTranslateArticlePayload({
      articleId: "art-1",
      targetLanguage: "en",
    });
    expect(n).toMatchObject({
      articleId: "art-1",
      targetLanguage: "en",
      sourceContentVersion: "legacy",
      idempotencyKey: "translate:art-1:en",
    });
  });

  it("builds hi→en and en→hi payloads with content version", () => {
    const hiEn = buildTranslateArticlePayload({
      articleId: "a",
      sourceLanguage: "hi",
      targetLanguage: "en",
      sourceContentVersion: "abc123",
      urgencyScore: 80,
    });
    expect(hiEn.targetLanguage).toBe("en");
    expect(hiEn.sourceLanguage).toBe("hi");
    expect(hiEn.sourceContentVersion).toBe("abc123");

    const enHi = buildTranslateArticlePayload({
      articleId: "a",
      sourceLanguage: "en",
      targetLanguage: "hi",
      sourceContentVersion: "abc123",
    });
    expect(enHi.targetLanguage).toBe("hi");
  });

  it("uses stable dedupe key per article/language (version enforced at execute)", () => {
    expect(buildTranslationDedupeKey("a", "en", "v1")).toBe("translate:a:en");
    expect(buildTranslationDedupeKey("a", "en", "v2")).toBe("translate:a:en");
  });

  it("detects source content version changes", () => {
    const v1 = computeSourceContentVersion({
      headline: "A",
      summary: "S",
      article_body: "Body1",
    });
    const v2 = computeSourceContentVersion({
      headline: "A",
      summary: "S",
      article_body: "Body2",
    });
    expect(v1).not.toBe(v2);

    const legacyBundle = {
      headline: "x",
      summary: "y",
      seo_title: "x",
      seo_description: "y",
      reading_time: "1 min",
      translated_at: new Date().toISOString(),
    };
    expect(bundleMatchesSourceVersion(legacyBundle, v1)).toBe(true);
    expect(
      bundleMatchesSourceVersion(
        { ...legacyBundle, source_content_version: v1 },
        v2
      )
    ).toBe(false);
  });
});
