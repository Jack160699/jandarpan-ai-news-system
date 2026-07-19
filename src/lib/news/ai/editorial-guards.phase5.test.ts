import { describe, expect, it } from "vitest";
import { runEditorialQualityChecks } from "@/lib/news/ai/editorial-guards";

describe("runEditorialQualityChecks Phase 5 structural hard rejects", () => {
  it("does not allow forcePublish to bypass untitled/empty stories", () => {
    const report = runEditorialQualityChecks({
      headline: "Untitled story",
      summary: "x",
      articleBody: "",
      seoTitle: "Untitled story",
      seoDescription: "x",
      sourceTexts: ["source text about an event in Raipur with enough words"],
      factPackText: "facts",
      sourceCount: 1,
      category: "politics",
      language: "hi",
      forcePublish: true,
    });
    expect(report.hard_reject).toBe(true);
    expect(report.publish_allowed).toBe(false);
    expect(report.hard_reject_reasons).toEqual(
      expect.arrayContaining(["placeholder_title", "empty_body"])
    );
  });

  it("batch can treat one invalid story as hard reject while others remain evaluable", () => {
    const bad = runEditorialQualityChecks({
      headline: "Untitled story",
      summary: "short summary here ok",
      articleBody: "tiny",
      seoTitle: "Untitled story",
      seoDescription: "short summary here ok",
      sourceTexts: ["enough source words for overlap checks in Raipur today"],
      factPackText: "fact pack",
      sourceCount: 2,
      category: "politics",
      language: "hi",
    });
    const good = runEditorialQualityChecks({
      headline: "छत्तीसगढ़ में मानसून सक्रिय, अलर्ट जारी",
      summary: "मौसम विभाग ने कई जिलों के लिए अलर्ट जारी किया है।",
      articleBody: `
## मुख्य समाचार
रायपुर। मौसम विभाग ने छत्तीसगढ़ के कई जिलों में भारी बारिश की संभावना जताई है। अधिकारियों ने नागरिकों से सतर्क रहने को कहा।

## विवरण
जिला प्रशासन ने राहत टीमों को तैयार रहने निर्देश दिए हैं। नदियों के जलस्तर की निगरानी बढ़ाई गई है और आवश्यक व्यवस्था सुनिश्चित की जा रही है।
`.trim(),
      seoTitle: "छत्तीसगढ़ में मानसून सक्रिय",
      seoDescription: "मौसम विभाग ने कई जिलों के लिए अलर्ट जारी किया है।",
      sourceTexts: [
        "मौसम विभाग ने छत्तीसगढ़ के कई जिलों में भारी बारिश की संभावना जताई है",
      ],
      factPackText:
        "मौसम विभाग ने छत्तीसगढ़ के कई जिलों में भारी बारिश की संभावना जताई है",
      sourceCount: 2,
      category: "weather",
      region: "Raipur",
      language: "hi",
    });

    expect(bad.hard_reject).toBe(true);
    expect(good.hard_reject).toBe(false);
  });
});
