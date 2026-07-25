import { describe, expect, it } from "vitest";
import {
  ARTICLE_DEPTH_RULES,
  classifyArticleType,
  depthRejectThreshold,
  meetsDepthFloor,
  wordCount,
} from "@/lib/news/ai/article-type";
import {
  bodyEqualsExcerpt,
  findDuplicatedParagraphs,
  findUnsupportedQuotes,
  maxEditorialDepthRetries,
  shouldRetryDepthFailure,
  validateEditorialDepth,
} from "@/lib/news/ai/editorial-depth-quality";
import {
  auditEditorialDepthRow,
  summarizeEditorialDepthAudit,
} from "@/lib/news/ai/editorial-depth-audit";
import { buildEditorialPipelineSystemPrompt } from "@/lib/ai/prompts";

function hindiParagraphs(n: number, wordsPer = 40): string {
  const units = [
    "रायपुर में प्रशासन ने जिला स्तर की योजना की घोषणा की और अधिकारियों ने कहा कि काम जल्द शुरू होगा। ",
    "पुलिस के अनुसार घटना की जांच जारी है और स्थानीय लोगों से जानकारी ली जा रही है। ",
    "जिला कलेक्टर ने बताया कि प्रभावित क्षेत्रों में राहत सामग्री पहुँचाई जा रही है। ",
    "स्वास्थ्य विभाग के अनुसार अस्पतालों में अतिरिक्त तैयारी रखी गई है। ",
    "शिक्षा विभाग ने कहा कि स्कूलों में परीक्षा कार्यक्रम पहले की तरह जारी रहेगा। ",
    "परिवहन अधिकारियों ने यातायात व्यवस्था सुचारु रखने के निर्देश दिए हैं। ",
    "नागरिकों से अपील की गई है कि वे आधिकारिक सूचनाओं पर ही भरोसा करें। ",
    "अगले चरण में विभाग प्रगति की सार्वजनिक समीक्षा करेगा और अपडेट जारी करेगा। ",
  ];
  const paras: string[] = [];
  for (let i = 0; i < n; i++) {
    let block = "";
    let guard = 0;
    while (wordCount(block) < wordsPer && guard < 20) {
      block += units[(i + guard) % units.length];
      guard += 1;
    }
    paras.push(block.trim());
  }
  return paras.join("\n\n");
}

describe("article-type classification", () => {
  it("classifies breaking alerts as concise", () => {
    const c = classifyArticleType({
      urgencyScore: 90,
      signalCount: 2,
      factPackChars: 2000,
      category: "breaking",
    });
    expect(c.type).toBe("breaking_alert");
    expect(ARTICLE_DEPTH_RULES.breaking_alert.maxWords).toBeLessThanOrEqual(280);
  });

  it("keeps breaking alert depth floor concise", () => {
    const body = hindiParagraphs(2, 50);
    const floor = meetsDepthFloor(body, "breaking_alert");
    expect(floor.minWords).toBeLessThanOrEqual(80);
    expect(depthRejectThreshold("breaking_alert")).toBe(80);
  });

  it("targets standard report depth when evidence is rich", () => {
    const c = classifyArticleType({
      urgencyScore: 40,
      signalCount: 3,
      factPackChars: 2400,
      category: "politics",
      canonicalTitle: "विधानसभा में बजट चर्चा",
    });
    expect(c.type).toBe("standard_report");
    expect(ARTICLE_DEPTH_RULES.standard_report.minWords).toBeGreaterThanOrEqual(450);
  });

  it("targets explainer depth for explainer signals", () => {
    const c = classifyArticleType({
      urgencyScore: 30,
      signalCount: 4,
      factPackChars: 3200,
      category: "explainer",
      canonicalTitle: "समझें: नई शिक्षा नीति क्या है",
    });
    expect(c.type).toBe("explainer");
    expect(ARTICLE_DEPTH_RULES.explainer.minWords).toBeGreaterThanOrEqual(700);
  });

  it("demotes to short update when source evidence is insufficient", () => {
    const c = classifyArticleType({
      urgencyScore: 40,
      signalCount: 1,
      factPackChars: 280,
      category: "local",
      thinEvidence: true,
    });
    expect(["short_update", "breaking_alert"]).toContain(c.type);
    expect(c.evidenceSufficient).toBe(false);
  });
});

describe("editorial depth quality gates", () => {
  it("rejects missing body", () => {
    const r = validateEditorialDepth({
      articleBody: "",
      summary: "सारांश पाठ यहाँ है जो पर्याप्त लंबा है।",
      articleType: "standard_report",
      factPackText: "facts",
    });
    expect(r.ok).toBe(false);
    expect(r.codes).toContain("missing_body");
  });

  it("rejects body equal to excerpt", () => {
    const summary =
      "रायपुर में भारी बारिश से जलभराव की स्थिति बनी हुई है और कई इलाकों में यातायात प्रभावित है।";
    const r = validateEditorialDepth({
      articleBody: summary,
      summary,
      articleType: "short_update",
      factPackText: summary,
    });
    expect(r.ok).toBe(false);
    expect(r.codes).toContain("body_equals_excerpt");
    expect(bodyEqualsExcerpt(summary, summary)).toBe(true);
  });

  it("rejects duplicated paragraphs", () => {
    const para =
      "पुलिस के अनुसार घटना रात करीब दस बजे हुई और जांच टीम मौके पर पहुँची। स्थानीय प्रशासन ने भी निगरानी बढ़ाई है।";
    const body = `${para}\n\n${para}\n\nअतिरिक्त विवरण में कहा गया कि मामले की आगे जांच जारी है।`;
    expect(findDuplicatedParagraphs(body).length).toBeGreaterThan(0);
    const r = validateEditorialDepth({
      articleBody: body,
      summary: "अलग सारांश जो शरीर से मेल नहीं खाता।",
      articleType: "breaking_alert",
      factPackText: para,
    });
    expect(r.codes).toContain("duplicated_paragraphs");
  });

  it("rejects unsupported quotations", () => {
    const body = hindiParagraphs(3, 50);
    const withQuote = `${body}\n\nअधिकारियों ने कहा, "यह पूरी तरह काल्पनिक उद्धरण है जो स्रोत में नहीं है।"\n\n${hindiParagraphs(1, 40)}`;
    const bad = findUnsupportedQuotes(withQuote, "पुलिस ने जांच शुरू की");
    expect(bad.length).toBeGreaterThan(0);
  });

  it("rejects unresolved template artifacts", () => {
    const r = validateEditorialDepth({
      articleBody: `${hindiParagraphs(4, 60)}\n\n{{PLACEHOLDER}} और undefined विवरण।`,
      summary: "अलग सारांश जो पर्याप्त लंबा है पाठकों के लिए।",
      articleType: "short_update",
      factPackText: "fact pack with police details",
      language: "hi",
    });
    expect(r.codes).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/template|null_undefined|placeholder/i),
      ])
    );
  });

  it("accepts standard-report depth when long enough", () => {
    const body = hindiParagraphs(6, 90);
    expect(wordCount(body)).toBeGreaterThanOrEqual(450);
    const r = validateEditorialDepth({
      articleBody: body,
      summary: "यह सारांश शरीर से अलग है और दो-तीन वाक्यों में घटना बताता है।",
      articleType: "standard_report",
      factPackText: body,
      language: "hi",
      evidenceSufficient: true,
    });
    expect(r.ok).toBe(true);
  });

  it("accepts explainer depth when long enough", () => {
    const body = hindiParagraphs(8, 100);
    const r = validateEditorialDepth({
      articleBody: body,
      summary: "व्याख्यात्मक सारांश जो शरीर की नकल नहीं है।",
      articleType: "explainer",
      factPackText: body,
      evidenceSufficient: true,
    });
    expect(r.ok).toBe(true);
    expect(r.metrics.words).toBeGreaterThanOrEqual(700);
  });

  it("rejects factual padding of longform without evidence", () => {
    const body = `${hindiParagraphs(8, 100)}\n\nनिष्कर्षतः कहा जा सकता है कि इससे क्षेत्रीय विकास को नई दिशा मिलेगी।`;
    const r = validateEditorialDepth({
      articleBody: body,
      summary: "अलग सारांश।",
      articleType: "standard_report",
      factPackText: "thin",
      evidenceSufficient: false,
    });
    expect(r.codes).toContain("insufficient_evidence_for_longform");
  });

  it("bounds depth retries", () => {
    const failing = validateEditorialDepth({
      articleBody: "छोटा।",
      summary: "सारांश पाठ।",
      articleType: "standard_report",
      factPackText: "x",
    });
    expect(shouldRetryDepthFailure(failing, 0)).toBe(true);
    expect(shouldRetryDepthFailure(failing, maxEditorialDepthRetries())).toBe(false);
  });
});

describe("editorial prompt depth", () => {
  it("includes Hindi-first depth guidance for standard reports", () => {
    const prompt = buildEditorialPipelineSystemPrompt({
      language: "hi",
      deskTemplate: "general",
      articleType: "standard_report",
      evidenceSufficient: true,
    });
    expect(prompt).toMatch(/500–900|500-900|~700/);
    expect(prompt).toContain("Devanagari");
    expect(prompt).not.toMatch(/short wire/i);
    expect(prompt).toContain("Never invent quotations");
  });

  it("instructs thin evidence not to pad", () => {
    const prompt = buildEditorialPipelineSystemPrompt({
      language: "hi",
      deskTemplate: "breaking_news",
      articleType: "breaking_alert",
      evidenceSufficient: false,
    });
    expect(prompt).toMatch(/LIMITED|speculation|filler/i);
  });
});

describe("dry-run depth audit", () => {
  it("flags short and one-paragraph articles", () => {
    const finding = auditEditorialDepthRow({
      id: "a1",
      headline: "छोटी खबर",
      summary: "यह सारांश है जो शरीर के बराबर है।",
      article_body: "यह सारांश है जो शरीर के बराबर है।",
      language: "hi",
      category: "local",
      source_count: 2,
    });
    expect(finding).not.toBeNull();
    expect(finding!.codes).toEqual(
      expect.arrayContaining(["body_equals_excerpt", "one_paragraph_report"])
    );

    const summary = summarizeEditorialDepthAudit([finding!]);
    expect(summary.affectedCount).toBe(1);
    expect(summary.estimatedTotalRegenCostUsd).toBeGreaterThan(0);
  });
});
