import { beforeEach, describe, expect, it, vi } from "vitest";

const chat = vi.fn();
const storeCache = vi.fn();
const upsert = vi.fn(async () => ({ error: null }));
const update = vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) }));

vi.mock("@/lib/ai/providers", () => ({
  isAnyChatProviderConfigured: () => true,
  requestChatCompletion: (...a: unknown[]) => chat(...a),
}));
vi.mock("@/lib/observability/ai-cost/prompt-cache", () => ({
  lookupPromptCache: async () => ({ hit: false }),
  storePromptCache: (...a: unknown[]) => storeCache(...a),
}));
vi.mock("@/lib/supabase", () => ({
  createAdminServerClient: () => ({
    from: (table: string) => (table === "story_language_links" ? { upsert } : { update }),
  }),
}));

import { translateGeneratedArticle } from "./translate";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

const EN_BODY = [
  "Chhattisgarh Police Headquarters has issued an order transferring several inspectors at the same time.",
  "The order, signed on Wednesday, moves inspectors between Raipur, Durg and Bilaspur ranges.",
  "Officials said the transfers are part of a routine reshuffle and will take effect immediately.",
].join("\n\n");

const row = {
  id: "art-1",
  event_id: "evt-1",
  slug: "s",
  headline: "Chhattisgarh Police Headquarters Issues Transfer Orders for Inspectors",
  summary: "Orders for the simultaneous transfer of inspectors have been issued.",
  article_body: EN_BODY,
  seo_title: "t",
  seo_description: "d",
  tags: ["chhattisgarh"],
  language: "en",
  editorial_metadata: {},
  translations: null,
} as unknown as GeneratedArticleRow;

const HI = {
  headline: "छत्तीसगढ़ पुलिस मुख्यालय ने निरीक्षकों के तबादले के आदेश जारी किए",
  summary: "छत्तीसगढ़ पुलिस मुख्यालय ने कई निरीक्षकों के एक साथ तबादले का आदेश जारी किया है।",
  article_body: [
    "छत्तीसगढ़ पुलिस मुख्यालय ने एक साथ कई निरीक्षकों के तबादले का आदेश जारी किया है।",
    "बुधवार को हस्ताक्षरित आदेश के तहत निरीक्षकों को रायपुर, दुर्ग और बिलासपुर रेंज के बीच स्थानांतरित किया गया है।",
    "अधिकारियों ने बताया कि यह तबादले नियमित फेरबदल का हिस्सा हैं और तत्काल प्रभाव से लागू होंगे।",
  ].join("\n\n"),
  seo_title: "तबादले",
  seo_description: "निरीक्षकों के तबादले",
  tags: ["छत्तीसगढ़"],
};

const modelReturns = (obj: unknown) => chat.mockResolvedValue({ ok: true, content: JSON.stringify(obj), provider: "gemini", model: "gemini-x", latencyMs: 5 });

beforeEach(() => {
  chat.mockReset();
  storeCache.mockReset();
  upsert.mockClear();
  update.mockClear();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("translateGeneratedArticle: Hindi representation is stored only when it passes the gate", () => {
  it("a complete Devanagari translation is persisted, cached and LINKED to the source article", async () => {
    modelReturns(HI);
    const res = await translateGeneratedArticle(row, ["hi"]);
    expect(res).toEqual([{ language: "hi", ok: true }]);
    expect(update).toHaveBeenCalledTimes(1);
    const saved = (update.mock.calls[0] as unknown as [{ translations: { hi: { headline: string; article_body: string } } }])[0];
    expect(saved.translations.hi.headline).toBe(HI.headline);
    expect(saved.translations.hi.article_body).toBe(HI.article_body);
    expect(storeCache).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith(
      [expect.objectContaining({ event_id: "evt-1", candidate_language: "hi", matched_article_id: "art-1", matched_language: "en", decision: "translation_of" })],
      expect.anything(),
    );
  });

  it("a translation whose body is still English (the old silent fallback) is REJECTED: not stored, not cached, not linked", async () => {
    modelReturns({ ...HI, article_body: undefined }); // model omitted the body -> must NOT fall back to the English body
    const res = await translateGeneratedArticle(row, ["hi"]);
    expect(res[0]).toMatchObject({ language: "hi", ok: false });
    expect(res[0]!.error).toMatch(/^translation_rejected:.*body_missing/);
    expect(update).not.toHaveBeenCalled();
    expect(storeCache).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("an English body under a Hindi headline fails the language gate and is never stored", async () => {
    modelReturns({ ...HI, article_body: EN_BODY });
    const res = await translateGeneratedArticle(row, ["hi"]);
    expect(res[0]).toMatchObject({ ok: false });
    expect(res[0]!.error).toContain("latin_in_hi_body");
    expect(update).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("a provider failure / unusable output is reported as translation_failed (NOT a gate rejection) with its reason", async () => {
    chat.mockResolvedValue({ ok: false, provider: "gemini", latencyMs: 5, error: { code: "ai_quota_exhausted" } });
    let res = await translateGeneratedArticle(row, ["hi"]);
    expect(res[0]!.error).toBe("translation_failed:provider_failed:ai_quota_exhausted");

    chat.mockResolvedValue({ ok: true, content: "not json at all", provider: "gemini", model: "m", latencyMs: 5 });
    res = await translateGeneratedArticle(row, ["hi"]);
    expect(res[0]!.error).toBe("translation_failed:invalid_json");

    modelReturns({ headline: "", summary: "" });
    res = await translateGeneratedArticle(row, ["hi"]);
    expect(res[0]!.error).toBe("translation_failed:missing_fields");
    expect(update).not.toHaveBeenCalled();
    expect(storeCache).not.toHaveBeenCalled();
  });

  it("the source article is untouched when its translation is rejected (English stays available to English readers)", async () => {
    modelReturns({ ...HI, headline: "Chhattisgarh Police Headquarters Issues Transfer Orders for Inspectors" });
    await translateGeneratedArticle(row, ["hi"]);
    expect(update).not.toHaveBeenCalled(); // no write at all => the English original and its feed visibility are unchanged
  });
});
