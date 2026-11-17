import { describe, expect, it } from "vitest";
import {
  cleanTextForSpeech,
  splitIntoSpeechChunks,
} from "./ArticleVoiceControl";

describe("ArticleVoiceControl text preparation", () => {
  it("cleans markdown syntax, links, bold, and extra whitespace", () => {
    const raw = `
      **रायपुर:** छत्तीसगढ़ में [मौसम विभाग](https://imd.gov.in) ने भारी बारिश का अलर्ट जारी किया है।
      # मुख्य बातें
      * बस्तर संभाग में तेज हवाएं
      * तापमान में 3 डिग्री की गिरावट
    `;
    const cleaned = cleanTextForSpeech(raw);

    expect(cleaned).not.toContain("**");
    expect(cleaned).not.toContain("https://");
    expect(cleaned).not.toContain("#");
    expect(cleaned).toContain("रायपुर: छत्तीसगढ़ में मौसम विभाग ने भारी बारिश का अलर्ट जारी किया है।");
    expect(cleaned).toContain("बस्तर संभाग में तेज हवाएं");
  });

  it("splits Hindi news text on Devanagari danda '।' and merges short datelines", () => {
    const text = "रायपुर। छत्तीसगढ़ के बस्तर में भारी बारिश हुई। मौसम विभाग ने अलर्ट जारी किया है।";
    const chunks = splitIntoSpeechChunks(text);

    // "रायपुर।" is < 25 chars, so it should be merged into "रायपुर। छत्तीसगढ़ के बस्तर में भारी बारिश हुई।"
    expect(chunks.length).toBe(2);
    expect(chunks[0]).toBe("रायपुर। छत्तीसगढ़ के बस्तर में भारी बारिश हुई।");
    expect(chunks[1]).toBe("मौसम विभाग ने अलर्ट जारी किया है।");
  });

  it("splits English news text on periods and keeps chunks within reasonable boundaries", () => {
    const text = "New Delhi. The weather department issued a rainfall alert today. Several districts are expected to receive heavy downpours.";
    const chunks = splitIntoSpeechChunks(text);

    expect(chunks.length).toBe(2);
    expect(chunks[0]).toContain("New Delhi.");
    expect(chunks[0]).toContain("The weather department issued a rainfall alert today.");
    expect(chunks[1]).toBe("Several districts are expected to receive heavy downpours.");
  });

  it("handles empty or blank text gracefully", () => {
    expect(cleanTextForSpeech("")).toBe("");
    expect(splitIntoSpeechChunks("")).toEqual([]);
  });
});
