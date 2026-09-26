import fs from "fs";

const d = JSON.parse(fs.readFileSync("scripts/reconcile_full_dump.json", "utf8"));
const table = d.reconciliation.table;

console.log("=== ALL 35 ARTICLES (Chronological from Newest) ===");
table.forEach((r, i) => {
  const isUnsplash = (r.heroImageUrl || "").includes("unsplash");
  console.log(`[${i + 1}] ID: ${r.id}`);
  console.log(`    Created: ${r.createdAt} | Published: ${r.publishedAt}`);
  console.log(`    Headline: ${r.headline}`);
  console.log(`    Event ID: ${r.eventId}`);
  console.log(`    Hero Image: ${r.heroImageUrl}`);
  console.log(`    Raw Hero: ${r.rawHeroImageUrl}`);
  console.log(`    Resolved Hero: ${r.resolvedHeroImageUrl}`);
  console.log(`    Media Pass: ${r.mediaPass} | Live: ${r.liveEligible} | Reason: ${r.reason || "LIVE_OK"}`);
  console.log("--------------------------------------------------------------------------------");
});
