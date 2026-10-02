import { describe, expect, it } from "vitest";
import { extractArticleText, MIN_EXTRACTED_CHARS } from "./article-text-extract";
import { cleanArticleText, trimPromoTail } from "./feed-fulltext";

const SENT = "सुकमा जिले में जंगल में मवेशी चराने गए दो ग्रामीणों पर भालू ने हमला कर दिया। घटना में दोनों ग्रामीण घायल हो गए और उन्हें अस्पताल में भर्ती कराया गया है। ";
const BODY = SENT.repeat(4);

describe("extractArticleText", () => {
  it("prefers the schema.org JSON-LD articleBody (also inside @graph) and trims the promo tail", () => {
    const ld = JSON.stringify({ "@graph": [{ "@type": "WebSite" }, { "@type": "NewsArticle", articleBody: `${BODY}हमारे व्हाट्सएप चैनल को Follow करना न भूलें. https://whatsapp.com/channel/x` }] });
    const html = `<html><head><script type="application/ld+json">${ld}</script></head><body><p>नेविगेशन</p></body></html>`;
    const got = extractArticleText(html)!;
    expect(got.method).toBe("jsonld_articleBody");
    expect(got.text).toContain("भालू ने हमला");
    expect(got.text).not.toMatch(/व्हाट्सएप|whatsapp/i);
  });

  it("falls back to the densest article container and drops nav, footer, share bars and related widgets", () => {
    const html = `<html><body>
      <header><p>${"मेन्यू ".repeat(60)}</p></header>
      <nav><p>होम राज्य देश</p></nav>
      <article class="post">
        <h1>शीर्षक</h1>
        <div class="share-bar"><p>शेयर करें फेसबुक ट्विटर</p></div>
        <div class="entry-content"><p>१. ${SENT}</p><p>२. ${SENT}</p><p>३. ${SENT}</p></div>
        <div class="related-stories"><p>ये भी पढ़ें: दूसरी खबर जिसे नहीं आना चाहिए</p></div>
      </article>
      <footer><p>कॉपीराइट सर्वाधिकार सुरक्षित</p></footer></body></html>`;
    const got = extractArticleText(html)!;
    expect(got.method).toBe("article_container");
    expect(got.text).toContain("भालू ने हमला");
    expect(got.text).not.toMatch(/मेन्यू|शेयर करें|दूसरी खबर|कॉपीराइट/);
  });

  it("returns null for pages without enough article text (never invents content)", () => {
    expect(extractArticleText("")).toBeNull();
    expect(extractArticleText("<html><body><article><p>छोटा सा पाठ।</p></article></body></html>")).toBeNull();
    expect(MIN_EXTRACTED_CHARS).toBeGreaterThanOrEqual(300);
  });

  it("survives malformed JSON-LD and uses the container instead", () => {
    const html = `<script type="application/ld+json">{ not json</script><article><p>${BODY}</p></article>`;
    expect(extractArticleText(html)?.method).toBe("article_container");
  });
});

describe("trimPromoTail", () => {
  it("cuts at the promo marker but never inside the opening 200 characters", () => {
    expect(trimPromoTail(`${BODY}हमारे टेलीग्राम चैनल से जुड़ें`)).toBe(BODY.trim().replace(/\s+$/, "").slice(0, BODY.trim().length));
    const short = "व्हाट्सएप चैनल पर रोक लगाने का आदेश आज जारी किया गया है।";
    expect(trimPromoTail(short)).toBe(short);
  });

  it("is applied by cleanArticleText", () => {
    expect(cleanArticleText(`<p>${BODY}डॉट कॉम की खबरें English में पढ़ने यहां क्लिक करें</p>`)).not.toContain("English");
  });
});
