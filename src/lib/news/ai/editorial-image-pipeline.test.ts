import { describe, expect, it } from "vitest";
import { buildEditorialImageContext } from "@/lib/news/ai/editorial-image-context";
import {
  buildIntelligentEditorialPrompt,
  hashImagePrompt,
} from "@/lib/news/ai/editorial-image-prompt-builder";
import { detectEditorialLocation } from "@/lib/news/ai/editorial-image-location";
import { detectEditorialEntities } from "@/lib/news/ai/editorial-image-entities";
import { moderateEditorialImageContext } from "@/lib/news/ai/editorial-image-moderation";
import { computeRetryBackoff, getRetryConfig } from "@/lib/news/ai/editorial-image-retry";
import { getProviderRecommendation } from "@/lib/news/ai/editorial-image-provider";
import type { GeneratedArticleRow, NewsEventRow } from "@/lib/types/newsroom";

describe("detectEditorialLocation", () => {
  it("detects Raipur hyperlocal stories", () => {
    const loc = detectEditorialLocation({
      headline: "Raipur: civic protest at collector office",
      region: "chhattisgarh",
    });
    expect(loc.district).toBe("raipur");
    expect(loc.scope).toBe("hyperlocal");
  });

  it("detects Bilaspur district", () => {
    const loc = detectEditorialLocation({
      headline: "Bilaspur railway station renovation begins",
    });
    expect(loc.district).toBe("bilaspur");
  });

  it("detects international scope", () => {
    const loc = detectEditorialLocation({
      headline: "Global markets react to US policy shift",
      region: "global",
    });
    expect(loc.scope).toBe("international");
  });
});

describe("detectEditorialEntities", () => {
  it("classifies crime stories", () => {
    const entities = detectEditorialEntities({
      headline: "Police arrest suspect in Raipur theft case",
      category: "local",
    });
    expect(entities.theme).toBe("crime");
  });

  it("classifies breaking urgency", () => {
    const entities = detectEditorialEntities({
      headline: "Breaking: major announcement from state cabinet",
      urgencyScore: 85,
    });
    expect(entities.isBreaking).toBe(true);
  });
});

describe("buildIntelligentEditorialPrompt", () => {
  it("includes headline context and forbids photorealism", () => {
    const article = {
      id: "1",
      headline: "Korba power plant maintenance schedule announced",
      summary: "State utility confirms planned outage for grid upgrade",
      article_body: "Officials in Korba said the maintenance will affect industrial units.",
      slug: "korba-power",
      tags: ["business"],
    } as GeneratedArticleRow;

    const event = {
      category: "business",
      region: "chhattisgarh",
      urgency_score: 55,
      event_summary: "Grid maintenance in Korba",
    } as NewsEventRow;

    const context = buildEditorialImageContext({ article, event });
    const moderation = moderateEditorialImageContext({
      headline: article.headline,
      eventSummary: event.event_summary,
    });
    const prompt = buildIntelligentEditorialPrompt({ context, moderation });

    expect(prompt.toLowerCase()).toContain("korba");
    expect(prompt.toLowerCase()).toContain("avoid");
    expect(prompt.toLowerCase()).not.toContain("photorealistic photo");
    expect(hashImagePrompt(prompt)).toHaveLength(16);
  });

  it("uses custom prompt when provided", () => {
    const article = {
      id: "2",
      headline: "Test headline",
      summary: "Test",
      slug: "test",
      tags: ["local"],
    } as GeneratedArticleRow;

    const context = buildEditorialImageContext({
      article,
      event: null,
      customPrompt: "Symbolic river illustration for Chhattisgarh monsoon story",
    });
    const moderation = moderateEditorialImageContext({ headline: article.headline });
    const prompt = buildIntelligentEditorialPrompt({ context, moderation });

    expect(prompt).toContain("Symbolic river illustration");
  });
});

describe("retry config", () => {
  it("exponential backoff increases with attempts", () => {
    const cfg = getRetryConfig();
    const b1 = computeRetryBackoff(1, cfg);
    const b2 = computeRetryBackoff(2, cfg);
    expect(b2).toBeGreaterThan(b1);
  });
});

describe("provider recommendation", () => {
  it("recommends staying on OpenAI for phase 1", () => {
    const rec = getProviderRecommendation();
    expect(rec.changeProvider).toBe(false);
    expect(rec.current).toBe("openai");
  });
});
