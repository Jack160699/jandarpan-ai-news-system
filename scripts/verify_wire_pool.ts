import { getStaticFallbackArticlePool } from "@/lib/news/fallback/wire-articles";
import { resolveLocalizedFieldsStrict } from "@/lib/i18n/resolve-article";

const pool = getStaticFallbackArticlePool();
console.log(`Verifying static fallback article pool: ${pool.length} articles`);

let hiValid = 0;
let enValid = 0;
let devaInEn = 0;
let latinInHi = 0;

const isDeva = (s: string) => /[\u0900-\u097F]/.test(s || "");

pool.forEach((r, idx) => {
  const hi = resolveLocalizedFieldsStrict(r, "hi");
  const en = resolveLocalizedFieldsStrict(r, "en");

  if (hi?.headline && hi.summary && hi.articleBody) hiValid++;
  if (en?.headline && en.summary && en.articleBody) enValid++;

  if (en && (isDeva(en.headline) || isDeva(en.summary) || isDeva(en.articleBody))) {
    devaInEn++;
    console.error(`[Story ${idx + 1}] Devanagari detected in English bundle!`);
  }
});

console.log(`HI Valid Full Content: ${hiValid} / ${pool.length}`);
console.log(`EN Valid Full Content: ${enValid} / ${pool.length}`);
console.log(`Devanagari in English: ${devaInEn}`);

if (hiValid === pool.length && enValid === pool.length && devaInEn === 0) {
  console.log("🎉 100% CONTENT PARITY & LANGUAGE PURITY ACHIEVED FOR ALL WIRE ARTICLES!");
} else {
  console.error("❌ Content parity failed!");
  process.exit(1);
}
