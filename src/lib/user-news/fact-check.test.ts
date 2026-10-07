import { describe, expect, it } from "vitest";
import {
  extractDates,
  extractNumbers,
  extractQuotes,
  findAiFabrications,
  findUnsupportedFacts,
  hasBlockingFlags,
  normalizeDigits,
} from "@/lib/user-news/fact-check";

const codes = (flags: ReturnType<typeof findUnsupportedFacts>) => flags.map((f) => `${f.code}:${f.value}`);

describe("extractors", () => {
  it("normalises Devanagari digits and thousands separators, and understands number words", () => {
    expect(normalizeDigits("५ लोग, १२०")).toBe("5 लोग, 120");
    const n = extractNumbers("Five people hurt, 1,200 rupees, ३ घायल, दस गाड़ियां");
    expect([...n].sort()).toEqual(["1", "10", "1200", "3", "5"].sort().filter((x) => x !== "1"));
  });

  it("finds quotes of at least three words and ignores short ones", () => {
    expect(extractQuotes('He said “we will not leave this place” and "ok"')).toEqual(["we will not leave this place"]);
  });

  it("finds dates in several shapes", () => {
    const d = extractDates("On 12 October and October 14, also 05/10/2026 and १५ अक्टूबर");
    expect(d.has("12 october")).toBe(true);
    expect(d.has("14 october")).toBe(true);
    expect(d.has("5/10/2026")).toBe(true);
    expect(d.has("15 अक्टूबर")).toBe(true);
  });
});

describe("findUnsupportedFacts: the AI must not invent facts", () => {
  const source = "आज सुबह रायपुर के शंकर नगर चौक पर दो बाइक की टक्कर हो गई। तीन लोग घायल हुए। लोग अस्पताल ले गए।";

  it("passes a faithful rewrite (digits for number words are fine)", () => {
    const draft = "रायपुर के शंकर नगर चौक पर आज सुबह दो बाइकों की टक्कर में 3 लोग घायल हो गए। उन्हें अस्पताल ले जाया गया।";
    expect(findUnsupportedFacts(source, draft)).toEqual([]);
  });

  it("blocks an invented number", () => {
    const flags = findUnsupportedFacts(source, "शंकर नगर चौक पर दो बाइक की टक्कर में 7 लोग घायल हुए।");
    expect(codes(flags)).toContain("unsupported_number:7");
    expect(hasBlockingFlags(flags)).toBe(true);
  });

  it("blocks an invented quotation", () => {
    const flags = findUnsupportedFacts(source, 'एक राहगीर ने कहा, “यह सड़क बहुत खतरनाक है और सुधार होना चाहिए”।');
    expect(flags.some((f) => f.code === "unsupported_quote")).toBe(true);
  });

  it("allows a quotation that the user actually said", () => {
    const withQuote = `${source} उसने कहा "यह सड़क बहुत खतरनाक है"`;
    expect(findUnsupportedFacts(withQuote, 'उसने कहा, “यह सड़क बहुत खतरनाक है”।').filter((f) => f.code === "unsupported_quote")).toEqual([]);
  });

  it("blocks an invented date", () => {
    expect(codes(findUnsupportedFacts(source, "यह हादसा 12 अक्टूबर को हुआ।"))).toContain("unsupported_date:12 अक्टूबर");
  });

  it("blocks fabricated police statements and eyewitnesses, but only when the source never mentions them", () => {
    const police = findUnsupportedFacts("Two bikes collided at Shankar Nagar chowk. Three people were hurt.", "Police said the riders were drunk.");
    expect(police.some((f) => f.code === "unsupported_actor" && f.value === "police")).toBe(true);
    const witness = findUnsupportedFacts(source, "प्रत्यक्षदर्शियों ने बताया कि बाइक तेज रफ्तार थी।");
    expect(witness.some((f) => f.code === "unsupported_actor" && f.value === "eyewitness")).toBe(true);
    // when the user did mention police, the statement is supported
    expect(findUnsupportedFacts("Police reached the spot. Three people were hurt.", "Police said three people were hurt.").some((f) => f.code === "unsupported_actor")).toBe(false);
  });

  it("warns (does not block) on a proper noun the user never said", () => {
    const flags = findUnsupportedFacts("A truck overturned near the toll plaza.", "A truck owned by Sharma Transport overturned near the toll plaza.");
    expect(flags.filter((f) => f.code === "unsupported_name").map((f) => f.value)).toContain("sharma");
    expect(hasBlockingFlags(flags.filter((f) => f.code === "unsupported_name"))).toBe(false);
  });

  it("warns when the draft is mostly new vocabulary", () => {
    const longInvented = Array.from({ length: 40 }, (_, i) => `invented${i}word`).join(" ");
    expect(findUnsupportedFacts("short note about bikes", longInvented).some((f) => f.code === "low_source_overlap")).toBe(true);
  });
});

describe("findAiFabrications: only the AI is held accountable", () => {
  const source = "Two bikes collided at the chowk. Three people were hurt.";
  const aiDraft = "Two bikes collided at the chowk and 7 people were hurt, police said.";

  it("flags AI-added facts that survive into the final text", () => {
    const flags = findAiFabrications({ sourceText: source, aiDraftText: aiDraft, finalText: aiDraft });
    expect(flags.map((f) => f.code).sort()).toEqual(["unsupported_actor", "unsupported_number"]);
  });

  it("clears a flag once the author removes the invented fact", () => {
    const fixed = "Two bikes collided at the chowk and 3 people were hurt.";
    expect(findAiFabrications({ sourceText: source, aiDraftText: aiDraft, finalText: fixed })).toEqual([]);
  });

  it("does NOT hold the author to the source for facts they add themselves while editing", () => {
    const authorAdded = "Two bikes collided at the chowk. Three people were hurt. The road has had 12 accidents this year.";
    expect(findAiFabrications({ sourceText: source, aiDraftText: "Two bikes collided at the chowk. Three people were hurt.", finalText: authorAdded })).toEqual([]);
  });
});
