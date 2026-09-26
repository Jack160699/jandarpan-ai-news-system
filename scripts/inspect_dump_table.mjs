import fs from "fs";

const d = JSON.parse(fs.readFileSync("scripts/reconcile_output.json", "utf8"));
const rows = d.reconciliation.table;

console.log(`Total rows in reconcile table: ${rows.length}`);
rows.slice(0, 10).forEach((r, i) => {
  const isUnsplash = r.heroImageUrl.includes("unsplash");
  console.log(`[${i + 1}] ${r.createdAt} | ${r.id} | ${isUnsplash ? "UNSPLASH" : "REAL"} | Event: ${r.eventId}`);
  console.log(`    Headline: ${r.headline}`);
  console.log(`    Hero: ${r.heroImageUrl}`);
  console.log(`    MediaPass: ${r.mediaPass} | Live: ${r.liveEligible} | Reason: ${r.reason || "LIVE_OK"}`);
  console.log("--------------------------------------------------------------------------------");
});
