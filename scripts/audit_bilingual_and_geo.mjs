import fs from "fs";

const d = JSON.parse(fs.readFileSync("scripts/all_100_articles.json", "utf8"));
const table = d.reconciliation.table;

console.log(`Auditing all ${table.length} production articles...`);

let fullyBilingualCount = 0;
let missingEnCount = 0;
let missingHiCount = 0;
let mixedLanguageCount = 0;
let localCount = 0;
let statewideCount = 0;
let nationalCount = 0;
let internationalCount = 0;

const auditResults = [];

const isDevanagari = (s) => /[\u0900-\u097F]/.test(s || "");
const hasLatin = (s) => /[a-zA-Z]/.test(s || "");

table.forEach((r, idx) => {
  const meta = r.editorialMetadata || {};
  const trans = meta.translations || {};
  const en = trans.en;
  const hi = trans.hi;

  const isRowHindi = isDevanagari(r.headline);

  // Check English bundle
  const enHeadline = isRowHindi ? en?.headline : r.headline;
  const enSummary = isRowHindi ? en?.summary : r.summary;
  const enBody = isRowHindi ? en?.article_body : r.article_body;

  // Check Hindi bundle
  const hiHeadline = isRowHindi ? r.headline : hi?.headline;
  const hiSummary = isRowHindi ? r.summary : hi?.summary;
  const hiBody = isRowHindi ? r.article_body : hi?.article_body;

  const hasFullEn = Boolean(enHeadline?.trim() && enSummary?.trim() && enBody?.trim());
  const hasFullHi = Boolean(hiHeadline?.trim() && hiSummary?.trim() && hiBody?.trim());

  if (hasFullEn && hasFullHi) fullyBilingualCount++;
  if (!hasFullEn) missingEnCount++;
  if (!hasFullHi) missingHiCount++;

  // Mixed language checks
  let isMixed = false;
  const mixedReasons = [];
  if (hasFullEn) {
    if (isDevanagari(enHeadline) || isDevanagari(enSummary)) {
      isMixed = true;
      mixedReasons.push("Devanagari in English headline/summary");
    }
  }
  if (hasFullHi) {
    if (!isDevanagari(hiHeadline)) {
      isMixed = true;
      mixedReasons.push("Latin script in Hindi headline");
    }
  }
  if (isMixed) mixedLanguageCount++;

  auditResults.push({
    index: idx + 1,
    id: r.id,
    eventId: r.eventId,
    created: r.createdAt,
    published: r.publishedAt,
    headline: r.headline,
    isRowHindi,
    hasFullEn,
    hasFullHi,
    isMixed,
    mixedReasons,
    heroImageUrl: r.heroImageUrl,
    liveEligible: r.liveEligible,
  });
});

console.log("=== BILINGUAL AUDIT SUMMARY ===");
console.log(`Total Articles: ${table.length}`);
console.log(`Fully Bilingual (Full Headline + Summary + Body in both HI and EN): ${fullyBilingualCount} (${((fullyBilingualCount / table.length) * 100).toFixed(1)}%)`);
console.log(`Missing Full English: ${missingEnCount}`);
console.log(`Missing Full Hindi: ${missingHiCount}`);
console.log(`Mixed Language Flags: ${mixedLanguageCount}`);

fs.writeFileSync("scripts/bilingual_audit_results.json", JSON.stringify({
  summary: {
    total: table.length,
    fullyBilingualCount,
    missingEnCount,
    missingHiCount,
    mixedLanguageCount,
  },
  articles: auditResults,
}, null, 2));

console.log("Saved full results to scripts/bilingual_audit_results.json");
