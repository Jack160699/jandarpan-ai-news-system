import fs from "fs";

const d = JSON.parse(fs.readFileSync("scripts/reconcile_full_dump.json", "utf8"));
const table = d.reconciliation.table;

// Group by time window / batch
const batchArticles = table.map((r, i) => ({
  index: i + 1,
  id: r.id,
  eventId: r.eventId,
  createdAt: r.createdAt,
  headline: r.headline,
  heroImageUrl: r.heroImageUrl,
  rawHeroImageUrl: r.rawHeroImageUrl,
  resolvedHeroImageUrl: r.resolvedHeroImageUrl,
  mediaPass: r.mediaPass,
  categoryPass: r.categoryPass,
  districtPass: r.districtPass,
  districtSlug: r.districtSlug,
  liveEligible: r.liveEligible,
  reason: r.reason || "LIVE_ELIGIBLE",
}));

fs.writeFileSync("scripts/batch_articles_analysis.json", JSON.stringify(batchArticles, null, 2));

// Print summary by timestamp
console.log("Total analyzed:", batchArticles.length);
batchArticles.forEach((b) => {
  console.log(`${b.index.toString().padStart(2, ' ')}. [${b.createdAt}] ID: ${b.id.slice(0, 8)}... | Event: ${b.eventId?.slice(0, 8)}... | Media: ${b.mediaPass} | Live: ${b.liveEligible} | Dist: ${b.districtSlug || 'NONE'} | ${b.headline.slice(0, 35)}`);
});
