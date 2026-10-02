import { describe, expect, it } from "vitest";
import {
  cleanArticleText,
  joinDescriptionAndContent,
  MAX_SOURCE_TEXT_CHARS,
  pickFeedBodyText,
} from "./feed-fulltext";

const P1 = "छत्तीसगढ़ के सक्ती जिले में पानी से भरे ड्रम में बच्ची का शव मिलने के मामले में बड़ा खुलासा हुआ है।";
const P2 = "मिली जानकारी के अनुसार घटना 29 सितंबर की रात की है, पुलिस ने दोनों माता-पिता को गिरफ्तार कर जेल भेज दिया है।";

describe("cleanArticleText", () => {
  it("turns HTML into paragraph text and strips scripts, figures, captions and tags", () => {
    const html = `<p>${P1}</p><figure><img src="x.jpg"><figcaption>फाइल फोटो</figcaption></figure><script>alert(1)</script><p>${P2}</p>`;
    expect(cleanArticleText(html)).toBe(`${P1}\n${P2}`);
  });

  it("removes syndication boilerplate, read-more / also-read lines and bare URLs", () => {
    const html = `<p>${P1}</p><p>ये भी पढ़ें: कोई दूसरी खबर यहाँ</p><p>https://example.com/x</p><p>The post सक्ती खबर appeared first on Thiha CG.</p><p>${P2}</p>`;
    expect(cleanArticleText(html)).toBe(`${P1}\n${P2}`);
  });

  it("decodes entities, including double-encoded &nbsp;", () => {
    expect(cleanArticleText(`<p>${P1}</p><p>&amp;nbsp;</p><p>AT&amp;T &nbsp;deal</p>`)).toBe(`${P1}\nAT&T deal`);
  });

  it("drops a trailing run of bare 'related' headlines but never a short article's last line", () => {
    const body = `<p>${P1}</p><p>${P2}</p><p>अभिनेत्री का नया फोटोशूट देख फैंस के दिलों की बढ़ी धड़कनें</p><p>फिल्म की रिलीज डेट पक्की, जानें कब आएगी?</p>`;
    expect(cleanArticleText(body)).toBe(`${P1}\n${P2}`);
    // short article: nothing to preserve ahead of the tail, so it is left intact
    const short = "<p>छोटी खबर का पहला हिस्सा</p><p>दूसरा हिस्सा बिना विराम</p>";
    expect(cleanArticleText(short)).toContain("दूसरा हिस्सा बिना विराम");
  });

  it("is idempotent", () => {
    const once = cleanArticleText(`<p>${P1}</p><p>${P2}</p>`);
    expect(cleanArticleText(once)).toBe(once);
  });
});

describe("pickFeedBodyText", () => {
  it("prefers content:encoded (the article) over the excerpt and labels it", () => {
    const got = pickFeedBodyText({ contentSnippet: P1, contentEncoded: `<p>${P1}</p><p>${P2}</p>` });
    expect(got?.method).toBe("feed_content_encoded");
    expect(got?.text).toBe(`${P1}\n${P2}`);
  });

  it("falls back to the longest excerpt field when there is no full text", () => {
    const got = pickFeedBodyText({ contentSnippet: P1, content: `${P1} ${P2}` });
    expect(got?.method).toBe("feed_description");
    expect(got?.text).toContain("गिरफ्तार");
  });

  it("understands the raw 'content:encoded' key too", () => {
    expect(pickFeedBodyText({ "content:encoded": `<p>${P1}</p><p>${P2}</p>` })?.text).toContain("गिरफ्तार");
  });

  it("caps the attached text and returns null for an empty item", () => {
    const huge = `<p>${"शब्द ".repeat(5000)}।</p>`;
    expect(pickFeedBodyText({ contentEncoded: huge })!.text.length).toBeLessThanOrEqual(MAX_SOURCE_TEXT_CHARS);
    expect(pickFeedBodyText({})).toBeNull();
  });
});

describe("joinDescriptionAndContent", () => {
  it("does not double-count an excerpt that is the lead of the full text", () => {
    const full = `${P1}\n${P2}`;
    expect(joinDescriptionAndContent(P1, full)).toBe(full);
  });

  it("keeps both when they are genuinely different, and tolerates missing parts", () => {
    expect(joinDescriptionAndContent("अलग सार", "बिल्कुल अलग मुख्य पाठ")).toBe("अलग सार\n\nबिल्कुल अलग मुख्य पाठ");
    expect(joinDescriptionAndContent(null, "केवल सामग्री")).toBe("केवल सामग्री");
    expect(joinDescriptionAndContent("केवल सार", undefined)).toBe("केवल सार");
  });
});
