import fs from "fs";

const d = JSON.parse(fs.readFileSync("scripts/reconcile_full_dump.json", "utf8"));
const table = d.reconciliation.table;

console.log("=== INSPECTING TRANSLATIONS ACROSS RECENT ARTICLES ===");
table.slice(0, 25).forEach((r, idx) => {
  const meta = r.editorialMetadata || {};
  const trans = meta.translations || {};
  const en = trans.en;
  const hi = trans.hi;
  
  console.log(`[${idx + 1}] ID: ${r.id}`);
  console.log(`    Headline: ${r.headline?.slice(0, 45)}`);
  console.log(`    Has EN Translation: ${Boolean(en)}`);
  if (en) {
    console.log(`      EN Headline: ${Boolean(en.headline)} (${en.headline?.slice(0, 40)}...)`);
    console.log(`      EN Summary: ${Boolean(en.summary)} (${en.summary?.slice(0, 40)}...)`);
    console.log(`      EN Body: ${Boolean(en.article_body)} (Length: ${en.article_body?.length || 0})`);
  }
  if (hi) {
    console.log(`      HI Headline: ${Boolean(hi.headline)} (${hi.headline?.slice(0, 40)}...)`);
    console.log(`      HI Summary: ${Boolean(hi.summary)} (${hi.summary?.slice(0, 40)}...)`);
    console.log(`      HI Body: ${Boolean(hi.article_body)} (Length: ${hi.article_body?.length || 0})`);
  }
  console.log("---------------------------------------------------------------");
});
